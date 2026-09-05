/* ═══════════════════════════════════════════════════════════════
   MAÎTRE ILHEM ABSI ANANE — Moteur d'interactions premium v2
   Preloader cinématique · curseur magnetique
   Manifesto mot-à-mot · aperçu flottant expertises · FAQ · horloge
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Année ──────────────────────────────────────────────── */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Preloader cinématique ──────────────────────────────── */
  document.body.classList.add('is-locked');
  const preloader = $('#preloader');
  const preBar = $('.preloader__bar span');
  const prePct = $('#preloaderPct');

  let progress = 0;
  let loaded = false;
  const tick = setInterval(() => {
    progress = Math.min(progress + Math.random() * 16, loaded ? 100 : 90);
    preBar.style.width = progress + '%';
    if (prePct) prePct.textContent = Math.round(progress);
    if (progress >= 100) {
      clearInterval(tick);
      setTimeout(finishLoad, 250);
    }
  }, 120);

  const finishLoad = () => {
    if (document.body.classList.contains('is-loaded')) return;
    preloader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-loaded');
    onScrollFrame(); // première passe des effets liés au scroll
  };
  addEventListener('load', () => {
    loaded = true;
    progress = Math.max(progress, 92);
    setTimeout(() => { progress = 100; }, 350);
  });
  setTimeout(() => { progress = 100; }, 3200); // filet de sécurité

  /* ── Souris globale + boucle rAF maître ─────────────────── */
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  const cursorLabel = $('#cursorLabel');
  let rx = mouse.x, ry = mouse.y;

  const preview = $('#xpPreview');
  const previewImg = $('#xpPreviewImg');
  let pv = { x: mouse.x, y: mouse.y, tx: mouse.x, ty: mouse.y, vx: 0, active: false };

  const masterLoop = (time) => {
    // Curseur personnalisé
    if (finePointer && !prefersReduced) {
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%,-50%)`;
      rx = lerp(rx, mouse.x, 0.16);
      ry = lerp(ry, mouse.y, 0.16);
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    }

    // Aperçu flottant des expertises
    if (pv.active) {
      const prevX = pv.x;
      pv.x = lerp(pv.x, pv.tx, 0.11);
      pv.y = lerp(pv.y, pv.ty, 0.11);
      pv.vx = pv.x - prevX;
      const rot = Math.max(-7, Math.min(7, pv.vx * 0.55));
      preview.style.transform =
        `translate(${pv.x}px, ${pv.y}px) translate(-50%,-58%) rotate(${rot}deg) scale(1)`;
    }

    requestAnimationFrame(masterLoop);
  };
  requestAnimationFrame(masterLoop);

  /* ── Curseur : survols & étiquettes ─────────────────────── */
  if (finePointer && !prefersReduced) {
    $$('a, button, input, select, textarea, .value, .step').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorLabel.textContent = el.dataset.cursor;
        ring.classList.add('has-label');
      });
      el.addEventListener('mouseleave', () => ring.classList.remove('has-label'));
    });
  }

  /* ── Boutons magnétiques ────────────────────────────────── */
  if (finePointer && !prefersReduced) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .18s ease-out';
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .55s cubic-bezier(.22,1.4,.36,1)';
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ── Header · progression · lien actif ──────────────────── */
  const header = $('#header');
  const progressBar = $('#scrollProgressBar');
  const navLinks = $$('.nav__link');
  const sections = navLinks.map(l => $(l.getAttribute('href'))).filter(Boolean);
  const manifesto = $('#manifesto');

  /* Découpage du manifesto en mots (préserve les <em>) */
  let manifestoWords = [];
  if (manifesto) {
    const wrapWords = (node) => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (/^\s+$/.test(part) || part === '') { frag.appendChild(document.createTextNode(part)); }
            else {
              const span = document.createElement('span');
              span.className = 'w';
              span.textContent = part;
              frag.appendChild(span);
              manifestoWords.push(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) wrapWords(child);
      });
    };
    wrapWords(manifesto);
    if (prefersReduced) manifestoWords.forEach(w => w.classList.add('is-on'));
  }

  /* ── Parallaxe ──────────────────────────────────────────── */
  const pxEls = prefersReduced ? [] : $$('[data-parallax]');

  const onScrollFrame = () => {
    const y = scrollY;
    const vh = innerHeight;

    header.classList.toggle('is-scrolled', y > 40);
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    let current = null;
    for (const sec of sections) {
      if (sec.getBoundingClientRect().top <= vh * 0.4) current = sec.id;
    }
    navLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${current}`));

    // Manifesto mot-à-mot
    if (manifesto && !prefersReduced) {
      const r = manifesto.getBoundingClientRect();
      const p = Math.min(Math.max((vh * 0.88 - r.top) / (vh * 0.42), 0), 1);
      const n = Math.floor(p * manifestoWords.length);
      manifestoWords.forEach((w, i) => w.classList.toggle('is-on', i < n));
    }

    // Parallaxe douce
    pxEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
  };

  let scrollScheduled = false;
  addEventListener('scroll', () => {
    if (!scrollScheduled) {
      requestAnimationFrame(() => { onScrollFrame(); scrollScheduled = false; });
      scrollScheduled = true;
    }
  }, { passive: true });
  addEventListener('resize', onScrollFrame, { passive: true });

  /* ── Menu mobile ────────────────────────────────────────── */
  const burger = $('#burger');
  const nav = $('#nav');
  const isMenuOpen = () => nav.classList.contains('is-open');
  const toggleMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  burger.addEventListener('click', () => toggleMenu(!isMenuOpen()));
  /* Fermeture en phase de capture : le menu se referme AVANT le
     défilement ancré, donc le scroll n'est jamais bloqué. */
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) toggleMenu(false);
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && isMenuOpen()) toggleMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 960 && isMenuOpen()) toggleMenu(false); });

  /* ── Révélations au scroll ──────────────────────────────── */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal:not(.is-visible)').forEach(el => {
    const siblings = [...(el.parentElement?.children ?? [])].filter(c => c.classList?.contains('reveal'));
    const idx = Math.max(0, siblings.indexOf(el));
    el.style.setProperty('--d', `${Math.min(idx * 0.1, 0.5)}s`);
    revealObserver.observe(el);
  });

  /* ── Compteurs animés ───────────────────────────────────── */
  const animateCount = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const pad = +(el.dataset.pad || 0);
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 2000, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = String(Math.round(target * eased)).padStart(pad, '0') + suffix;
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

  /* ── Barres de langue ───────────────────────────────────── */
  const langObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.level + '%';
        langObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  $$('.lang__bar span').forEach(el => langObserver.observe(el));

  /* ── Aperçu flottant des expertises (chargement à la demande) ── */
  if (finePointer && !prefersReduced) {
    const list = $('.xp-list');
    $$('.xp-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        if (previewImg.getAttribute('src') !== row.dataset.img) {
          previewImg.src = row.dataset.img; // chargé uniquement au premier survol
        }
        preview.classList.add('is-on');
        pv.active = true;
      });
    });
    list.addEventListener('mousemove', e => {
      pv.tx = e.clientX + 130;
      pv.ty = e.clientY;
    });
    list.addEventListener('mouseleave', () => {
      preview.classList.remove('is-on');
      pv.active = false;
    });
  }

  /* ── Accordéons génériques (détail XP + FAQ) ────────────── */
  $$('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.toggle);
      if (!target) return;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        target.style.maxHeight = target.scrollHeight + 'px';
        target.style.overflow = 'hidden';
        requestAnimationFrame(() => { target.style.maxHeight = '0px'; });
        setTimeout(() => { target.hidden = true; target.style = ''; }, 480);
      } else {
        btn.setAttribute('aria-expanded', 'true');
        target.hidden = false;
        target.style.overflow = 'hidden';
        target.style.maxHeight = '0px';
        requestAnimationFrame(() => { target.style.maxHeight = target.scrollHeight + 'px'; });
        setTimeout(() => { target.style = ''; }, 520);
      }
    });
  });

  /* ── Formulaire de contact ──────────────────────────────── */
  const form = $('#contactForm');
  const success = $('#formSuccess');
  const successMsg = $('#formSuccessMsg');
  const isAr = document.documentElement.lang === 'ar';
  const msgs = isAr
    ? { sending: 'جارٍ إرسال طلبكم…', saved: 'شكرًا لكم! تم تسجيل طلبكم لدى المكتب وسنرد عليكم في أقرب وقت.', offline: 'شكرًا لكم! تم تسجيل طلبكم محليًا وسيتم التعامل معه في أقرب وقت.' }
    : { sending: 'Envoi de votre demande en cours…', saved: 'Merci ! Votre demande a bien été transmise au cabinet. Nous vous répondrons au plus vite.', offline: 'Merci ! Votre demande a été enregistrée localement et sera traitée dès que possible.' };
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
    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      phone: $('#f-phone').value.trim() || '—',
      caseType: $('#f-type').value || 'Non spécifié',
      message: msg.value.trim()
    };

    // Send POST request to real API Database endpoint
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    successMsg.textContent = msgs.sending;
    success.hidden = false;

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur d\'enregistrement');
      console.log('[DATABASE API] Submission saved successfully:', data);
      saveLocalFallback(payload);
      successMsg.textContent = msgs.saved;
    }).catch(err => {
      console.warn('[DATABASE API] Offline/fallback mode:', err);
      saveLocalFallback(payload);
      successMsg.textContent = msgs.offline;
    }).finally(() => {
      button.disabled = false;
      form.reset();
      setTimeout(() => { success.hidden = true; }, 12000);
    });
  });

  const saveLocalFallback = (payload) => {
    // Save to localStorage for Admin Dashboard fallback
    const submission = {
      id: 'sub_' + Date.now(),
      date: new Date().toISOString(),
      dateFormatted: new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tunis'
      }).format(new Date()),
      ...payload,
      status: 'Nouveau'
    };
    try {
      const existing = JSON.parse(localStorage.getItem('contact_submissions') || '[]');
      existing.unshift(submission);
      localStorage.setItem('contact_submissions', JSON.stringify(existing));
    } catch(err) {
      console.error('Error saving submission to localStorage', err);
    }
  };

  $$('input, textarea', form).forEach(input =>
    input.addEventListener('input', () => setInvalid(input, false))
  );

  /* ── Ancres douces (défilement natif) ───────────────────── */
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

  /* ── Horloge locale de Tunis (footer) ───────────────────── */
  const clock = $('#footerClock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis',
    });
    const updateClock = () => { clock.textContent = fmt.format(new Date()); };
    updateClock();
    setInterval(updateClock, 15000);
  }
})();