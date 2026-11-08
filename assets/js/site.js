// Anamnesis Film — small site behaviors: header state, phone menu, trailers, first-screen slideshow.
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Start each newly opened page at its top (same code in both drafts).
     The claude.ai preview runs the site in a frame and, just after a page loads, scrolls it back to
     where the previous page was, so a film page opened halfway down. On a fresh page load inside a
     frame, this undoes that one restore: to the top, or to the #section a link asked for. It stops as
     soon as the visitor scrolls, taps or types, and does nothing on Back/Forward or outside a frame. */
  const navEntry = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  if (window.self !== window.top && (!navEntry || navEntry.type === 'navigate')) {
    let settling = true;
    const settle = () => {
      const id = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
      const target = id && document.getElementById(id);
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else if (!id) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    const stopSettling = () => { settling = false; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type => window.addEventListener(type, stopSettling, { once: true, passive: true }));
    window.addEventListener('scroll', () => { if (settling) settle(); }, { passive: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', settle); else settle();
    window.addEventListener('load', () => { if (settling) settle(); setTimeout(stopSettling, 600); });
  }

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

  /* Trailers: the video player loads only when someone presses play.
     Inside a framed preview (the claude.ai artifact) the button just opens the video site. */
  if (window.self === window.top) document.querySelectorAll('.trailer[data-embed]').forEach(frame => {
    const play = frame.querySelector('.play');
    if (!play) return;
    play.addEventListener('click', e => {
      e.preventDefault();
      const player = document.createElement('iframe');
      player.src = frame.dataset.embed;
      player.title = play.getAttribute('aria-label') || 'Trailer';
      player.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      player.allowFullscreen = true;
      frame.replaceChildren(player);
    });
  });

  /* First screen: a slow crossfade through the studio photos (same code in both drafts).
     Only the first photo loads with the page; the rest load once the page has finished loading.
     It moves only while on screen and while the tab is visible, has a Pause button,
     and stays on the first photo for anyone who prefers reduced motion. */
  const slides = document.querySelector('[data-slides]');
  const photos = slides ? [...slides.querySelectorAll('img')] : [];
  if (photos.length > 1 && !reduceMotion) {
    const toggle = slides.parentElement.querySelector('.slides-toggle');
    const HOLD = 6000;
    let current = 0, timer = null, paused = false, onScreen = true;
    const load = img => {
      if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
    };
    const ready = img => img.complete && img.naturalWidth > 0;
    const step = () => {
      const next = (current + 1) % photos.length;
      if (!ready(photos[next])) return; // still downloading: try again on the next beat
      photos[current].classList.remove('is-on');
      photos[next].classList.add('is-on');
      current = next;
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { if (!timer && !paused && onScreen && !document.hidden) timer = setInterval(step, HOLD); };
    const loadRest = () => photos.slice(1).forEach(load);
    if (document.readyState === 'complete') loadRest(); else window.addEventListener('load', loadRest);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; onScreen ? start() : stop(); }).observe(slides);
    }
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        paused = !paused;
        toggle.textContent = paused ? 'Play' : 'Pause';
        toggle.setAttribute('aria-label', paused ? 'Play the slideshow' : 'Pause the slideshow');
        paused ? stop() : start();
      });
    }
    start();
  }
})();
