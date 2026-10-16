/* topup-redesign.js — เสริมความลื่นไหลให้หน้าเติมเงิน (ไม่แก้ logic ของ topup.js)
   - Stepper ซิงก์กับขั้นตอนจริง   - ตัวเลขยอดเงินเด้งเมื่อเปลี่ยน
   - แสงสะท้อน/เอียงการ์ดยอดเงิน    - ripple ตอนกดปุ่ม
   - confetti เมื่อเติมเงินสำเร็จ */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && matchMedia('(hover: hover)').matches;
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- Stepper ---------- */
  var steps = $('#tuSteps');
  var sections = [$('#topupStepAmount'), $('#topupStepPay'), $('#topupStepWaiting')];
  var lastStep = 0;

  function currentStep() {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] && !sections[i].classList.contains('u-hidden')) return i + 1;
    }
    return 1;
  }
  function syncSteps() {
    if (!steps) return;
    var n = currentStep();
    steps.setAttribute('data-step', n);
    var items = steps.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-done', i + 1 < n);
      items[i].classList.toggle('is-current', i + 1 === n);
      if (i + 1 === n) items[i].setAttribute('aria-current', 'step');
      else items[i].removeAttribute('aria-current');
    }
    if (lastStep && lastStep !== n) {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
    lastStep = n;
  }
  if ('MutationObserver' in window) {
    var stepObs = new MutationObserver(syncSteps);
    sections.forEach(function (s) {
      if (s) stepObs.observe(s, { attributes: true, attributeFilter: ['class'] });
    });
  }
  syncSteps();

  /* ---------- ตัวเลขยอดเงินเด้งเมื่อเปลี่ยน ---------- */
  function tickOn(el) {
    if (!el || reduce || !('MutationObserver' in window)) return;
    new MutationObserver(function () {
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
    }).observe(el, { childList: true, characterData: true, subtree: true });
    el.addEventListener('animationend', function () { el.classList.remove('tick'); });
  }
  tickOn($('#topupSumValue'));
  tickOn($('#topupPayAmount'));

  /* ---------- แสงตามนิ้ว/เมาส์ + เอียงการ์ดยอดเงิน ---------- */
  var panel = $('.topup-amount-summary');
  if (panel && !reduce) {
    var raf = 0;
    panel.addEventListener('pointermove', function (e) {
      var r = panel.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        panel.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        panel.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (canHover) {
          panel.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
          panel.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
        }
      });
    });
    panel.addEventListener('pointerleave', function () {
      cancelAnimationFrame(raf);
      panel.style.setProperty('--rx', '0deg');
      panel.style.setProperty('--ry', '0deg');
      panel.style.setProperty('--mx', '80%');
      panel.style.setProperty('--my', '0%');
    });
  }

  /* ---------- Ripple ---------- */
  if (!reduce) {
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var b = t.closest('.topup-submit:not(:disabled), .topup-preset, .topup-method, .topup-back-btn');
      if (!b) return;
      var r = b.getBoundingClientRect();
      var d = Math.max(r.width, r.height) * 2;
      var s = document.createElement('span');
      s.className = 'tu-ripple';
      s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      b.appendChild(s);
      s.addEventListener('animationend', function () { s.remove(); });
    }, { passive: true });
  }

  /* ---------- Confetti เมื่อสำเร็จ ---------- */
  var card = $('#tuwCard');
  var colors = ['#2f9be8', '#8ccbf7', '#16a870', '#f2a516', '#1769b5'];
  function burst() {
    if (!card || reduce || card.querySelector('.tu-confetti')) return;
    var w = document.createElement('div');
    w.className = 'tu-confetti';
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('i');
      var a = (i / 20) * Math.PI * 2;
      var dist = 70 + Math.random() * 70;
      p.style.setProperty('--dx', (Math.cos(a) * dist).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.sin(a) * dist - 30).toFixed(0) + 'px');
      p.style.setProperty('--r', ((Math.random() - 0.5) * 540).toFixed(0) + 'deg');
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      w.appendChild(p);
    }
    card.appendChild(w);
    setTimeout(function () { w.remove(); }, 1700);
  }
  if (card && 'MutationObserver' in window) {
    new MutationObserver(function () {
      if (card.getAttribute('data-state') === 'success') burst();
    }).observe(card, { attributes: true, attributeFilter: ['data-state'] });
  }
})();
