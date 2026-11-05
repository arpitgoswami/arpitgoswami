/* =========================================================
   Arpit Goswami — interaction layer
   Nav, hero proof strip, archive filters, reveals,
   rolling figures, GitHub figures, IST clock.
   ========================================================= */

(() => {
  'use strict';

  const doc = document;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- navigation ---------- */

  const navToggle = doc.querySelector('.nav__toggle');
  const navMenu = doc.getElementById('nav-menu');

  if (navToggle && navMenu) {
    const setOpen = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navMenu.hidden = !open;
      const icon = navToggle.querySelector('i');
      if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    };

    navToggle.addEventListener('click', () => setOpen(navMenu.hidden));

    navMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !navMenu.hidden) {
        setOpen(false);
        navToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 820 && !navMenu.hidden) setOpen(false);
    });
  }

  /* ---------- hero proof strip ---------- */

  const strip = doc.querySelector('[data-strip]');

  if (strip) {
    const items = Array.from(strip.querySelectorAll('.strip__item'));
    let ticking = false;

    const light = () => {
      const box = strip.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      let lit = null;
      let shortest = Infinity;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - middle);
        if (distance < shortest) {
          shortest = distance;
          lit = item;
        }
      });

      items.forEach((item) => item.classList.toggle('is-lit', item === lit));
      ticking = false;
    };

    const queue = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(light);
    };

    strip.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);

    strip.scrollLeft = 0;
    light();
    window.addEventListener('load', light, { once: true });
  }

  /* ---------- archive filters ---------- */

  const filterButtons = Array.from(doc.querySelectorAll('[data-filter]'));
  const projects = Array.from(doc.querySelectorAll('.project'));
  const countLabel = doc.querySelector('[data-count]');

  if (filterButtons.length && projects.length) {
    const nouns = {
      games: 'games',
      web: 'web builds',
      research: 'research build'
    };

    const applyFilter = (filter, button) => {
      filterButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });

      let shown = 0;

      projects.forEach((project) => {
        const visible = filter === 'all' || project.dataset.discipline === filter;
        project.hidden = !visible;
        if (visible) shown += 1;
      });

      if (countLabel) {
        countLabel.textContent = filter === 'all'
          ? 'Showing all seven'
          : `Showing ${shown} ${nouns[filter] || 'builds'}`;
      }
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.filter, button));
    });
  }

  /* ---------- scroll reveals ---------- */

  const revealItems = Array.from(doc.querySelectorAll('[data-reveal]'));

  if (revealItems.length) {
    if (reduceMotion.matches || !hasIO) {
      revealItems.forEach((item) => item.classList.add('is-in'));
    } else {
      const revealer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        });
      }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.08
      });

      revealItems.forEach((item) => revealer.observe(item));
    }
  }

  /* ---------- figures ---------- */

  const rollItems = Array.from(doc.querySelectorAll('[data-roll]'));

  const countTo = (element, target) => {
    const raw = String(target);
    element.dataset.value = raw;

    const numeric = Number(raw);
    const isYear = numeric >= 1900 && numeric <= 2100;

    if (reduceMotion.matches || !Number.isFinite(numeric) || isYear) {
      element.textContent = raw;
      return;
    }

    const duration = 900;
    const start = performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(numeric * eased));
      if (progress < 1) window.requestAnimationFrame(frame);
      else element.textContent = raw;
    };

    window.requestAnimationFrame(frame);
  };

  if (rollItems.length) {
    if (reduceMotion.matches || !hasIO) {
      rollItems.forEach((element) => {
        element.dataset.value = (element.textContent || '0').trim();
      });
    } else {
      const counter = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          const target = (element.dataset.value || element.textContent || '0').trim();
          countTo(element, target);
          counter.unobserve(element);
        });
      }, { threshold: 0.35 });

      rollItems.forEach((element) => {
        element.dataset.value = (element.textContent || '0').trim();
        counter.observe(element);
      });
    }
  }

  /* ---------- live GitHub figures ---------- */

  const statElements = {
    repos: doc.querySelector('[data-stat="repos"]'),
    stars: doc.querySelector('[data-stat="stars"]'),
    since: doc.querySelector('[data-stat="since"]')
  };

  const updateStat = (element, value) => {
    if (!element || value === null || value === undefined) return;

    const next = String(value);
    if (element.dataset.value === next) return;

    const revealed = element.closest('.stat')?.classList.contains('is-in');
    if (revealed && !reduceMotion.matches && hasIO) countTo(element, next);
    else {
      element.dataset.value = next;
      element.textContent = next;
    }
  };

  const loadGitHubFigures = async () => {
    if (!statElements.repos && !statElements.stars && !statElements.since) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    const headers = { Accept: 'application/vnd.github+json' };

    try {
      const [userResponse, reposResponse] = await Promise.all([
        fetch('https://api.github.com/users/arpitgoswami', { signal: controller.signal, headers }),
        fetch('https://api.github.com/users/arpitgoswami/repos?per_page=100&sort=created&direction=asc', { signal: controller.signal, headers })
      ]);

      if (!userResponse.ok || !reposResponse.ok) return;

      const [user, repos] = await Promise.all([userResponse.json(), reposResponse.json()]);
      if (!Array.isArray(repos)) return;

      const stars = repos.reduce((total, repo) => total + (repo.stargazers_count || 0), 0);
      const firstYear = repos
        .map((repo) => (repo.created_at ? new Date(repo.created_at).getFullYear() : null))
        .filter((year) => Number.isFinite(year) && year > 2000)
        .sort((a, b) => a - b)[0];

      updateStat(statElements.repos, user.public_repos ?? repos.length);
      updateStat(statElements.stars, stars);
      if (firstYear) updateStat(statElements.since, firstYear);
    } catch (error) {
      /* Build-time figures stay in place. */
    } finally {
      window.clearTimeout(timeout);
    }
  };

  loadGitHubFigures();

  /* ---------- IST clock ---------- */

  const clock = doc.getElementById('local-time');

  if (clock) {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });

    const tick = () => {
      const now = new Date();
      clock.textContent = `IST ${time.format(now)}`;
      clock.setAttribute('datetime', now.toISOString());
    };

    tick();
    window.setInterval(tick, 1000);
  }
})();
