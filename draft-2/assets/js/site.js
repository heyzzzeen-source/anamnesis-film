// Anamnesis Film — draft 2 behaviors: phone menu, the "recall" focus effect, film index preview.
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Phone menu. */
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    const setOpen = open => {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* Recall: pictures come into focus once, as they scroll into view. */
  const recalls = document.querySelectorAll('.recall');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    recalls.forEach(el => el.classList.add('is-recalled'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-recalled');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    recalls.forEach(el => io.observe(el));
  }

  /* Film index: a still follows the pointer over each row (mouse and trackpad only). */
  const peek = document.querySelector('.peek');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (peek && finePointer) {
    document.querySelectorAll('.film-index a[data-f]').forEach(row => {
      row.addEventListener('mouseenter', () => {
        peek.style.setProperty('--f', `var(--${row.dataset.f})`);
        peek.classList.add('on');
      });
      row.addEventListener('mousemove', e => {
        peek.style.left = e.clientX + 'px';
        peek.style.top = e.clientY + 'px';
      });
      row.addEventListener('mouseleave', () => peek.classList.remove('on'));
    });
  }
})();
