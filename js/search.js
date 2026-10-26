// Client-side search over the catalogue (name + category).
import { products } from './products.js';
import { renderResults } from './render.js';
import { closeOverlay } from './overlays.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function initSearch() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const suggest = modal.querySelector('[data-search-suggest]');
  const chips = modal.querySelector('[data-search-chips]');
  const status = modal.querySelector('[data-search-status]');
  const results = modal.querySelector('[data-search-results]');

  const categories = [...new Set(products.map((p) => p.category))];
  chips.innerHTML = categories.map((c) => `<button class="chip" type="button" data-term="${c}">${c}</button>`).join('');

  function run() {
    const q = norm(input.value);
    if (!q) {
      results.innerHTML = '';
      status.textContent = '';
      suggest.hidden = false;
      return;
    }
    const matches = products.filter((p) => norm(`${p.name} ${p.category} ${p.colour}`).includes(q));
    renderResults(results, matches);
    suggest.hidden = matches.length > 0;
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'piece' : 'pieces'} for “${input.value.trim()}”`
      : `Nothing matches “${input.value.trim()}”. Try one of these:`;
  }

  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') results.querySelector('button')?.focus();
  });

  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-term]');
    if (!chip) return;
    input.value = chip.dataset.term;
    run();
    input.focus();
  });

  results.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-goto]');
    if (!hit) return;
    closeOverlay({ restore: false }).then(() => {
      const card = document.getElementById(`product-${hit.dataset.goto}`);
      if (!card) return;
      card.classList.add('is-in');
      card.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      card.classList.add('is-highlight');
      card.querySelector('article').focus({ preventScroll: true });
      setTimeout(() => card.classList.remove('is-highlight'), 2400);
    });
  });

  modal.addEventListener('overlay:open', () => {
    input.select();
    run();
  });
}
