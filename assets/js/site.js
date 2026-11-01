// Anamnesis Film — small site behaviors: header state, phone menu, rotating taglines, hero grain.
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header turns solid once the page scrolls past the top. */
  const header = document.querySelector('.site-header');
  if (header) {
    const update = () => header.classList.toggle('is-solid', window.scrollY > 40);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

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

  /* Draft only: switch the placeholder markers off to preview the clean look. */
  const marksBtn = document.querySelector('.marks-toggle');
  if (marksBtn) {
    const apply = on => {
      document.body.classList.toggle('marks', on);
      marksBtn.setAttribute('aria-pressed', String(on));
    };
    let saved = null;
    try { saved = localStorage.getItem('anm:marks'); } catch {}
    apply(saved !== 'off');
    marksBtn.addEventListener('click', () => {
      const on = !document.body.classList.contains('marks');
      apply(on);
      try { localStorage.setItem('anm:marks', on ? 'on' : 'off'); } catch {}
    });
  }

  /* Rotating taglines over the hero: each fades out fully before the next fades in. */
  const lines = [...document.querySelectorAll('.taglines span')];
  if (lines.length > 1) {
    let i = 0;
    setInterval(() => {
      lines[i].classList.remove('on');
      i = (i + 1) % lines.length;
      setTimeout(() => lines[i].classList.add('on'), 1000);
    }, 4200);
  }

  /* Hero stand-in until the video loop arrives: soft drifting light with film grain.
     Rendered small and scaled up so the grain reads as soft, like projected film. */
  const canvas = document.querySelector('.hero-grain');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const SCALE = 0.25;
    let w = 0, h = 0, running = false, last = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.round(r.width * SCALE));
      h = canvas.height = Math.max(1, Math.round(r.height * SCALE));
    };
    const draw = t => {
      const x = w * (0.55 + 0.16 * Math.sin(t / 8000));
      const y = h * (0.38 + 0.08 * Math.cos(t / 11000));
      const flicker = 0.92 + Math.random() * 0.08;
      ctx.fillStyle = '#0B0F17';
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.8);
      g.addColorStop(0, `rgba(96, 116, 152, ${0.55 * flicker})`);
      g.addColorStop(0.45, `rgba(43, 61, 97, ${0.35 * flicker})`);
      g.addColorStop(1, 'rgba(11, 15, 23, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let p = 0; p < d.length; p += 4) {
        const n = (Math.random() - 0.5) * 26;
        d[p] += n; d[p + 1] += n; d[p + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    };
    const loop = t => {
      if (!running) return;
      if (t - last > 55) { draw(t); last = t; }
      requestAnimationFrame(loop);
    };

    resize();
    draw(0);
    window.addEventListener('resize', () => { resize(); draw(performance.now()); });
    if (!reduceMotion && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting && !document.hidden;
        if (visible && !running) { running = true; requestAnimationFrame(loop); }
        if (!visible) running = false;
      }).observe(canvas);
    }
  }
})();
