/* ═══════════════════════════════════════════════════════════════
   MAÎTRE ABSI ELHEM — Interactions premium
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── Année courante ─────────────────────────────────────── */
  $('#year').textContent = new Date().getFullYear();

  /* ── Preloader ──────────────────────────────────────────── */
  const preloader = $('#preloader');
  const preBar = $('.preloader__bar span');

  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(progress + Math.random() * 22, 92);
    preBar.style.width = progress + '%';
  }, 140);

  const hidePreloader = () => {
    clearInterval(tick);
    preBar.style.width = '100%';
    setTimeout(() => {
      preloader.classList.add('is-done');
      document.body.classList.add('is-loaded');
      revealOnScroll(); // première passe
    }, 350);
  };
  window.addEventListener('load', () => setTimeout(hidePreloader, prefersReduced ? 100 : 900));
  setTimeout(hidePreloader, 3500); // filet de sécurité

  /* ── Curseur personnalisé ───────────────────────────────── */
  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReduced) {
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$('a, button, .xp, .value, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });
  }

  /* ── Header + barre de progression + lien actif ─────────── */
  const header = $('#header');
  const progressBar = $('#scrollProgressBar');
  const navLinks = $$('.nav__link');
  const sections = navLinks
    .map(l => $(l.getAttribute('href')))
    .filter(Boolean);

  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    let current = null;
    for (const sec of sections) {
      if (sec.getBoundingClientRect().top <= innerHeight * 0.4) current = sec.id;
    }
    navLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${current}`));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Menu mobile ────────────────────────────────────────── */
  const burger = $('#burger');
  const nav = $('#nav');
  const toggleMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  burger.addEventListener('click', () => toggleMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) toggleMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

  /* ── Révélations au scroll ─────────────────────────────── */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function revealOnScroll() {
    $$('.reveal:not(.is-visible)').forEach((el, i) => {
      // léger décalage au sein d'un même groupe visible
      const siblings = [...(el.parentElement?.children ?? [])].filter(c => c.classList?.contains('reveal'));
      const idx = Math.max(0, siblings.indexOf(el));
      el.style.setProperty('--d', `${Math.min(idx * 0.12, 0.6)}s`);
      revealObserver.observe(el);
    });
  }
  revealOnScroll();

  /* ── Compteurs animés ──────────────────────────────────── */
  const animateCount = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const pad = +(el.dataset.pad || 0);
    const dur = 2000;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const val = Math.round(target * eased);
      el.textContent = String(val).padStart(pad, '0').padStart(2, '0') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCount(e.target); countObserver.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  $$('.stat__num').forEach(el => countObserver.observe(el));

  /* ── Barres de langue ──────────────────────────────────── */
  const langObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.level + '%';
        langObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  $$('.lang__bar span').forEach(el => langObserver.observe(el));

  /* ── Parallaxe douce ───────────────────────────────────── */
  if (!prefersReduced) {
    const pxEls = $$('[data-parallax]');
    let ticking = false;
    const applyParallax = () => {
      const vh = innerHeight;
      pxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.dataset.parallax);
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(applyParallax); ticking = true; }
    }, { passive: true });
    applyParallax();
  }

  /* ── Détails expérience (accordéon) ────────────────────── */
  $$('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = $(`#${btn.dataset.toggle}`);
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (open) {
        target.style.maxHeight = target.scrollHeight + 'px';
        requestAnimationFrame(() => { target.style.maxHeight = '0'; target.style.overflow = 'hidden'; });
        setTimeout(() => { target.hidden = true; target.style = ''; }, 450);
      } else {
        target.hidden = false;
        target.style.maxHeight = '0'; target.style.overflow = 'hidden';
        requestAnimationFrame(() => { target.style.maxHeight = target.scrollHeight + 'px'; });
        setTimeout(() => { target.style = ''; }, 500);
      }
    });
  });

  /* ── Formulaire de contact ─────────────────────────────── */
  const form = $('#contactForm');
  const success = $('#formSuccess');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const setInvalid = (input, invalid) =>
    input.closest('.field').classList.toggle('is-invalid', invalid);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#f-name'), email = $('#f-email'), msg = $('#f-msg');
    let ok = true;
    [[name, name.value.trim().length >= 2],
     [email, emailRe.test(email.value.trim())],
     [msg, msg.value.trim().length >= 10]].forEach(([input, valid]) => {
      setInvalid(input, !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      $('.field.is-invalid input, .field.is-invalid textarea')?.focus();
      return;
    }

    // Ouvre le client mail pré-rempli (front-end démo, sans backend)
    const subject = encodeURIComponent(`Demande de rendez-vous — ${name.value.trim()}`);
    const body = encodeURIComponent(
      `Nom : ${name.value.trim()}\n` +
      `Email : ${email.value.trim()}\n` +
      `Téléphone : ${$('#f-phone').value.trim() || '—'}\n` +
      `Type de dossier : ${$('#f-type').value || '—'}\n\n` +
      `Message :\n${msg.value.trim()}`
    );
    success.hidden = false;
    window.location.href = `mailto:contact@cabinet-absi-elhem.tn?subject=${subject}&body=${body}`;
    form.reset();
    setTimeout(() => { success.hidden = true; }, 12000);
  });

  $$('input, textarea', form).forEach(input =>
    input.addEventListener('input', () => setInvalid(input, false))
  );

  /* ── Défilement ancré avec compensation du header ──────── */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + scrollY - 70;
      scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });
})();
