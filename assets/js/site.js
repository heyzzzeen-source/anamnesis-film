// Anamnesis Film — small site behaviors: header state, phone menu, trailers, still viewer, first-screen slideshow.
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

  /* Stills on film pages: click (or tap) one to see it full size, then step through the others
     with the arrows, the arrow keys or a swipe. Escape, Close or a click beside the photo closes it.
     The viewer shows the same files as the page, so nothing new downloads. */
  const stills = [...document.querySelectorAll('.stills .frame img')];
  if (stills.length && typeof HTMLDialogElement === 'function') {
    const arrow = d => `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    const viewer = document.createElement('dialog');
    viewer.className = 'viewer';
    viewer.setAttribute('aria-label', 'Stills');
    viewer.innerHTML =
      '<div class="viewer-bar"><p class="viewer-title"></p><button class="viewer-close" type="button">Close</button></div>' +
      '<div class="viewer-stage"><img class="viewer-img" alt=""></div>' +
      '<div class="viewer-foot">' +
        `<button class="viewer-nav viewer-prev" type="button" aria-label="Previous still">${arrow('M11.5 3.5 6 9l5.5 5.5')}</button>` +
        '<p class="viewer-count label" aria-live="polite"></p>' +
        `<button class="viewer-nav viewer-next" type="button" aria-label="Next still">${arrow('M6.5 3.5 12 9l-5.5 5.5')}</button>` +
      '</div>';
    document.body.append(viewer);
    const $ = sel => viewer.querySelector(sel);
    const img = $('.viewer-img'), count = $('.viewer-count'), stage = $('.viewer-stage');
    const title = document.querySelector('h1');
    $('.viewer-title').textContent = title ? title.textContent.trim() : '';
    const several = stills.length > 1;
    $('.viewer-prev').hidden = $('.viewer-next').hidden = !several;
    const src = el => el.currentSrc || el.src;
    let index = 0;
    const show = i => {
      index = (i + stills.length) % stills.length;
      img.src = src(stills[index]);
      img.alt = stills[index].alt;
      count.textContent = several ? `${index + 1} / ${stills.length}` : '';
      if (several) [index + 1, index - 1].forEach(n => { new Image().src = src(stills[(n + stills.length) % stills.length]); });
    };
    const buttons = stills.map((still, i) => {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'still-open';
      open.setAttribute('aria-label', several ? `View still ${i + 1} of ${stills.length} full size` : 'View the still full size');
      open.addEventListener('click', () => {
        show(i);
        document.documentElement.classList.add('viewer-lock');
        viewer.showModal();
      });
      still.parentElement.append(open);
      return open;
    });
    const close = () => viewer.close();
    viewer.addEventListener('close', () => {
      document.documentElement.classList.remove('viewer-lock');
      buttons[index].focus({ preventScroll: true });
    });
    $('.viewer-close').addEventListener('click', close);
    $('.viewer-prev').addEventListener('click', () => show(index - 1));
    $('.viewer-next').addEventListener('click', () => show(index + 1));
    // A click on the dark area around the photo closes; a click on the photo does nothing.
    viewer.addEventListener('click', e => { if (e.target === viewer || e.target === stage) close(); });
    viewer.addEventListener('keydown', e => {
      if (!several) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    });
    // Swipe on phones: one finger, mostly sideways. Pinch-zoom and panning a zoomed page are left alone.
    let touch = null;
    stage.addEventListener('touchstart', e => {
      touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (!touch || !several || (window.visualViewport && window.visualViewport.scale > 1.05)) { touch = null; return; }
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

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

  /* Google Analytics 4 (studio account filmanamnesis@gmail.com, property "anamnesisfilm.com").
     Runs only on the real site, so local and claude.ai previews don't count as visits.
     Consent: visitors whose device clock is on a European time zone see a small banner, and
     analytics cookies stay off until they press Accept. As a second guard, Google's Consent Mode
     also keeps cookies off for visitors Google places in the EU/EEA, UK or Switzerland, whatever
     their clock says; it then sends only cookieless pings. Everyone else is counted normally.
     No ad features: all ad_* consent types stay denied. The choice is kept in localStorage. */
  const GA_ID = 'G-5G77RX7QDR';
  if (location.hostname === 'anamnesisfilm.com') {
    const KEY = 'af-analytics-consent';
    const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    const save = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ask again next visit */ } };
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
    const inEurope = /^(Europe\/|Atlantic\/(Canary|Madeira|Azores|Faroe|Reykjavik)$|Arctic\/Longyearbyen$)/.test(tz);
    const choice = read(); // 'granted', 'denied' or null

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    const ads = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
    gtag('consent', 'default', { ...ads, analytics_storage: inEurope ? 'denied' : 'granted' });
    gtag('consent', 'default', { ...ads, analytics_storage: 'denied', region: [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
      'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'] });
    if (choice) gtag('consent', 'update', { analytics_storage: choice });

    /* Team devices. Open the site once with ?team=1 on a phone or computer to mark it as a team
       device (?team=0 unmarks it). A team device doesn't load Google Analytics at all, so the
       team showing the site around never reaches the numbers. (Marking hits with traffic_type
       "internal" was tried first, Nov 9: Google's tag sends its first page view without it.) */
    const TEAM_KEY = 'af-team';
    const teamParam = new URLSearchParams(location.search).get('team');
    try {
      if (teamParam === '1') localStorage.setItem(TEAM_KEY, '1');
      if (teamParam === '0') localStorage.removeItem(TEAM_KEY);
    } catch (e) { /* private mode: can't remember the mark */ }
    let isTeam = teamParam === '1';
    try { isTeam = isTeam || localStorage.getItem(TEAM_KEY) === '1'; } catch (e) { /* as above */ }

    /* Tidy address bar. Links from the namecard QR or Instagram arrive with long tracking tags
       (utm_…, plus fbclid, which Instagram and Facebook add on their own). Click ids and ?team
       come off at once. The utm_ tags stay until GA has read the page, because GA takes the
       source from the address itself (a page_location passed in config is ignored for the first
       page view; checked Nov 9), and come off a moment later, so a visitor who copies or shares
       the address passes on a clean link. */
    const strip = (url, test) => { [...url.searchParams.keys()].filter(test).forEach(k => url.searchParams.delete(k)); return url; };
    const setAddress = url => { if (url.href !== location.href) history.replaceState(history.state, '', url); };
    const clickIds = ['fbclid', 'gclid', 'igshid', 'msclkid', 'team'];
    setAddress(strip(new URL(location.href), k => clickIds.includes(k)));
    let tidied = false;
    const tidy = () => { if (!tidied) { tidied = true; setAddress(strip(new URL(location.href), k => k.startsWith('utm_'))); } };

    gtag('js', new Date());
    gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    if (isTeam) {
      tidy();
    } else {
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      tag.onload = () => setTimeout(tidy, 1000);
      document.head.appendChild(tag);
      setTimeout(tidy, 5000); // in case GA is blocked
    }

    let banner = null;
    const decide = v => {
      save(v);
      gtag('consent', 'update', { analytics_storage: v });
      if (banner) { banner.remove(); banner = null; }
    };
    const showBanner = () => {
      if (banner) return;
      banner = document.createElement('div');
      banner.className = 'consent';
      banner.setAttribute('role', 'region');
      banner.setAttribute('aria-label', 'Cookie choice');
      banner.innerHTML =
        '<p>May we use analytics cookies (Google Analytics) to count visits? No ads, and you can change this any time in the footer. ' +
        '<a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses this data</a></p>' +
        '<div class="consent-actions"><button type="button" class="btn" data-v="denied">Decline</button>' +
        '<button type="button" class="btn solid" data-v="granted">Accept</button></div>';
      banner.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) decide(b.dataset.v); });
      document.body.appendChild(banner);
    };
    if (inEurope) {
      if (!choice) showBanner();
      // A way to change the choice later, as GDPR asks: "Cookie settings" in the footer.
      const footer = document.querySelector('.footer-inner');
      if (footer) {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'consent-link';
        link.textContent = 'Cookie settings';
        link.addEventListener('click', showBanner);
        footer.appendChild(link);
      }
    }

    /* Events. Each needs its parameters registered as custom dimensions in GA (Admin → Custom
       definitions) to show up in reports: film, card_position, link_type, contact_method.
       No names or email addresses are sent, only which film and which kind of link. */
    const send = (name, params) => gtag('event', name, params);

    // contact_email (a key event in GA): the email address is clicked, or copied from the page.
    // card click: any of the three links (photo, title, button) on the "Looking for partners" cards.
    const cards = [...document.querySelectorAll('.now-card')];
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (a.getAttribute('href').startsWith('mailto:')) send('contact_email', { contact_method: 'click' });
      const card = a.closest('.now-card');
      if (card) {
        const filmLink = card.querySelector('a.frame, h3 a');
        send('partner_card_click', {
          film: filmLink ? filmLink.getAttribute('href').replace(/\.html$/, '') : 'unknown',
          card_position: cards.indexOf(card) + 1,
          link_type: a.classList.contains('frame') ? 'photo' : a.classList.contains('btn') ? 'button' : 'title'
        });
      }
    });
    document.addEventListener('copy', () => {
      if (String(window.getSelection() || '').includes('filmanamnesis@gmail.com')) send('contact_email', { contact_method: 'copy' });
    });

    // Scroll depth: 25, 50 and 75 % of the page, once each per page view. GA's own scroll event
    // (enhanced measurement) already sends 90 % under the same name and parameter, so all four
    // marks land in one report: event "scroll", dimension "Percent scrolled".
    const marks = [25, 50, 75];
    let nextMark = 0, ticking = false;
    const measure = () => {
      ticking = false;
      const doc = document.documentElement;
      const seen = (window.scrollY + window.innerHeight) / doc.scrollHeight * 100;
      while (nextMark < marks.length && seen >= marks[nextMark]) send('scroll', { percent_scrolled: marks[nextMark++] });
      if (nextMark >= marks.length) window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
