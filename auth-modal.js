/* =========================================================
   auth-modal.js — ฟอร์ม เຂົ້າສູ່ລະບົບ / ສະໝັກສະມາຊິກ ແບບເລື່ອນຂຶ້ນມາ (ແທນໜ້າ login.html / signup.html ເດີມ)
   - ໂຫລດຜ່ານ theme.js ທຸກໜ້າ
   - ກົດປຸ່ມ .login-btn (ຕອນຍັງບໍ່ລ໋ອກອິນ) ຫຼື ລິ້ງໄປ login.html/signup.html → ເປີດ modal ແທນການເດັ້ງໄປໜ້າອື່ນ
   - ໜ້າທີ່ຖືກ redirect ມາຈາກ login.html/signup.html ຈະມີ ?auth=login|signup&next=... → ເປີດ modal ອັດຕະໂນມັດ
   - ຍິງ /api/auth/login { username, password } ແລະ /api/auth/signup { username, email?, password }
   ========================================================= */
(function () {
  if (window.AuthModal) return;

  var ov, tabs, views, toastEl, toastTimer, swapTimer, nextPath = '', built = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* กัน open-redirect: รับเฉพาะ path ภายในเว็บ */
  function safeNext(raw) {
    if (typeof raw !== 'string' || !raw) return '';
    if (raw.indexOf(':') !== -1 || raw.indexOf('//') === 0 || raw.indexOf('\\') !== -1) return '';
    if (raw.charAt(0) !== '/') raw = '/' + raw;
    return raw;
  }

  var ICON_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="11" width="16" height="9" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10.5 7 10.5 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 1.5 12S5.5 19 12 19a10 10 0 0 0 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  var BOLT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>';

  function field(id, key, label, icon, input, err, eye) {
    return '<div class="am-field" data-f="' + key + '"><label for="' + id + '">' + label + '</label>' +
      '<div class="am-fi">' + icon + input + (eye ? '<button type="button" class="am-eye" aria-label="ສະແດງລະຫັດຜ່ານ">' + EYE_ON + '</button>' : '') + '</div>' +
      '<div class="am-ferr">' + err + '</div></div>';
  }

  function build() {
    if (built) return;
    built = true;

    ov = document.createElement('div');
    ov.className = 'am-ov';
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML =
      '<div class="am-panel" role="dialog" aria-modal="true" aria-label="ເຂົ້າສູ່ລະບົບ / ສະໝັກສະມາຊິກ">' +
        '<div class="am-head"><div class="am-logo" id="am-logo">' + BOLT + '</div><div class="am-brand" id="am-brand"></div></div>' +
        '<div class="am-body">' +
          '<div class="am-tabs" id="am-tabs" data-active="login"><div class="am-pill"></div>' +
            '<button type="button" class="am-tab am-on" data-tab="login">ເຂົ້າສູ່ລະບົບ</button>' +
            '<button type="button" class="am-tab" data-tab="signup">ສະໝັກສະມາຊິກ</button></div>' +
          '<div class="am-views" id="am-views">' +
            '<form class="am-view am-on" id="am-v-login" novalidate>' +
              field('am-l-user', 'l-user', 'ຊື່ຜູ້ໃຊ້', ICON_USER, '<input id="am-l-user" placeholder="ຊື່ຜູ້ໃຊ້" autocomplete="username" autocapitalize="none" spellcheck="false">', 'ກະລຸນາໃສ່ຊື່ຜູ້ໃຊ້') +
              field('am-l-pass', 'l-pass', 'ລະຫັດຜ່ານ', ICON_LOCK, '<input id="am-l-pass" type="password" placeholder="ລະຫັດຜ່ານ" autocomplete="current-password">', 'ກະລຸນາໃສ່ລະຫັດຜ່ານ', true) +
              '<button type="submit" class="am-submit"><span>ເຂົ້າສູ່ລະບົບ</span>' + ARROW + '</button>' +
              '<div class="am-switch">ຍັງບໍ່ມີບັນຊີ? <button type="button" data-tab="signup">ສະໝັກສະມາຊິກ</button></div>' +
            '</form>' +
            '<form class="am-view" id="am-v-signup" novalidate>' +
              field('am-s-user', 's-user', 'ຊື່ຜູ້ໃຊ້', ICON_USER, '<input id="am-s-user" placeholder="ຊື່ຜູ້ໃຊ້" autocomplete="username" autocapitalize="none" spellcheck="false">', 'ຊື່ຜູ້ໃຊ້ຕ້ອງມີ 3–24 ໂຕ ແລະ ບໍ່ມີ @') +
              field('am-s-mail', 's-mail', 'ອີເມວ (ຖ້າມີ)', ICON_MAIL, '<input id="am-s-mail" type="email" placeholder="name@example.com (ບໍ່ບັງຄັບ)" autocomplete="email">', 'ຮູບແບບອີເມວບໍ່ຖືກຕ້ອງ') +
              field('am-s-pass', 's-pass', 'ລະຫັດຜ່ານ', ICON_LOCK, '<input id="am-s-pass" type="password" placeholder="ຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ" autocomplete="new-password">', 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ', true) +
              field('am-s-pass2', 's-pass2', 'ຢືນຢັນລະຫັດຜ່ານ', ICON_LOCK, '<input id="am-s-pass2" type="password" placeholder="ຢືນຢັນລະຫັດຜ່ານ" autocomplete="new-password">', 'ລະຫັດຜ່ານບໍ່ກົງກັນ', true) +
              '<button type="submit" class="am-submit"><span>ສ້າງບັນຊີ</span>' + ARROW + '</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    toastEl = document.createElement('div');
    toastEl.className = 'am-toast';
    document.body.appendChild(toastEl);

    tabs = $('#am-tabs'); views = $('#am-views');

    $$('.am-eye', ov).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = b.parentNode.querySelector('input'), show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.innerHTML = show ? EYE_OFF : EYE_ON;
      });
    });
    $$('[data-tab]', ov).forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); }); });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    $$('.am-field input', ov).forEach(function (i) { i.addEventListener('input', function () { i.closest('.am-field').classList.remove('am-err'); }); });
    $('#am-v-login').addEventListener('submit', onLogin);
    $('#am-v-signup').addEventListener('submit', onSignup);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('am-open')) close(); });
  }

  function brandInfo() {
    var name = '', logo = '';
    var n = document.querySelector('header .brand-name, .brand-name');
    if (n) name = (n.textContent || '').trim();
    var img = document.querySelector('header .logo img');
    if (img) logo = img.getAttribute('src') || '';
    $('#am-brand').textContent = name;
    if (logo) {
      var box = $('#am-logo');
      box.innerHTML = '';
      var im = document.createElement('img');
      im.alt = name || 'logo';
      im.src = logo;
      im.onerror = function () { box.innerHTML = BOLT; };
      box.appendChild(im);
    }
  }

  function setTab(name, instant) {
    tabs.setAttribute('data-active', name);
    $$('.am-tab', tabs).forEach(function (b) { b.classList.toggle('am-on', b.getAttribute('data-tab') === name); });
    var next = $('#am-v-' + name), prev = $('.am-view.am-on', views);
    if (instant || !prev || prev === next) {
      $$('.am-view', views).forEach(function (v) { v.classList.remove('am-on', 'am-leaving'); });
      next.classList.add('am-on'); views.style.height = ''; views.classList.remove('am-anim');
      return;
    }
    var h0 = views.offsetHeight;
    views.style.height = '';
    $$('.am-view.am-leaving', views).forEach(function (v) { v.classList.remove('am-leaving'); });
    prev.classList.remove('am-on'); prev.classList.add('am-leaving');
    next.classList.add('am-on');
    var h1 = views.offsetHeight;
    views.classList.add('am-anim');
    views.style.height = h0 + 'px';
    void views.offsetHeight;
    views.style.height = h1 + 'px';
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      prev.classList.remove('am-leaving'); views.style.height = ''; views.classList.remove('am-anim');
    }, 580);
  }

  function open(tab, next) {
    build();
    nextPath = safeNext(next || '');
    brandInfo();
    ov.classList.add('am-open'); ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTab(tab === 'signup' ? 'signup' : 'login', true);
  }
  function close() {
    if (!ov) return;
    ov.classList.remove('am-open'); ov.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function toast(msg, bad) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('am-bad', !!bad);
    toastEl.classList.add('am-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('am-show'); }, 3000);
  }
  function flag(key, bad) { $('[data-f="' + key + '"]', ov).classList.toggle('am-err', bad); return bad; }

  function send(url, payload, form, busyText) {
    var btn = $('.am-submit', form), label = $('span', btn), old = label.textContent;
    btn.disabled = true; label.textContent = busyText;
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່');
        });
      })
      .then(function () {
        var dest = nextPath;
        if (dest && dest !== location.pathname + location.search) location.href = dest;
        else location.reload();
      })
      .catch(function (err) {
        toast(err.message || 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່', true);
        btn.disabled = false; label.textContent = old;
      });
  }

  function onLogin(e) {
    e.preventDefault();
    var u = $('#am-l-user').value.trim(), p = $('#am-l-pass').value;
    var a = flag('l-user', !u), b = flag('l-pass', !p);
    if (a || b) return;
    send('/api/auth/login', { username: u, password: p }, e.target, 'ກຳລັງເຂົ້າສູ່ລະບົບ...');
  }
  function onSignup(e) {
    e.preventDefault();
    var u = $('#am-s-user').value.trim(), m = $('#am-s-mail').value.trim(), p = $('#am-s-pass').value, p2 = $('#am-s-pass2').value;
    var bad = [
      flag('s-user', u.length < 3 || u.length > 24 || u.indexOf('@') !== -1),
      flag('s-mail', m !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)),
      flag('s-pass', p.length < 6),
      flag('s-pass2', !p2 || p2 !== p)
    ];
    if (bad.some(Boolean)) return;
    send('/api/auth/signup', { username: u, email: m, password: p }, e.target, 'ກຳລັງສ້າງບັນຊີ...');
  }

  /* ---- ດັກການກົດ: ປຸ່ມລ໋ອກອິນໃນ header + ລິ້ງໄປ login.html/signup.html ---- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('button.login-btn');
    if (btn && !btn.classList.contains('is-authed')) {
      e.preventDefault(); e.stopImmediatePropagation();
      open('login', '');
      return;
    }
    var a = t.closest('a[href]');
    if (a) {
      var m = (a.getAttribute('href') || '').match(/(?:^|\/)(login|signup)\.html(?:\?([^#]*))?(?:#.*)?$/);
      if (m) {
        e.preventDefault(); e.stopImmediatePropagation();
        var q = new URLSearchParams(m[2] || '');
        open(m[1], q.get('next') || '');
      }
    }
  }, true);

  window.AuthModal = { open: open, close: close };

  /* ---- เปิดอัตโนมัติเมื่อถูก redirect มาจาก login.html / signup.html ---- */
  function autoOpen() {
    var q = new URLSearchParams(location.search), mode = q.get('auth');
    if (mode === 'login' || mode === 'signup') {
      var nx = q.get('next') || '';
      q.delete('auth'); q.delete('next');
      var rest = q.toString();
      try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (_) {}
      open(mode, nx);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoOpen);
  else autoOpen();
})();
