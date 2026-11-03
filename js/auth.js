/**
 * Stackly - auth.js
 * Login + Sign-up (front-end demo). Accounts live in localStorage ("stacklyUsers"),
 * the active session in sessionStorage ("stacklyAuth").
 * NOTE: replace with a real backend / hashed passwords before going live.
 */
(function () {
  'use strict';

  var USERS = 'stacklyUsers';
  var SESSION = 'stacklyAuth';
  var ADMIN_CODE = 'STACKLY2026';
  var HOME = { admin: 'admin-dashboard.html', employee: 'employee-dashboard.html' };

  var NAME_RE = /^[A-Za-z ]{2,16}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var PHONE_RE = /^[6-9]\d{9}$/;
  var PASS_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  var SEED = [
    { name: 'Admin', email: 'admin@stackly.in', phone: '9876543210', role: 'admin', password: 'Admin@123', status: 'Active', joined: '2026-01-10' },
    { name: 'Priya', email: 'priya@stackly.in', phone: '9845012345', role: 'employee', password: 'Emp@12345', status: 'Active', joined: '2026-02-18' }
  ];

  /* ---------- storage helpers ---------- */
  function getUsers() {
    try {
      var list = JSON.parse(localStorage.getItem(USERS));
      if (Array.isArray(list) && list.length) return list;
    } catch (e) { /* fall through to seed */ }
    localStorage.setItem(USERS, JSON.stringify(SEED));
    return SEED.slice();
  }

  function saveUsers(list) { localStorage.setItem(USERS, JSON.stringify(list)); }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch (e) { return null; }
  }

  /* ---------- UI helpers ---------- */
  function $(sel) { return document.querySelector(sel); }

  function selectedRole(form) {
    var r = form.querySelector('input[name="role"]:checked');
    return r ? r.value : 'admin';
  }

  function setError(input, message) {
    var field = input.closest('.fld');
    if (!field) return;
    var err = field.querySelector('.err');
    field.classList.toggle('bad', !!message);
    if (err) err.textContent = message || '';
  }

  function banner(type, text) {
    var box = $('#alert');
    box.className = 'alert show ' + type;
    box.textContent = text;
  }

  function bindPasswordToggles() {
    document.querySelectorAll('.pw button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.parentNode.querySelector('input');
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Hide' : 'Show';
      });
    });
  }

  function clearOnInput(form) {
    form.querySelectorAll('input, select').forEach(function (el) {
      el.addEventListener('input', function () { setError(el, ''); });
    });
  }

  /* ==========================================================================
     LOGIN
     ========================================================================== */
  function initLogin(form) {
    var email = $('#email');
    var pass = $('#password');
    var params = new URLSearchParams(location.search);

    var existing = getSession();
    if (existing && HOME[existing.role]) { location.replace(HOME[existing.role]); return; }

    getUsers(); // make sure demo accounts exist

    if (params.get('registered') === '1') {
      banner('ok', 'Account created successfully. Please log in to continue.');
      if (params.get('email')) email.value = params.get('email');
      var r = form.querySelector('input[name="role"][value="' + params.get('role') + '"]');
      if (r) r.checked = true;
      pass.focus();
    }

    if (params.get('next') === 'expired') banner('err', 'Please log in to open the dashboard.');

    $('#fillDemo').addEventListener('click', function () {
      var role = selectedRole(form);
      email.value = role === 'admin' ? 'admin@stackly.in' : 'priya@stackly.in';
      pass.value = role === 'admin' ? 'Admin@123' : 'Emp@12345';
      setError(email, ''); setError(pass, '');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $('#alert').className = 'alert';

      var role = selectedRole(form);
      var mail = email.value.trim().toLowerCase();
      var ok = true;

      if (!EMAIL_RE.test(mail)) { setError(email, 'Enter a valid email address.'); ok = false; }
      if (!pass.value) { setError(pass, 'Enter your password.'); ok = false; }
      if (!ok) return;

      var user = getUsers().filter(function (u) { return u.email.toLowerCase() === mail; })[0];

      if (!user || user.password !== pass.value) {
        banner('err', 'Incorrect email or password. Please try again.');
        return;
      }
      if (user.role !== role) {
        banner('err', 'This account is registered as ' + (user.role === 'admin' ? 'an Admin' : 'an Employee') +
          '. Please choose the "' + (user.role === 'admin' ? 'Admin' : 'Employee') + '" option above.');
        return;
      }
      if (user.status === 'Inactive') {
        banner('err', 'Your account is deactivated. Please contact your administrator.');
        return;
      }

      sessionStorage.setItem(SESSION, JSON.stringify({
        name: user.name, email: user.email, role: user.role, at: Date.now()
      }));

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      location.href = HOME[user.role];
    });

    clearOnInput(form);
  }

  /* ==========================================================================
     SIGN UP
     ========================================================================== */
  function initSignup(form) {
    var f = {
      name: $('#name'), email: $('#email'), phone: $('#phone'),
      code: $('#code'), pass: $('#password'), pass2: $('#password2'), terms: $('#terms')
    };
    var codeField = $('#codeField');

    function syncRole() {
      var admin = selectedRole(form) === 'admin';
      codeField.style.display = admin ? 'block' : 'none';
      if (!admin) { f.code.value = ''; setError(f.code, ''); }
    }

    form.querySelectorAll('input[name="role"]').forEach(function (r) { r.addEventListener('change', syncRole); });
    syncRole();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $('#alert').className = 'alert';

      var role = selectedRole(form);
      var name = f.name.value.trim();
      var mail = f.email.value.trim().toLowerCase();
      var ok = true;

      if (!NAME_RE.test(name)) { setError(f.name, 'Use letters only, 2–16 characters.'); ok = false; }
      if (!EMAIL_RE.test(mail)) { setError(f.email, 'Enter a valid email address.'); ok = false; }
      if (!PHONE_RE.test(f.phone.value.trim())) { setError(f.phone, 'Enter a 10-digit mobile number starting with 6–9.'); ok = false; }
      if (role === 'admin' && f.code.value.trim() !== ADMIN_CODE) { setError(f.code, 'Invalid admin access code.'); ok = false; }
      if (!PASS_RE.test(f.pass.value)) { setError(f.pass, 'Minimum 8 characters with at least one letter and one number.'); ok = false; }
      if (f.pass2.value !== f.pass.value || !f.pass2.value) { setError(f.pass2, 'Passwords do not match.'); ok = false; }
      if (!f.terms.checked) { banner('err', 'Please accept the Terms & Privacy Policy to continue.'); ok = false; }
      if (!ok) return;

      var users = getUsers();
      var taken = users.some(function (u) { return u.email.toLowerCase() === mail; });
      if (taken) { setError(f.email, 'An account with this email already exists.'); return; }

      users.push({
        name: name, email: mail, phone: f.phone.value.trim(), role: role, password: f.pass.value,
        status: 'Active', joined: new Date().toISOString().slice(0, 10)
      });
      saveUsers(users);

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      banner('ok', 'Account created! Redirecting you to the login page…');

      setTimeout(function () {
        location.href = 'login.html?registered=1&role=' + role + '&email=' + encodeURIComponent(mail);
      }, 1400);
    });

    clearOnInput(form);
  }

  /* ---------- boot ---------- */
  bindPasswordToggles();
  var loginForm = $('#loginForm');
  var signupForm = $('#signupForm');
  if (loginForm) initLogin(loginForm);
  if (signupForm) initSignup(signupForm);
})();