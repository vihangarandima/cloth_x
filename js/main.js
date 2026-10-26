import { byId } from './products.js';
import { store } from './store.js';
import { renderGrid, syncCards, renderCart, renderWish } from './render.js';
import { initOverlays, openOverlay, isOpen } from './overlays.js';
import { initSearch } from './search.js';
import { runPreloader, splitHeadlines, observeReveals, playHero, initScroll, initPointer } from './motion.js';

const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

/* ---------- Toast ---------- */
const toast = $('[data-toast]');
let toastTimer;
function showToast(message, action) {
  toast.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-btn';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { hideToast(); action.run(btn); });
    toast.append(btn);
  }
  toast.classList.add('is-on');
  scheduleHide();
}
// Long enough to read and act on; paused while the pointer or focus is on it.
function scheduleHide() {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6500);
}
function hideToast() { toast.classList.remove('is-on'); }
toast.addEventListener('pointerenter', () => clearTimeout(toastTimer));
toast.addEventListener('focusin', () => clearTimeout(toastTimer));
toast.addEventListener('pointerleave', scheduleHide);
toast.addEventListener('focusout', scheduleHide);

/* ---------- Commerce UI ---------- */
const grid = $('[data-product-grid]');
const cartBody = $('[data-cart-body]');
const cartFoot = $('[data-cart-foot]');
const cartSubtotal = $('[data-cart-subtotal]');
const wishBody = $('[data-wish-body]');
const undoBar = $('[data-undo-bar]');
const undoText = $('[data-undo-text]');
let lastRemoved = null;
let lastCount = store.cartCount();

function setCount(selector, n, bump) {
  $$(selector).forEach((el) => {
    el.textContent = n;
    el.hidden = n === 0;
    if (bump) {
      el.classList.remove('is-bump');
      void el.offsetWidth; // restart the keyframe
      el.classList.add('is-bump');
    }
  });
}

// Re-rendering a list keeps keyboard focus on the equivalent control.
function keepFocus(render) {
  const key = document.activeElement?.dataset?.focusKey;
  render();
  if (key) $(`[data-focus-key="${key}"]`)?.focus();
}

function update(state, change) {
  const count = store.cartCount();
  setCount('[data-cart-count]', count, count > lastCount && change.type !== 'init');
  setCount('[data-wish-count]', state.wish.length, change.type === 'wish:toggle' && change.on);
  lastCount = count;
  $('[data-cart-label]').textContent = count ? `(${count})` : '';
  $('[data-wish-label]').textContent = state.wish.length ? `(${state.wish.length})` : '';
  syncCards(grid);
  keepFocus(() => renderCart(cartBody, cartFoot, cartSubtotal));
  keepFocus(() => renderWish(wishBody));
}

function initCommerce() {
  renderGrid(grid);
  store.subscribe(update);

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      store.add(add.dataset.add);
      const name = byId.get(add.dataset.add).name;
      if (!isOpen()) showToast(`${name} added to your bag`, { label: 'View bag', run: (btn) => openOverlay('cart-drawer', btn) });
      return;
    }
    const wish = e.target.closest('[data-wish]');
    if (wish) {
      const on = store.toggleWish(wish.dataset.wish);
      if (!isOpen()) showToast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
      return;
    }
    const qty = e.target.closest('[data-qty]');
    if (qty) {
      const line = store.state.cart.find((l) => l.id === qty.dataset.id);
      if (line) store.setQty(line.id, line.qty + Number(qty.dataset.qty));
      return;
    }
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      lastRemoved = store.remove(remove.dataset.remove);
      if (lastRemoved) {
        undoText.textContent = `${byId.get(lastRemoved.line.id).name} removed.`;
        undoBar.hidden = false;
        $('[data-undo]', undoBar).focus();
      }
      return;
    }
    if (e.target.closest('[data-undo]') && lastRemoved) {
      store.restore(lastRemoved);
      lastRemoved = null;
      undoBar.hidden = true;
      $('[data-close]', cartBody.closest('[data-overlay]'))?.focus();
      return;
    }
    if (e.target.closest('[data-checkout]')) {
      // Payments are out of scope for this build — connect a commerce provider here.
      showToast('Secure checkout opens soon. For orders today, call +94 11 234 5678.');
    }
  });

  // Overlays hide any toast that would sit behind them; a reopened bag starts without a stale Undo.
  $$('[data-overlay]').forEach((o) => o.addEventListener('overlay:open', hideToast));
  $('#cart-drawer').addEventListener('overlay:open', () => { undoBar.hidden = true; lastRemoved = null; });
}

/* ---------- Dock: mark the section in view ---------- */
function initDockState() {
  const items = $$('[data-dock]');
  const sections = items.map((i) => document.getElementById(i.dataset.dock)).filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id)));
    items.forEach((i) => {
      if (visible.has(i.dataset.dock)) i.setAttribute('aria-current', 'location');
      else i.removeAttribute('aria-current');
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ---------- Newsletter ---------- */
function initNewsletter() {
  const form = $('[data-newsletter]');
  const input = $('input', form);
  const msg = $('.field-msg', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = input.value.trim() !== '' && input.checkValidity();
    input.setAttribute('aria-invalid', String(!ok));
    msg.classList.toggle('is-error', !ok);
    if (!ok) {
      msg.textContent = 'Please enter a valid email address.';
      input.focus();
      return;
    }
    // Connect your email platform here (input.value).
    msg.textContent = 'Thank you — you are on the list.';
    form.reset();
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && input.checkValidity()) {
      input.setAttribute('aria-invalid', 'false');
      msg.textContent = '';
      msg.classList.remove('is-error');
    }
  });
}

/* ---------- Boot ---------- */
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
splitHeadlines();
initCommerce();
initOverlays();
initSearch();
initNewsletter();
initDockState();
initScroll();
initPointer();
observeReveals();
runPreloader().then(playHero);
