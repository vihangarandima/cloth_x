// Drawers + search modal: one open at a time, focus trap, Esc, scrim click,
// background made inert, and the browser Back button closes the overlay.

const root = document.documentElement;
const scrim = document.querySelector('[data-scrim]');
const background = () => document.querySelectorAll('body > header, body > main, body > footer, .dock, .announcement, .skip-link, .toast');
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), output, [tabindex]:not([tabindex="-1"])';

let current = null;
let returnFocus = null;
let pending = null;

const triggers = (id) => document.querySelectorAll(`[aria-controls="${id}"]`);

function setOpen(el, on) {
  el.classList.toggle('is-open', on);
  triggers(el.id).forEach((t) => t.setAttribute('aria-expanded', String(on)));
}

function focusables(el) {
  return [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.tagName !== 'OUTPUT' && n.offsetParent !== null);
}

export function openOverlay(id, trigger) {
  const el = document.getElementById(id);
  if (!el || el === current) return;
  if (current) setOpen(current, false);
  else returnFocus = trigger || document.activeElement;

  current = el;
  setOpen(el, true);
  scrim.classList.add('is-on');
  root.classList.add('is-locked');
  background().forEach((n) => { n.inert = true; });

  const target = el.querySelector('input') || el.querySelector('[data-close]');
  requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  el.dispatchEvent(new CustomEvent('overlay:open'));

  if (history.state?.overlay) history.replaceState({ overlay: id }, '');
  else history.pushState({ overlay: id }, '');
}

function finish(restore) {
  if (!current) return;
  setOpen(current, false);
  current = null;
  scrim.classList.remove('is-on');
  root.classList.remove('is-locked');
  background().forEach((n) => { n.inert = false; });
  if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}

// Resolves once the overlay is closed (after history has stepped back).
export function closeOverlay({ restore = true } = {}) {
  if (!current) return Promise.resolve();
  return new Promise((resolve) => {
    if (history.state?.overlay) {
      pending = { resolve, restore };
      history.back();
      setTimeout(() => { if (pending) { finish(restore); pending = null; resolve(); } }, 500);
    } else {
      finish(restore);
      resolve();
    }
  });
}

export const isOpen = () => current !== null;

export function initOverlays() {
  // Popping an overlay entry must not make the browser restore an old scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  window.addEventListener('popstate', () => {
    if (current && !history.state?.overlay) {
      const p = pending;
      pending = null;
      finish(p ? p.restore : true);
      p?.resolve();
    }
  });

  // If the page is reloaded on an overlay history entry, drop it quietly.
  if (history.state?.overlay) history.replaceState(null, '');

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      openOverlay(opener.dataset.open, opener);
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer && current) {
      const hash = closer.getAttribute('href');
      e.preventDefault();
      closeOverlay({ restore: !hash }).then(() => {
        if (!hash) return;
        const target = document.querySelector(hash);
        target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', hash);
      });
    }
  });

  scrim.addEventListener('click', () => closeOverlay());

  // Phone bottom sheets: drag the header (with its grabber) down to dismiss.
  const phone = matchMedia('(max-width: 767px)');
  document.querySelectorAll('.drawer--right .drawer-head').forEach((head) => {
    const sheet = head.parentElement;
    let startY = null;
    let dy = 0;
    // The grabber is drawn on the sheet itself, so a press on the sheet's own top edge counts too.
    sheet.addEventListener('pointerdown', (e) => {
      const onHandle = e.target === sheet || head.contains(e.target);
      if (!phone.matches || e.button !== 0 || !onHandle || e.target.closest('button')) return;
      startY = e.clientY;
      dy = 0;
      sheet.setPointerCapture(e.pointerId);
      sheet.classList.add('is-dragging');
    });
    sheet.addEventListener('pointermove', (e) => {
      if (startY === null) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translate3d(0, ${dy}px, 0)`;
    });
    const end = () => {
      if (startY === null) return;
      startY = null;
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
      if (dy > Math.min(140, sheet.offsetHeight * 0.25)) closeOverlay();
    };
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  });

  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeOverlay();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables(current);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
