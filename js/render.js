// Markup builders for product cards, bag lines, wishlist lines and search results.
import { products, byId, formatPrice, formatSubtotal } from './products.js';
import { store } from './store.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

// Unsplash CDN crops to 3:4 at each width and serves AVIF/WebP via auto=format.
const WIDTHS = [300, 480, 720, 960];
const src = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces,center&w=${w}&h=${Math.round(w * 4 / 3)}&q=70`;

export function picture(id, alt, sizes, widths = WIDTHS) {
  return `<img src="${src(id, widths[1])}" srcset="${widths.map((w) => `${src(id, w)} ${w}w`).join(', ')}" sizes="${sizes}" ` +
    `width="${widths[1]}" height="${Math.round(widths[1] * 4 / 3)}" loading="lazy" decoding="async" alt="${esc(alt)}">`;
}

const GRID_SIZES = '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw';

function card(p, i) {
  const name = esc(p.name);
  return `<li class="product" id="product-${p.id}" data-reveal style="--i:${i % 4}">
    <article class="product-card" aria-labelledby="pn-${p.id}" tabindex="-1">
      <div class="product-media">
        <div class="product-main">${picture(p.img[0], p.alt, GRID_SIZES)}</div>
        <div class="product-alt" aria-hidden="true">${picture(p.img[1], '', GRID_SIZES)}</div>
        ${p.tag ? `<span class="product-tag">${esc(p.tag)}</span>` : ''}
        <button class="icon-btn wish-btn" type="button" data-wish="${p.id}" aria-pressed="false" aria-label="Save ${name} to wishlist">${icon('heart')}</button>
        <button class="add-btn" type="button" data-add="${p.id}" aria-label="Add ${name} to bag">${icon('plus')}<span class="add-label" aria-hidden="true">Add to bag</span></button>
      </div>
      <div class="product-info">
        <p class="product-cat">${esc(p.category)} · ${esc(p.colour)}</p>
        <h3 class="product-name" id="pn-${p.id}">${name}</h3>
        <p class="product-price">${formatPrice(p.price)}</p>
      </div>
    </article>
  </li>`;
}

export const renderGrid = (el) => { el.innerHTML = products.map(card).join(''); };

export function syncCards(root) {
  root.querySelectorAll('[data-wish]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(store.inWish(btn.dataset.wish)));
  });
}

function line(p, actions) {
  return `<li class="line-item">
    <div class="media">${picture(p.img[0], '', '88px', [180, 270])}</div>
    <div class="line-body">
      <div><p class="line-name">${esc(p.name)}</p><p class="line-meta">${esc(p.colour)} · ${formatPrice(p.price)}</p></div>
      <div class="line-actions">${actions}</div>
    </div>
  </li>`;
}

const empty = (text, cta) =>
  `<div class="empty"><p>${text}</p><a class="btn btn-dark" href="#shop" data-close><span>${cta}</span></a></div>`;

export function renderCart(body, foot, subtotalEl) {
  const lines = store.state.cart;
  foot.hidden = lines.length === 0;
  if (!lines.length) {
    body.innerHTML = empty('Your bag is empty.', 'Discover new arrivals');
    return;
  }
  body.innerHTML = `<ul class="line-items">${lines.map(({ id, qty }) => {
    const p = byId.get(id);
    const name = esc(p.name);
    return line(p, `
      <div class="qty" role="group" aria-label="Quantity, ${name}">
        <button class="icon-btn" type="button" data-qty="-1" data-id="${id}" data-focus-key="dec-${id}" aria-label="Decrease quantity" ${qty <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
        <output aria-live="polite">${qty}</output>
        <button class="icon-btn" type="button" data-qty="1" data-id="${id}" data-focus-key="inc-${id}" aria-label="Increase quantity" ${qty >= store.MAX_QTY ? 'disabled' : ''}>${icon('plus')}</button>
      </div>
      <button class="text-btn" type="button" data-remove="${id}" aria-label="Remove ${name} from bag">Remove</button>`);
  }).join('')}</ul>`;
  subtotalEl.textContent = formatSubtotal(lines);
}

export function renderWish(body) {
  const ids = store.state.wish;
  if (!ids.length) {
    body.innerHTML = empty('Nothing saved yet.', 'Browse the edit');
    return;
  }
  body.innerHTML = `<ul class="line-items">${ids.map((id) => {
    const p = byId.get(id);
    const name = esc(p.name);
    return line(p, `
      <button class="text-btn" type="button" data-add="${id}" data-focus-key="wadd-${id}" aria-label="Add ${name} to bag">Add to bag</button>
      <button class="text-btn" type="button" data-wish="${id}" aria-label="Remove ${name} from wishlist">Remove</button>`);
  }).join('')}</ul>`;
}

export function renderResults(list, matches) {
  list.innerHTML = matches.map((p) => `<li>
    <button class="result" type="button" data-goto="${p.id}">
      <span class="media">${picture(p.img[0], '', '(min-width: 768px) 22vw, 46vw')}</span>
      <span class="result-name">${esc(p.name)}</span>
      <span class="result-meta">${esc(p.category)} · ${formatPrice(p.price)}</span>
    </button></li>`).join('');
}
