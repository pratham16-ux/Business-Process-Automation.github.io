/**
 * Stackly - dashboard.js
 * Shared logic for admin-dashboard.html and employee-dashboard.html.
 * Contents: 1 Helpers  2 Session & shell  3 Charts  4 Profile  5 Admin  6 Employee
 * Data is kept in localStorage (demo). Swap get()/set() for API calls when a backend exists.
 */
(function () {
  'use strict';

  var SESSION = 'stacklyAuth';
  var ROLE = document.body.dataset.role;

  /* ==========================================================================
     1. HELPERS
     ========================================================================== */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function initial(n) { return (n || '?').trim().charAt(0).toUpperCase(); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var NAME_RE = /^[A-Za-z ]{2,16}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var PHONE_RE = /^[6-9]\d{9}$/;
  var PASS_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  function toast(msg, bad) {
    var wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'toast' + (bad ? ' err' : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  /** Modal form. onOk(form) returns true to close, or an error string to keep it open. */
  function modal(title, html, onOk, okLabel, danger) {
    var m = document.createElement('div');
    m.className = 'mdl';
    m.innerHTML =
      '<form class="mbox" novalidate><div class="mh"><h3>' + title + '</h3><button type="button" class="x" aria-label="Close">×</button></div>' +
      '<div class="mb">' + html + '<div class="merr"></div></div>' +
      '<div class="mf"><button type="button" class="btn btn-l btn-sm" data-c>Cancel</button>' +
      '<button class="btn ' + (danger ? 'btn-r' : 'btn-p') + ' btn-sm">' + (okLabel || 'Save') + '</button></div></form>';
    document.body.appendChild(m);

    function close() { m.remove(); document.removeEventListener('keydown', esc2); }
    function esc2(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc2);

    $('.x', m).onclick = close;
    $('[data-c]', m).onclick = close;
    m.addEventListener('mousedown', function (e) { if (e.target === m) close(); });
    $('form', m).onsubmit = function (e) {
      e.preventDefault();
      var r = onOk(e.target);
      if (r === true) close(); else $('.merr', m).textContent = r || '';
    };
    var first = $('input, select, textarea', m);
    if (first) first.focus();
  }

  function confirmBox(text, onYes, label) {
    modal('Please confirm', '<p>' + text + '</p>', function () { onYes(); return true; }, label || 'Yes, continue', true);
  }

  function downloadCSV(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function countUp(el, target, fmt) {
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / 700, 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ==========================================================================
     2. SESSION & SHELL
     ========================================================================== */
  var sess;
  try { sess = JSON.parse(sessionStorage.getItem(SESSION)); } catch (e) { sess = null; }
  if (!sess) { location.replace('login.html?next=expired'); return; }
  if (sess.role !== ROLE) {
    location.replace(sess.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html');
    return;
  }

  function users() { return get('stacklyUsers', []); }
  function me() { return users().filter(function (u) { return u.email === sess.email; })[0] || sess; }
  function log(text) {
    var l = get('stacklyLog', []);
    l.unshift({ t: text, d: Date.now() });
    set('stacklyLog', l.slice(0, 30));
  }
  function ago(ts) {
    var m = Math.max(1, Math.round((Date.now() - ts) / 60000));
    return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago';
  }

  /* ----- seed data ----- */
  function workflows() {
    var w = get('stacklyWorkflows', null);
    if (w) return w;
    w = [
      { id: 'w1', name: 'Invoice approval', dept: 'Finance', runs: 1240, status: 'Active' },
      { id: 'w2', name: 'Employee onboarding', dept: 'HR', runs: 312, status: 'Active' },
      { id: 'w3', name: 'Purchase order routing', dept: 'Procurement', runs: 586, status: 'Active' },
      { id: 'w4', name: 'Support ticket triage', dept: 'Support', runs: 2210, status: 'Active' },
      { id: 'w5', name: 'Leave management', dept: 'HR', runs: 428, status: 'Paused' },
      { id: 'w6', name: 'Vendor KYC check', dept: 'Finance', runs: 164, status: 'Active' }
    ];
    set('stacklyWorkflows', w);
    return w;
  }
  function requests() {
    var r = get('stacklyRequests', null);
    if (r) return r;
    r = [
      { id: 'r1', by: 'Priya', email: 'priya@stackly.in', type: 'Leave', amount: 0, note: 'Family function, 2 days', status: 'Pending', date: today() },
      { id: 'r2', by: 'Priya', email: 'priya@stackly.in', type: 'Expense', amount: 4850, note: 'Client visit - Bengaluru to Mysuru', status: 'Approved', date: today() }
    ];
    set('stacklyRequests', r);
    return r;
  }

  /* ----- shell: nav, search, popovers, logout ----- */
  var titles = {};
  $$('.nv[data-view]').forEach(function (b) { titles[b.dataset.view] = b.textContent.trim().replace(/\d+$/, ''); });
  var renderers = {};

  function showView(name) {
    if (!$('#v-' + name)) name = $('.nv[data-view]').dataset.view;
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + name); });
    $$('.nv[data-view]').forEach(function (b) { b.classList.toggle('on', b.dataset.view === name); });
    $('#vt').textContent = titles[name] || name;
    $('#q').value = ''; filterRows('');
    closeSide();
    window.scrollTo(0, 0);
    if (renderers[name]) renderers[name]();
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  }

  function openSide() { $('#side').classList.add('open'); $('#scrim').classList.add('on'); }
  function closeSide() { $('#side').classList.remove('open'); $('#scrim').classList.remove('on'); }

  function filterRows(q) {
    q = q.trim().toLowerCase();
    $$('.view.on tbody tr, .view.on .task').forEach(function (el) {
      el.style.display = !q || el.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
    });
  }

  function closePops() { $$('.pop.on').forEach(function (p) { p.classList.remove('on'); }); }

  function paintUser() {
    var u = me();
    $$('.uName').forEach(function (el) { el.textContent = u.name; });
    $$('.uAv').forEach(function (el) { el.textContent = initial(u.name); });
  }

  function initShell() {
    paintUser();

    $$('.nv[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.view); });
    });
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { closePops(); showView(b.dataset.go); });
    });
    $$('[data-logout]').forEach(function (b) {
      b.addEventListener('click', function () { sessionStorage.removeItem(SESSION); location.href = 'login.html'; });
    });

    $('#sbtn').addEventListener('click', openSide);
    $('#scrim').addEventListener('click', closeSide);
    $('#q').addEventListener('input', function (e) { filterRows(e.target.value); });

    [['#bellBtn', '#bell'], ['#umBtn', '#um']].forEach(function (pair) {
      $(pair[0]).addEventListener('click', function (e) {
        e.stopPropagation();
        var pop = $(pair[1]), was = pop.classList.contains('on');
        closePops();
        if (!was) { pop.classList.add('on'); if (pair[1] === '#bell') renderBell(); }
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.pop')) closePops(); });
    window.addEventListener('hashchange', function () { showView(location.hash.slice(1)); });

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawCharts, 150); });
  }

  /* ----- bell ----- */
  function renderBell() {
    var box = $('#bellList'), items = [], badge = 0;
    if (ROLE === 'admin') {
      var pend = requests().filter(function (r) { return r.status === 'Pending'; });
      badge = pend.length;
      items = pend.map(function (r) { return { t: r.by + ' requested ' + r.type.toLowerCase(), s: 'Awaiting your approval', go: 'approvals' }; });
    } else {
      var mine = requests().filter(function (r) { return r.email === sess.email && r.status !== 'Pending'; });
      var seen = get('stacklySeen:' + sess.email, []);
      badge = mine.filter(function (r) { return seen.indexOf(r.id + r.status) < 0; }).length;
      items = mine.map(function (r) { return { t: 'Your ' + r.type.toLowerCase() + ' request was ' + r.status.toLowerCase(), s: r.note, go: 'requests' }; });
    }
    $('#bellDot').textContent = badge || '';
    box.innerHTML = items.length
      ? items.slice(0, 6).map(function (i) { return '<button class="pi" data-go="' + i.go + '">' + esc(i.t) + '<small>' + esc(i.s) + '</small></button>'; }).join('')
      : '<div class="pe">You are all caught up 🎉</div>';
    $$('[data-go]', box).forEach(function (b) { b.addEventListener('click', function () { closePops(); showView(b.dataset.go); }); });
  }

  /* ==========================================================================
     3. CHARTS (canvas, no libraries)
     ========================================================================== */
  var chartJobs = [];
  var COLORS = ['#6D5EF5', '#22D3EE', '#E8C27A', '#F97316', '#10B981', '#EC4899'];

  function setupCanvas(cv) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    return { c: c, w: w, h: h };
  }

  function barChart(cv, labels, vals) {
    var s = setupCanvas(cv); if (!s.w) return;
    var c = s.c, max = Math.max.apply(null, vals.concat([1])) * 1.15, top = 14, bot = 28, left = 34;
    var ph = s.h - top - bot, slot = (s.w - left) / vals.length, bw = Math.min(40, slot * 0.55);
    c.font = '12px Inter, sans-serif'; c.textAlign = 'center';
    for (var g = 0; g <= 4; g++) {
      var y = top + ph - (ph * g / 4);
      c.strokeStyle = 'rgba(20,28,60,.08)'; c.beginPath(); c.moveTo(left, y); c.lineTo(s.w, y); c.stroke();
      c.fillStyle = '#8a91b0'; c.textAlign = 'right'; c.fillText(Math.round(max * g / 4), left - 6, y + 4);
    }
    c.textAlign = 'center';
    vals.forEach(function (v, i) {
      var bh = ph * v / max, x = left + slot * i + (slot - bw) / 2, y = top + ph - bh;
      var grad = c.createLinearGradient(0, y, 0, y + bh); grad.addColorStop(0, '#6D5EF5'); grad.addColorStop(1, '#22D3EE');
      c.fillStyle = grad; c.beginPath();
      if (c.roundRect) c.roundRect(x, y, bw, bh, [8, 8, 0, 0]); else c.rect(x, y, bw, bh);
      c.fill();
      c.fillStyle = '#5B6280'; c.fillText(labels[i], x + bw / 2, s.h - 8);
    });
  }

  function donutChart(cv, parts, legendEl) {
    var s = setupCanvas(cv); if (!s.w) return;
    var c = s.c, total = parts.reduce(function (a, p) { return a + p.v; }, 0) || 1;
    var cx = s.w / 2, cy = s.h / 2, R = Math.min(cx, cy) - 8, a0 = -Math.PI / 2;
    parts.forEach(function (p, i) {
      var a1 = a0 + (p.v / total) * Math.PI * 2;
      c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, R * 0.62, a1, a0, true); c.closePath();
      c.fillStyle = COLORS[i % COLORS.length]; c.fill(); a0 = a1;
    });
    c.fillStyle = '#0A0F24'; c.font = '800 26px "Plus Jakarta Sans", sans-serif'; c.textAlign = 'center';
    c.fillText(total, cx, cy + 4);
    c.fillStyle = '#5B6280'; c.font = '12px Inter, sans-serif'; c.fillText('total', cx, cy + 22);
    legendEl.innerHTML = parts.map(function (p, i) {
      return '<span><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + esc(p.l) + ' (' + p.v + ')</span>';
    }).join('');
  }

  function drawCharts() { chartJobs.forEach(function (j) { j(); }); }

  /* ==========================================================================
     4. PROFILE (shared) — profile form + change password
     ========================================================================== */
  function msg(el, text, ok) { el.textContent = text; el.className = 'fmsg ' + (ok ? 'ok' : 'err'); }

  function initProfile() {
    var form = $('#profForm'), pw = $('#pwForm');
    if (!form) return;

    function fill() {
      var u = me();
      $('#pName').value = u.name; $('#pPhone').value = u.phone || ''; $('#pEmail').value = u.email;
      $('#pRole').value = ROLE === 'admin' ? 'Admin' : 'Employee';
    }
    renderers[form.closest('.view').id.slice(2)] = fill;
    fill();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#pName').value.trim(), phone = $('#pPhone').value.trim(), out = $('#profMsg');
      if (!NAME_RE.test(name)) return msg(out, 'Name must be letters only, 2–16 characters.');
      if (!PHONE_RE.test(phone)) return msg(out, 'Enter a valid 10-digit mobile number starting with 6–9.');
      var list = users();
      list.forEach(function (u) { if (u.email === sess.email) { u.name = name; u.phone = phone; } });
      set('stacklyUsers', list);
      sess.name = name; sessionStorage.setItem(SESSION, JSON.stringify(sess));
      paintUser(); msg(out, 'Profile updated.', true); toast('Profile updated');
    });

    pw.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = $('#pwMsg'), list = users(), u = list.filter(function (x) { return x.email === sess.email; })[0];
      if (!u || u.password !== $('#pwOld').value) return msg(out, 'Current password is incorrect.');
      if (!PASS_RE.test($('#pwNew').value)) return msg(out, 'New password needs 8+ characters with a letter and a number.');
      if ($('#pwNew').value !== $('#pwNew2').value) return msg(out, 'New passwords do not match.');
      u.password = $('#pwNew').value; set('stacklyUsers', list);
      pw.reset(); msg(out, 'Password changed successfully.', true); toast('Password changed');
    });
  }

  /* ==========================================================================
     5. ADMIN
     ========================================================================== */
  function initAdmin() {
    var range = '7';
    var RANGES = {
      '7': { l: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], v: [320, 410, 380, 520, 470, 210, 260] },
      '30': { l: ['W1', 'W2', 'W3', 'W4'], v: [2100, 2480, 2290, 2760] },
      '90': { l: ['Aug', 'Sep', 'Oct'], v: [8200, 9100, 9870] }
    };

    function pendingCount() { return requests().filter(function (r) { return r.status === 'Pending'; }).length; }

    function overview() {
      var wf = workflows(), runs = wf.reduce(function (a, w) { return a + w.runs; }, 0);
      var active = wf.filter(function (w) { return w.status === 'Active'; }).length;
      countUp($('#k1'), users().length, String);
      countUp($('#k2'), active, String);
      countUp($('#k3'), pendingCount(), String);
      countUp($('#k4'), runs * 45, inr);
      drawCharts();
      var l = get('stacklyLog', []);
      $('#feed').innerHTML = l.length
        ? l.slice(0, 8).map(function (x) { return '<li><i></i><div>' + esc(x.t) + '<small>' + ago(x.d) + '</small></div></li>'; }).join('')
        : '<li><i></i><div>No activity yet<small>Actions you take will appear here</small></div></li>';
    }
    renderers.overview = overview;

    chartJobs.push(function () {
      if (!$('#v-overview').classList.contains('on')) return;
      barChart($('#cBar'), RANGES[range].l, RANGES[range].v);
      var depts = {};
      workflows().forEach(function (w) { depts[w.dept] = (depts[w.dept] || 0) + 1; });
      donutChart($('#cDon'), Object.keys(depts).map(function (k) { return { l: k, v: depts[k] }; }), $('#legend'));
    });

    $$('#rangeSeg button').forEach(function (b) {
      b.addEventListener('click', function () {
        range = b.dataset.r;
        $$('#rangeSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
        drawCharts();
      });
    });

    /* ----- users ----- */
    function renderUsers() {
      var f = $('#roleF').value;
      var list = users().filter(function (u) { return f === 'all' || u.role === f; });
      $('#uBody').innerHTML = list.length ? list.map(function (u) {
        var self = u.email === sess.email;
        return '<tr><td><div class="who2"><div class="av">' + initial(u.name) + '</div><div><b>' + esc(u.name) + '</b>' + (self ? ' <small>(you)</small>' : '') + '<br><small>' + esc(u.email) + '</small></div></div></td>' +
          '<td>' + esc(u.phone || '-') + '</td><td><span class="tg info">' + (u.role === 'admin' ? 'Admin' : 'Employee') + '</span></td>' +
          '<td><span class="tg ' + (u.status === 'Inactive' ? 'bad' : 'ok') + '">' + (u.status || 'Active') + '</span></td><td>' + esc(u.joined || '-') + '</td>' +
          '<td><div class="acts">' + (self ? '<small>-</small>' :
            '<button class="btn btn-l btn-xs" data-act="tog" data-id="' + esc(u.email) + '">' + (u.status === 'Inactive' ? 'Activate' : 'Deactivate') + '</button>' +
            '<button class="btn btn-r btn-xs" data-act="del" data-id="' + esc(u.email) + '">Delete</button>') + '</div></td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">No users found.</td></tr>';
    }
    renderers.users = renderUsers;
    $('#roleF').addEventListener('change', renderUsers);

    $('#uBody').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var list = users(), u = list.filter(function (x) { return x.email === b.dataset.id; })[0];
      if (!u) return;
      if (b.dataset.act === 'tog') {
        u.status = u.status === 'Inactive' ? 'Active' : 'Inactive';
        set('stacklyUsers', list); log(u.name + ' was ' + (u.status === 'Active' ? 'activated' : 'deactivated'));
        toast(u.name + ' is now ' + u.status); renderUsers();
      } else {
        confirmBox('Delete <b>' + esc(u.name) + '</b>? This cannot be undone.', function () {
          set('stacklyUsers', list.filter(function (x) { return x.email !== u.email; }));
          log(u.name + ' was removed'); toast('User deleted'); renderUsers();
        }, 'Delete');
      }
    });

    $('#addUser').addEventListener('click', function () {
      modal('Add user',
        '<label>Full name<input name="n" maxlength="16" placeholder="Letters only"></label>' +
        '<label>Email<input name="e" type="email" placeholder="name@company.com"></label>' +
        '<label>Mobile<input name="p" type="tel" maxlength="10" inputmode="numeric" placeholder="10-digit number"></label>' +
        '<label>Role<select name="r"><option value="employee">Employee</option><option value="admin">Admin</option></select></label>' +
        '<label>Temporary password<input name="w" type="text" value="Welcome@123"></label>',
        function (f) {
          var n = f.n.value.trim(), em = f.e.value.trim().toLowerCase(), list = users();
          if (!NAME_RE.test(n)) return 'Name must be letters only, 2–16 characters.';
          if (!EMAIL_RE.test(em)) return 'Enter a valid email address.';
          if (!PHONE_RE.test(f.p.value.trim())) return 'Enter a valid 10-digit mobile number (starts with 6–9).';
          if (!PASS_RE.test(f.w.value)) return 'Password needs 8+ characters with a letter and a number.';
          if (list.some(function (u) { return u.email.toLowerCase() === em; })) return 'This email is already registered.';
          list.push({ name: n, email: em, phone: f.p.value.trim(), role: f.r.value, password: f.w.value, status: 'Active', joined: today() });
          set('stacklyUsers', list); log(n + ' was added as ' + f.r.value); toast('User added'); renderUsers();
          return true;
        }, 'Add user');
    });

    $('#expUsers').addEventListener('click', function () {
      var rows = [['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined']];
      users().forEach(function (u) { rows.push([u.name, u.email, u.phone || '', u.role, u.status || 'Active', u.joined || '']); });
      downloadCSV('stackly-users.csv', rows); toast('Users exported');
    });

    /* ----- workflows ----- */
    function renderWF() {
      var list = workflows();
      $('#wBody').innerHTML = list.length ? list.map(function (w) {
        return '<tr><td><b>' + esc(w.name) + '</b></td><td>' + esc(w.dept) + '</td><td>' + w.runs.toLocaleString('en-IN') + '</td>' +
          '<td><span class="tg ' + (w.status === 'Active' ? 'ok' : 'warn') + '">' + w.status + '</span></td>' +
          '<td><div class="acts"><button class="btn btn-p btn-xs" data-act="run" data-id="' + w.id + '"' + (w.status !== 'Active' ? ' disabled style="opacity:.5"' : '') + '>Run now</button>' +
          '<button class="btn btn-l btn-xs" data-act="tog" data-id="' + w.id + '">' + (w.status === 'Active' ? 'Pause' : 'Resume') + '</button>' +
          '<button class="btn btn-r btn-xs" data-act="del" data-id="' + w.id + '">Delete</button></div></td></tr>';
      }).join('') : '<tr><td colspan="5" class="empty">No workflows yet. Create your first one.</td></tr>';
    }
    renderers.workflows = renderWF;

    $('#wBody').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
      var list = workflows(), w = list.filter(function (x) { return x.id === b.dataset.id; })[0];
      if (!w) return;
      if (b.dataset.act === 'run') { w.runs += 1; set('stacklyWorkflows', list); log('Workflow "' + w.name + '" executed'); toast('"' + w.name + '" ran successfully'); }
      else if (b.dataset.act === 'tog') { w.status = w.status === 'Active' ? 'Paused' : 'Active'; set('stacklyWorkflows', list); log('Workflow "' + w.name + '" ' + w.status.toLowerCase()); toast(w.name + ': ' + w.status); }
      else {
        return confirmBox('Delete workflow <b>' + esc(w.name) + '</b>?', function () {
          set('stacklyWorkflows', list.filter(function (x) { return x.id !== w.id; })); log('Workflow "' + w.name + '" deleted'); toast('Workflow deleted'); renderWF();
        }, 'Delete');
      }
      renderWF();
    });

    $('#addWF').addEventListener('click', function () {
      modal('New workflow',
        '<label>Workflow name<input name="n" maxlength="40" placeholder="e.g. Expense reimbursement"></label>' +
        '<label>Department<select name="d"><option>Finance</option><option>HR</option><option>Procurement</option><option>Support</option><option>Operations</option></select></label>',
        function (f) {
          var n = f.n.value.trim();
          if (n.length < 3) return 'Please enter a workflow name (min 3 characters).';
          var list = workflows(); list.unshift({ id: uid(), name: n, dept: f.d.value, runs: 0, status: 'Active' });
          set('stacklyWorkflows', list); log('Workflow "' + n + '" created'); toast('Workflow created'); renderWF();
          return true;
        }, 'Create');
    });

    /* ----- approvals ----- */
    var apFilter = 'Pending';
    function renderAp() {
      var all = requests();
      var list = all.filter(function (r) { return apFilter === 'All' || r.status === 'Pending'; });
      $('#aBody').innerHTML = list.length ? list.map(function (r) {
        var cls = r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn';
        return '<tr><td><b>' + esc(r.by) + '</b><br><small>' + esc(r.date) + '</small></td><td>' + esc(r.type) + '</td>' +
          '<td>' + (r.amount ? inr(r.amount) : '-') + '</td><td>' + esc(r.note || '-') + '</td><td><span class="tg ' + cls + '">' + r.status + '</span></td>' +
          '<td>' + (r.status === 'Pending'
            ? '<div class="acts"><button class="btn btn-s btn-xs" data-act="Approved" data-id="' + r.id + '">Approve</button><button class="btn btn-r btn-xs" data-act="Rejected" data-id="' + r.id + '">Reject</button></div>'
            : '<small>Reviewed</small>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">Nothing to review. 🎉</td></tr>';
      var n = all.filter(function (r) { return r.status === 'Pending'; }).length;
      $('#nvAp').textContent = n || ''; $('#bellDot').textContent = n || '';
    }
    renderers.approvals = renderAp;

    $$('#apSeg button').forEach(function (b) {
      b.addEventListener('click', function () {
        apFilter = b.dataset.f;
        $$('#apSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
        renderAp();
      });
    });

    $('#aBody').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var list = requests(), r = list.filter(function (x) { return x.id === b.dataset.id; })[0];
      if (!r) return;
      r.status = b.dataset.act; set('stacklyRequests', list);
      log(r.by + '\'s ' + r.type.toLowerCase() + ' request ' + r.status.toLowerCase());
      toast('Request ' + r.status.toLowerCase()); renderAp();
    });

    /* ----- settings: reset demo ----- */
    $('#resetDemo').addEventListener('click', function () {
      confirmBox('Reset workflows, requests, tasks and activity to the demo defaults? User accounts are kept.', function () {
        Object.keys(localStorage).forEach(function (k) {
          if (/^stackly(Workflows|Requests|Log|Tasks|Seen)/.test(k)) localStorage.removeItem(k);
        });
        toast('Demo data reset'); showView('overview');
      }, 'Reset');
    });

    $('#nvAp').textContent = pendingCount() || '';
    $('#bellDot').textContent = pendingCount() || '';
  }

  /* ==========================================================================
     6. EMPLOYEE
     ========================================================================== */
  function initEmployee() {
    var TKEY = 'stacklyTasks:' + sess.email, tFilter = 'all';

    function tasks() {
      var t = get(TKEY, null);
      if (t) return t;
      t = [
        { id: 't1', title: 'Review vendor invoices - batch 14', due: today(), pri: 'High', done: false },
        { id: 't2', title: 'Update onboarding checklist', due: today(), pri: 'Medium', done: false },
        { id: 't3', title: 'Submit weekly status report', due: today(), pri: 'Low', done: true }
      ];
      set(TKEY, t);
      return t;
    }
    function mine() { return requests().filter(function (r) { return r.email === sess.email; }); }

    function overview() {
      var t = tasks(), open = t.filter(function (x) { return !x.done; }), r = mine();
      countUp($('#k1'), open.length, String);
      countUp($('#k2'), t.length - open.length, String);
      countUp($('#k3'), r.filter(function (x) { return x.status === 'Pending'; }).length, String);
      countUp($('#k4'), (t.length - open.length) * 2 + 14, function (n) { return n + ' hrs'; });
      drawCharts();
      var next = open.slice(0, 4);
      $('#upNext').innerHTML = next.length ? next.map(function (x) {
        return '<li><i></i><div>' + esc(x.title) + '<small>' + x.pri + ' priority · due ' + esc(x.due) + '</small></div></li>';
      }).join('') : '<li><i></i><div>All tasks completed<small>Nice work!</small></div></li>';
      renderBell();
    }
    renderers.overview = overview;

    chartJobs.push(function () {
      if (!$('#v-overview').classList.contains('on')) return;
      var t = tasks(), done = t.filter(function (x) { return x.done; }).length;
      barChart($('#cBar'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'], [3, 5, 2, 6, 4, 1, done]);
      var p = { High: 0, Medium: 0, Low: 0 };
      t.forEach(function (x) { if (!x.done) p[x.pri]++; });
      donutChart($('#cDon'), Object.keys(p).map(function (k) { return { l: k, v: p[k] }; }), $('#legend'));
    });

    /* ----- tasks ----- */
    function renderTasks() {
      var list = tasks().filter(function (x) { return tFilter === 'all' || (tFilter === 'done') === x.done; });
      $('#tList').innerHTML = list.length ? list.map(function (x) {
        return '<div class="task' + (x.done ? ' done' : '') + '"><input type="checkbox" data-act="chk" data-id="' + x.id + '"' + (x.done ? ' checked' : '') + ' aria-label="Mark done">' +
          '<div class="tt"><b>' + esc(x.title) + '</b><small>Due ' + esc(x.due) + '</small></div>' +
          '<span class="tg ' + (x.pri === 'High' ? 'bad' : x.pri === 'Medium' ? 'warn' : 'info') + '">' + x.pri + '</span>' +
          '<button class="btn btn-r btn-xs" data-act="del" data-id="' + x.id + '">Delete</button></div>';
      }).join('') : '<div class="empty">No tasks here yet.</div>';
    }
    renderers.tasks = renderTasks;

    $$('#tSeg button').forEach(function (b) {
      b.addEventListener('click', function () {
        tFilter = b.dataset.f;
        $$('#tSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
        renderTasks();
      });
    });

    $('#tList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var list = tasks(), t = list.filter(function (x) { return x.id === b.dataset.id; })[0];
      if (!t) return;
      if (b.dataset.act === 'chk') {
        t.done = b.checked; set(TKEY, list); log(sess.name + (t.done ? ' completed "' : ' reopened "') + t.title + '"');
        toast(t.done ? 'Task completed' : 'Task reopened'); renderTasks();
      } else if (b.dataset.act === 'del') {
        set(TKEY, list.filter(function (x) { return x.id !== t.id; })); toast('Task deleted'); renderTasks();
      }
    });

    $('#addTask').addEventListener('click', function () {
      modal('New task',
        '<label>Task title<input name="t" maxlength="60" placeholder="What needs to be done?"></label>' +
        '<label>Due date<input name="d" type="date" value="' + today() + '"></label>' +
        '<label>Priority<select name="p"><option>High</option><option selected>Medium</option><option>Low</option></select></label>',
        function (f) {
          if (f.t.value.trim().length < 3) return 'Please enter a task title (min 3 characters).';
          if (!f.d.value) return 'Please choose a due date.';
          var list = tasks(); list.unshift({ id: uid(), title: f.t.value.trim(), due: f.d.value, pri: f.p.value, done: false });
          set(TKEY, list); toast('Task added'); renderTasks();
          return true;
        }, 'Add task');
    });

    /* ----- requests ----- */
    function renderReq() {
      var list = mine();
      $('#rBody').innerHTML = list.length ? list.map(function (r) {
        var cls = r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn';
        return '<tr><td>' + esc(r.date) + '</td><td><b>' + esc(r.type) + '</b></td><td>' + (r.amount ? inr(r.amount) : '-') + '</td><td>' + esc(r.note || '-') +
          '</td><td><span class="tg ' + cls + '">' + r.status + '</span></td><td>' +
          (r.status === 'Pending' ? '<button class="btn btn-l btn-xs" data-act="cancel" data-id="' + r.id + '">Cancel</button>' : '<small>Closed</small>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">You have not raised any requests.</td></tr>';
      // mark decisions as seen when the page is opened
      set('stacklySeen:' + sess.email, mine().filter(function (r) { return r.status !== 'Pending'; }).map(function (r) { return r.id + r.status; }));
      renderBell();
    }
    renderers.requests = renderReq;

    $('#rBody').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      confirmBox('Cancel this request?', function () {
        set('stacklyRequests', requests().filter(function (r) { return r.id !== b.dataset.id; }));
        log(sess.name + ' cancelled a request'); toast('Request cancelled'); renderReq();
      }, 'Cancel request');
    });

    $('#addReq').addEventListener('click', function () {
      modal('New request',
        '<label>Type<select name="t"><option>Leave</option><option>Expense</option><option>Equipment</option><option>Access</option></select></label>' +
        '<label>Amount (₹, optional)<input name="a" type="number" min="0" step="1" placeholder="0"></label>' +
        '<label>Details<textarea name="n" rows="3" maxlength="120" placeholder="Short description"></textarea></label>',
        function (f) {
          if (f.n.value.trim().length < 5) return 'Please add a short description (min 5 characters).';
          var list = requests();
          list.unshift({ id: uid(), by: sess.name, email: sess.email, type: f.t.value, amount: Math.max(0, +f.a.value || 0), note: f.n.value.trim(), status: 'Pending', date: today() });
          set('stacklyRequests', list); log(sess.name + ' raised a ' + f.t.value.toLowerCase() + ' request');
          toast('Request submitted for approval'); renderReq();
          return true;
        }, 'Submit');
    });
  }

  /* ==========================================================================
     BOOT
     ========================================================================== */
  initShell();
  initProfile();
  if (ROLE === 'admin') initAdmin(); else initEmployee();
  showView(location.hash.slice(1) || 'overview');
})();