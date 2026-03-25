/* ============================================
   RVOLUTION X — main.js
   Scroll reveal · Nav · FAQ accordion
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAV SCROLL STATE ─────────────────── */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── SCROLL REVEAL ────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));

  /* ── MOCKUP BAR CHART ANIMATION ───────── */
  const bars = document.querySelectorAll('.mockup-bar-item');
  const heights = [40, 65, 45, 80, 55, 90, 70];
  bars.forEach((bar, i) => {
    bar.style.height = heights[i % heights.length] + '%';
    bar.style.animationDelay = (i * 0.12) + 's';
  });

  /* ── FAQ ACCORDION ────────────────────── */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const body    = item.querySelector('.faq-body');
    const inner   = item.querySelector('.faq-body-inner');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      faqItems.forEach(fi => {
        fi.classList.remove('open');
        fi.querySelector('.faq-body').style.maxHeight = '0';
      });
      // Open clicked if was closed
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = inner.scrollHeight + 'px';
      }
    });
  });

  /* ── CHANNEL BUTTONS ──────────────────── */
  const channelBtns = document.querySelectorAll('.channel-btn');
  const channelInput = document.getElementById('channel-value');
  channelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      channelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (channelInput) channelInput.value = btn.dataset.value;
    });
  });

  /* ── FORM SUBMISSION (Netlify) ─────────── */
  const form = document.getElementById('audit-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      // Netlify handles the POST; redirect to merci.html
      // No need to prevent default unless using fetch
    });
  }

  /* ── COUNTER ANIMATION ─────────────────── */
  function animateCounter(el, end, suffix = '') {
    const duration = 1500;
    const start    = 0;
    const step     = 16;
    const steps    = duration / step;
    const increment = (end - start) / steps;
    let current    = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current) + suffix;
    }, step);
  }

  const statNums = document.querySelectorAll('.stat-num[data-value]');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const val = parseFloat(el.dataset.value);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, val, suffix);
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => statObserver.observe(el));

  /* ── SMOOTH SCROLL NAV ────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
