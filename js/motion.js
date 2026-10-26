// Motion layer: preloader curtain, split headlines, scroll reveals, one rAF loop for
// scroll-linked effects (header, parallax, pinned lookbook), cursor and magnetic buttons.
// Layout is measured only on resize; the scroll loop reads scrollY and writes transforms.

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Preloader ---------- */
export async function runPreloader() {
  const el = document.querySelector('[data-preloader]');
  if (!root.classList.contains('has-preloader')) return;
  const hero = document.querySelector('.hero-media img');
  const heroReady = hero && !hero.complete ? new Promise((r) => hero.addEventListener('load', r, { once: true })) : null;
  await Promise.all([
    wait(1100),
    Promise.race([Promise.all([document.fonts?.ready, heroReady]), wait(2200)]),
  ]);
  el.classList.add('is-done');
  try { sessionStorage.setItem('lux.seen', '1'); } catch { /* ignore */ }
  setTimeout(() => root.classList.remove('has-preloader'), 1400);
  await wait(350);
}

/* ---------- Split text ---------- */
function splitInto(node, counter) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const mask = document.createElement('span');
        mask.className = 'split-mask';
        const word = document.createElement('span');
        word.className = 'split-word';
        word.style.setProperty('--i', counter.i++);
        word.textContent = part;
        mask.append(word);
        frag.append(mask);
      });
      child.replaceWith(frag);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitInto(child, counter);
    }
  });
}

export function splitHeadlines() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    splitInto(el, { i: 0 });
    [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
  });
}

/* ---------- Reveals ---------- */
let revealObserver;
const proxies = new Map();
export function observeReveals(scope = document) {
  const targets = scope.querySelectorAll('[data-reveal]:not(.is-in), [data-split]:not(.hero-title):not(.is-in)');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }
  // Content is only hidden for revealing once this script is actually running.
  root.classList.add('reveals');
  revealObserver ||= new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (proxies.get(entry.target) || entry.target).classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  targets.forEach((t) => {
    if (t.dataset.reveal === 'stagger') [...t.children].forEach((c, i) => c.style.setProperty('--i', i));
    // A fully clipped element never intersects, so clip reveals watch their parent.
    if (t.dataset.reveal === 'clip') {
      proxies.set(t.parentElement, t);
      revealObserver.observe(t.parentElement);
    } else {
      revealObserver.observe(t);
    }
  });
}

export function playHero() {
  root.classList.add('is-ready');
  document.querySelector('.hero-title')?.classList.add('is-in');
}

/* ---------- Scroll engine ---------- */
export function initScroll() {
  const header = document.querySelector('[data-header]');
  const heroMedia = document.querySelector('[data-hero-media]');
  const layers = [...document.querySelectorAll('[data-parallax]')];
  const lookbook = document.querySelector('[data-lookbook]');
  const track = lookbook?.querySelector('[data-lookbook-track]');
  const progress = lookbook?.querySelector('[data-lookbook-progress]');
  const desktop = matchMedia('(min-width: 1024px)');

  let vh = innerHeight;
  let heroH = 0;
  let lastY = scrollY;
  let ticking = false;
  let measures = [];
  let pin = null;

  function measure() {
    vh = innerHeight;
    heroH = heroMedia?.parentElement.offsetHeight || 0;
    measures = layers.map((el) => {
      const r = el.parentElement.getBoundingClientRect();
      return { el, top: r.top + scrollY, h: r.height, k: parseFloat(el.dataset.parallax) || 0.1 };
    });

    pin = null;
    if (!lookbook) return;
    const pinned = desktop.matches && !reduced;
    lookbook.toggleAttribute('data-pinned', pinned);
    track.toggleAttribute('tabindex', !pinned);
    if (!pinned) {
      lookbook.style.height = '';
      track.style.transform = '';
      return;
    }
    const viewport = track.parentElement;
    const distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    lookbook.style.height = `${vh + distance}px`;
    pin = { top: lookbook.getBoundingClientRect().top + scrollY, distance };
  }

  function frame() {
    ticking = false;
    const y = scrollY;

    // Header: solid once the page moves, tucks away on scroll down, returns on scroll up
    header.classList.toggle('is-solid', y > 24);
    if (Math.abs(y - lastY) > 6) {
      header.classList.toggle('is-hidden', y > lastY && y > vh * 0.6);
      lastY = y;
    }

    if (reduced) return;

    if (heroMedia && y < heroH) heroMedia.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;

    for (const m of measures) {
      if (y + vh < m.top || y > m.top + m.h) continue;
      const p = (y + vh - m.top) / (vh + m.h);
      m.el.style.transform = `translate3d(0, ${((p - 0.5) * m.h * m.k * 1.4).toFixed(1)}px, 0)`;
    }

    if (pin) {
      const p = Math.min(1, Math.max(0, (y - pin.top) / (pin.distance || 1)));
      track.style.transform = `translate3d(${(-p * pin.distance).toFixed(1)}px, 0, 0)`;
      progress.style.transform = `scaleX(${p.toFixed(4)})`;
    }
  }

  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  };

  measure();
  frame();
  addEventListener('scroll', request, { passive: true });
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measure(); frame(); }, 120);
  }).observe(document.body);
  desktop.addEventListener('change', () => { measure(); frame(); });
}

/* ---------- Cursor + magnetic (fine pointers, motion allowed) ---------- */
export function initPointer() {
  if (reduced || !finePointer) return;
  const cursor = document.querySelector('[data-cursor-el]');
  const label = cursor.querySelector('[data-cursor-label]');
  root.classList.add('has-cursor');

  let x = -100, y = -100, cx = -100, cy = -100, scale = 0.14, target = 0.14;
  let raf = 0;

  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    scale += (target - scale) * 0.16;
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) + Math.abs(target - scale) > 0.1 ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    cursor.classList.add('is-visible');
    kick();
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, label, input, [role="button"]');
    cursor.classList.toggle('has-label', !!labelled);
    label.textContent = labelled ? labelled.dataset.cursor : '';
    target = labelled ? 1 : interactive ? 0.42 : 0.14;
    kick();
  });

  // Magnetic primary buttons
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    let rect = null;
    const inner = btn.firstElementChild;
    btn.addEventListener('pointerenter', () => { rect = btn.getBoundingClientRect(); });
    btn.addEventListener('pointermove', (e) => {
      if (!rect) return;
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      btn.style.transform = `translate3d(${dx * 0.18}px, ${dy * 0.28}px, 0)`;
      if (inner) inner.style.transform = `translate3d(${dx * 0.08}px, ${dy * 0.12}px, 0)`;
    });
    btn.addEventListener('pointerleave', () => {
      rect = null;
      btn.style.transform = '';
      if (inner) inner.style.transform = '';
    });
  });
}
