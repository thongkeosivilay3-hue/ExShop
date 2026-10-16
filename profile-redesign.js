/* profile-redesign.js — เสริมความลื่นไหลหน้าโปรไฟล์ (ไม่แก้ logic ของ profile.js)
   - แสงตามนิ้ว/เมาส์ + เอียงการ์ดยอดเงิน   - ปกเลื่อน parallax เบาๆ ตามเมาส์
   - ripple ตอนกดปุ่ม                        - meter ความแข็งแรงรหัสผ่าน */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && matchMedia('(hover: hover)').matches;
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- การ์ดยอดเงิน: แสง + เอียง ---------- */
  var wallet = $('.p-stat.wide');
  if (wallet && !reduce) {
    var raf = 0;
    wallet.addEventListener('pointermove', function (e) {
      var r = wallet.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        wallet.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        wallet.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (canHover) {
          wallet.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
          wallet.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        }
      });
    });
    wallet.addEventListener('pointerleave', function () {
      cancelAnimationFrame(raf);
      ['--rx', '--ry'].forEach(function (k) { wallet.style.setProperty(k, '0deg'); });
      wallet.style.setProperty('--mx', '85%'); wallet.style.setProperty('--my', '0%');
    });
  }

  /* ---------- ปก parallax (เฉพาะอุปกรณ์ที่มีเมาส์) ---------- */
  var hero = $('.p-hero'), cover = $('.p-cover');
  if (hero && cover && canHover && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      cover.style.setProperty('--cx', (((e.clientX - r.left) / r.width - 0.5) * -10).toFixed(1) + 'px');
    });
    hero.addEventListener('pointerleave', function () { cover.style.setProperty('--cx', '0px'); });
  }

  /* ---------- Ripple ---------- */
  if (!reduce) {
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var b = t.closest('.p-save:not(:disabled), .p-btn, .p-back, .p-quick a, .p-avatar-cam, .p-stat-cta');
      if (!b) return;
      var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
      var s = document.createElement('span');
      s.className = 'pf-ripple';
      s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      b.appendChild(s);
      s.addEventListener('animationend', function () { s.remove(); });
    }, { passive: true });
  }

  /* ---------- Password strength meter ---------- */
  var pw = document.getElementById('pNewPw');
  var field = document.getElementById('pNewPwField');
  if (pw && field) {
    var meter = document.createElement('div');
    meter.className = 'p-meter'; meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = '<i></i><i></i><i></i><i></i>';
    var txt = document.createElement('div');
    txt.className = 'p-meter-txt';
    var anchor = field.querySelector('.field-error');
    field.insertBefore(meter, anchor); field.insertBefore(txt, anchor);
    var labels = ['', 'ອ່ອນ', 'ພໍໃຊ້', 'ດີ', 'ແຂງແຮງ'];
    pw.addEventListener('input', function () {
      var v = pw.value, n = 0;
      if (v.length >= 6) n++;
      if (v.length >= 10) n++;
      if (/[A-Za-z]/.test(v) && /\d/.test(v)) n++;
      if (/[^A-Za-z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v) && v.length >= 8)) n++;
      if (v.length && n === 0) n = 1;
      meter.classList.toggle('on', v.length > 0);
      meter.setAttribute('data-l', n);
      txt.textContent = v.length ? 'ຄວາມແຂງແຮງ: ' + labels[n] : '';
    });
  }
})();
