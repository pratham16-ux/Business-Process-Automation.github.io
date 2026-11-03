/**
 * Stackly Theme - main.js
 * Contents: 1 Header  2 Reveal  3 Counters  4 FAQ  5 Effects  6 Pricing  7 Forms
 */

/* ---------- 1. HEADER ---------- */
/**
 * header.js
 * Sticky header shadow, scroll-progress bar and the mobile navigation toggle.
 */
(function () {
  'use strict';

  var header = document.querySelector('.hdr');
  var progress = document.getElementById('progress');
  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');

  function onScroll() {
    var scrolled = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (header) header.classList.toggle('sc', scrolled > 20);
    if (progress) progress.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
  }

  function closeMenu() {
    burger.classList.remove('open');
    menu.classList.remove('open');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger && menu) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('open');
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }
})();

/* ---------- 2. REVEAL ---------- */
/**
 * reveal.js
 * Adds the "in" class to .rv elements as they scroll into view.
 */
(function () {
  'use strict';

  var items = document.querySelectorAll('.rv');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach(function (el) { observer.observe(el); });
})();

/* ---------- 3. COUNTERS ---------- */
/**
 * counters.js
 * Animates numbers marked with data-n (target) and optional data-s (suffix).
 * Example: <b data-n="4.8" data-s="M+">0</b>
 */
(function () {
  'use strict';

  var DURATION = 1800;
  var counters = document.querySelectorAll('[data-n]');
  if (!counters.length) return;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function run(el) {
    var target = parseFloat(el.dataset.n);
    var suffix = el.dataset.s || '';
    var decimals = (el.dataset.n.split('.')[1] || '').length;
    var start = null;

    function frame(time) {
      if (start === null) start = time;
      var progress = Math.min((time - start) / DURATION, 1);
      el.textContent = (target * easeOutCubic(progress)).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if (!('IntersectionObserver' in window)) {
    counters.forEach(function (el) { el.textContent = el.dataset.n + (el.dataset.s || ''); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(function (el) { observer.observe(el); });
})();

/* ---------- 4. FAQ ---------- */
/**
 * faq.js
 * Accordion behaviour: one FAQ item open at a time.
 */
(function () {
  'use strict';

  var items = document.querySelectorAll('.fq');

  function close(item) {
    item.classList.remove('open');
    item.querySelector('div').style.maxHeight = 0;
  }

  items.forEach(function (item) {
    var button = item.querySelector('button');
    var panel = item.querySelector('div');

    button.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');

      document.querySelectorAll('.fq.open').forEach(close);

      if (!wasOpen) {
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
})();

/* ---------- 5. EFFECTS ---------- */
/**
 * effects.js
 * Desktop-only polish: 3D card tilt, cursor glow and hero parallax.
 * Skipped on touch devices.
 */
(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover)').matches) return;

  var TILT = 5;

  document.querySelectorAll('.card, .step, .quote').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      card.style.transform =
        'translateY(-8px) perspective(800px) rotateX(' + (-y * TILT) + 'deg) rotateY(' + (x * TILT) + 'deg)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });

  var glow = document.getElementById('glow');
  if (glow) {
    window.addEventListener('mousemove', function (e) {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
  }

  var heroImage = document.querySelector('.hero-bg');
  if (heroImage) {
    window.addEventListener('scroll', function () {
      if (window.scrollY < 900) heroImage.style.marginTop = window.scrollY * 0.18 + 'px';
    }, { passive: true });
  }
})();

/* ---------- 6. PRICING ---------- */
/**
 * pricing.js
 * 1. Monthly / yearly price toggle  (buttons[data-p], prices[data-m][data-y])
 * 2. ROI calculator                 (#calc with sliders #c1 #c2 #c3)
 */
(function () {
  'use strict';

  /* ---------- Billing toggle ---------- */
  var toggleButtons = document.querySelectorAll('.toggle button');

  toggleButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var yearly = button.dataset.p === 'y';

      toggleButtons.forEach(function (b) { b.classList.remove('on'); });
      button.classList.add('on');

      document.querySelectorAll('[data-m]').forEach(function (price) {
        price.textContent = yearly ? price.dataset.y : price.dataset.m;
      });
    });
  });

  /* ---------- ROI calculator ---------- */
  var calc = document.getElementById('calc');
  if (!calc) return;

  var AUTOMATION_SAVING = 0.65; // typical reduction in manual effort
  var WEEKS_PER_YEAR = 52;

  function format(n) {
    return n.toLocaleString('en-IN');
  }

  function update() {
    var hours = +document.getElementById('c1').value;
    var rate = +document.getElementById('c2').value;
    var staff = +document.getElementById('c3').value;

    var hoursSaved = Math.round(hours * staff * WEEKS_PER_YEAR * AUTOMATION_SAVING);
    var moneySaved = Math.round(hours * rate * staff * WEEKS_PER_YEAR * AUTOMATION_SAVING);

    document.getElementById('o1').textContent = hours;
    document.getElementById('o2').textContent = '₹' + rate;
    document.getElementById('o3').textContent = staff;
    document.getElementById('res').textContent = '₹' + format(moneySaved);
    document.getElementById('res2').textContent = format(hoursSaved) + ' hrs';
  }

  calc.querySelectorAll('input').forEach(function (input) {
    input.addEventListener('input', update);
  });
  update();
})();

/* ---------- 7. FORMS ---------- */
/**
 * forms.js
 * Front-end handling for forms marked with [data-form].
 * Shows the success message and resets the form.
 *
 * TODO: send the data to your backend, e.g.
 *   fetch('/api/contact', { method: 'POST', body: new FormData(form) })
 */
(function () {
  'use strict';

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var message = form.querySelector('.ok') || form.parentNode.querySelector('.ok');
      if (message) message.style.display = 'block';

      form.reset();
    });
  });
})();