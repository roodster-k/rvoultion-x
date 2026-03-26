/* ============================================
   RVOLUTION X v2 — main.js
   Canvas particles · Cursor glow · Nav · FAQ · Counters
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── PARTICLE CANVAS ──────────────────────── */
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const COUNT = window.innerWidth < 600 ? 40 : 80;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    class Particle {
      constructor() { this.reset(true); }
      reset(random = false) {
        this.x  = Math.random() * W;
        this.y  = random ? Math.random() * H : H + 10;
        this.r  = Math.random() * 1.4 + 0.3;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -(Math.random() * 0.4 + 0.15);
        this.alpha = Math.random() * 0.5 + 0.1;
        const hue = Math.random() > 0.5 ? 238 : 197;
        this.color = `hsla(${hue}, 80%, 70%, ${this.alpha})`;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    // Draw connections
    function drawConnections() {
      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.06;
            ctx.strokeStyle = `rgba(129,140,248,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      drawConnections();
      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ── CURSOR GLOW ─────────────────────────── */
  const cursorGlow = document.querySelector('.cursor-glow');
  if (cursorGlow && window.innerWidth > 900) {
    document.addEventListener('mousemove', e => {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top  = e.clientY + 'px';
    }, { passive: true });
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  /* ── NAV SCROLL STATE ─────────────────────── */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── HAMBURGER MENU ───────────────────────── */
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── SCROLL REVEAL ────────────────────────── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  /* ── MOCKUP BAR CHART ─────────────────────── */
  const heights = [38, 60, 42, 78, 52, 90, 68];
  document.querySelectorAll('.mockup-bar-item').forEach((bar, i) => {
    bar.style.height = heights[i % heights.length] + '%';
    bar.style.animationDelay = (i * 0.12) + 's';
  });

  /* ── COUNTER ANIMATION ────────────────────── */
  function animateCounter(el, end, suffix = '') {
    const duration = 1400, step = 16;
    const steps = duration / step;
    const inc = (end - 0) / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= end) { cur = end; clearInterval(t); }
      el.textContent = Math.floor(cur) + suffix;
    }, step);
  }
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        animateCounter(el, parseFloat(el.dataset.value), el.dataset.suffix || '');
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num[data-value]').forEach(el => statObserver.observe(el));

  /* ── FAQ ACCORDION ────────────────────────── */
  document.querySelectorAll('.faq-item').forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const body    = item.querySelector('.faq-body');
    const inner   = item.querySelector('.faq-body-inner');
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(fi => {
        fi.classList.remove('open');
        fi.querySelector('.faq-body').style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = inner.scrollHeight + 'px';
      }
    });
  });

  /* ── CHANNEL BUTTONS ──────────────────────── */
  const channelBtns  = document.querySelectorAll('.channel-btn');
  const channelInput = document.getElementById('channel-value');
  channelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      channelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (channelInput) channelInput.value = btn.dataset.value;
    });
  });

  /* ── SMOOTH SCROLL ────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
      }
    });
  });

  /* ── HERO PARALLAX (subtle) ───────────────── */
  const heroH1 = document.querySelector('#hero h1');
  if (heroH1 && window.innerWidth > 600) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      heroH1.style.transform = `translateY(${y * 0.12}px)`;
      heroH1.style.opacity   = 1 - y / 500;
    }, { passive: true });
  }

});
