// Client-side bag + wishlist with localStorage persistence (fails soft when storage is blocked).
import { byId } from './products.js';

const KEYS = { cart: 'lux.cart', wish: 'lux.wish' };
const MAX_QTY = 10;

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — state still works for this page view */
  }
}

const clean = {
  cart: (list) => list.filter((l) => l && byId.has(l.id) && Number.isInteger(l.qty) && l.qty > 0)
    .map((l) => ({ id: l.id, qty: Math.min(l.qty, MAX_QTY) })),
  wish: (list) => [...new Set(list.filter((id) => byId.has(id)))],
};

const state = { cart: clean.cart(read(KEYS.cart)), wish: clean.wish(read(KEYS.wish)) };
const subscribers = new Set();

function commit(change) {
  write(KEYS.cart, state.cart);
  write(KEYS.wish, state.wish);
  subscribers.forEach((fn) => fn(state, change));
}

export const store = {
  state,
  MAX_QTY,
  subscribe(fn) {
    subscribers.add(fn);
    fn(state, { type: 'init' });
  },
  cartCount: () => state.cart.reduce((n, l) => n + l.qty, 0),
  inWish: (id) => state.wish.includes(id),

  add(id, qty = 1) {
    const line = state.cart.find((l) => l.id === id);
    if (line) line.qty = Math.min(line.qty + qty, MAX_QTY);
    else state.cart.push({ id, qty });
    commit({ type: 'cart:add', id });
  },
  setQty(id, qty) {
    const line = state.cart.find((l) => l.id === id);
    if (!line) return;
    line.qty = Math.max(1, Math.min(qty, MAX_QTY));
    commit({ type: 'cart:qty', id });
  },
  // Returns what was removed so the UI can offer Undo.
  remove(id) {
    const index = state.cart.findIndex((l) => l.id === id);
    if (index < 0) return null;
    const [line] = state.cart.splice(index, 1);
    commit({ type: 'cart:remove', id });
    return { line, index };
  },
  restore({ line, index }) {
    if (state.cart.some((l) => l.id === line.id)) return;
    state.cart.splice(Math.min(index, state.cart.length), 0, line);
    commit({ type: 'cart:restore', id: line.id });
  },
  toggleWish(id) {
    const on = !state.wish.includes(id);
    state.wish = on ? [...state.wish, id] : state.wish.filter((w) => w !== id);
    commit({ type: 'wish:toggle', id, on });
    return on;
  },
};

// Keep several open tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key !== KEYS.cart && e.key !== KEYS.wish) return;
  state.cart = clean.cart(read(KEYS.cart));
  state.wish = clean.wish(read(KEYS.wish));
  subscribers.forEach((fn) => fn(state, { type: 'sync' }));
});
