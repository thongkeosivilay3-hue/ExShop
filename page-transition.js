/* =========================================================
   page-transition.js
   ควบคุมแอนิเมชั่นตอนสลับหน้า (คู่กับ page-transition.css)
   - หน้าใหม่: ค่อยๆ มุดขึ้นมาอัตโนมัติผ่าน CSS (ไม่ต้องรอ JS)
   - คลิกลิงก์ภายในเว็บ: ม่านสีฟ้าอ่อนค่อยๆ คลุมหน้า แล้วค่อยเปลี่ยนหน้าจริง
   - ใช้ transform/opacity ล้วนๆ กัน jank และเคารพ prefers-reduced-motion
   ========================================================= */
(function () {
  // เครื่องสเปกต่ำ / เปิด Data Saver -> เปิดโหมด lite (ปิดแอนิเมชั่นตกแต่งที่วนซ้ำ)
  try {
    var nav = navigator;
    var conn = nav.connection || {};
    if ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
        (nav.deviceMemory && nav.deviceMemory <= 4) ||
        conn.saveData) {
      document.documentElement.classList.add('perf-lite');
    }
  } catch (e) {}

  var EXIT_MS = 420; // เวลาที่ม่านสีฟ้าอ่อนค่อยๆ คลุมหน้าก่อนเปลี่ยนหน้าจริง

  var wrapper = document.querySelector('.shell, .auth-shell');
  if (!wrapper) return;

  var navigating = false;

  function removeCover() {
    var c = document.getElementById('page-exit');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }

  // เคลียร์ will-change หลังแอนิเมชั่น "เข้า" จบ กันค้าง GPU layer ทิ้งไว้เฉยๆ
  // ---- สำคัญ: ต้องเคลียร์ animation ตัวเองทิ้งไปด้วย (ไม่ใช่แค่ willChange) ----
  // .shell เล่น keyframe pt-in ซึ่งจบที่ transform:translateX(0) — ค่า transform ที่ไม่ใช่
  // "none" (ต่อให้เป็น translateX(0) ที่มองไม่เห็นการขยับ) ทำให้ .shell กลายเป็น containing
  // block ของลูกที่เป็น position:fixed ทุกตัว (เช่น .chat-fab) ไปตลอดกาล เพราะ
  // animation-fill-mode:both ค้างค่า transform นี้ไว้ถาวรแม้แอนิเมชั่นจะ "จบ" ไปแล้ว —
  // ผลคือ .chat-fab ไม่ได้ fix ติดขอบจอเหมือนที่ควร แต่กลับไปติดขอบล่างของ .shell (สูงเท่า
  // เนื้อหาทั้งหน้า) แทน เลื่อนหน้าลงไปเท่าไหร่ก็ตามไปด้วยเหมือนลอยอยู่ก้นหน้าเว็บ — เอา
  // animation ออกทั้งดุ้นหลังเข้าฉากเสร็จ ก็จะเลิกเป็น containing block ทันที (ตอนออกจากหน้า
  // ค่อยมี .pt-exit{animation:...!important} มาทับใหม่ตอนนั้นอยู่แล้ว ไม่กระทบกัน)
  wrapper.addEventListener('animationend', function (e) {
    if (e.target !== wrapper) return;
    wrapper.style.willChange = 'auto';
    if (e.animationName === 'pt-in') wrapper.style.animation = 'none';
  });

  // ถ้าเบราว์เซอร์ดึงหน้านี้กลับมาจาก bfcache (เช่นกดปุ่มย้อนกลับ)
  // ระหว่างที่ค้างสถานะ "กำลังจางออก" อยู่ ให้รีเซ็ตกลับมาเห็นปกติทันที
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      navigating = false;
      wrapper.classList.remove('pt-exit');
      wrapper.style.opacity = '';
      wrapper.style.transform = '';
      wrapper.style.willChange = 'auto';
      wrapper.style.animation = 'none'; // กันแอนิเมชั่นเข้าเล่นซ้ำ + กัน transform ค้างแบบเดียวกับด้านบน
      removeCover();
    }
  });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return; // ผู้ใช้ปิดโมชั่นไว้ในระบบ — ไม่ต้อง intercept การคลิกเลย

  document.addEventListener('click', function (e) {
    if (navigating) { e.preventDefault(); return; }
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest('a[href]');
    if (!a) return;
    if (a.hasAttribute('data-no-transition')) return;
    if (a.hasAttribute('download')) return;
    if (a.target && a.target !== '' && a.target !== '_self') return;

    var href = a.getAttribute('href');
    if (!href || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) return;

    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;

    // แค่กระโดดไป #hash ในหน้าเดิม ไม่ต้องเล่นแอนิเมชั่นสลับหน้า
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

    e.preventDefault();
    navigating = true;

    // ม่านสีฟ้าอ่อน (สีเดียวกับหน้าโหลดของหน้าถัดไปเป๊ะ) ค่อยๆ ขึ้นมาคลุมหน้าเดิม
    // พอหน้าใหม่เปิด overlay จะเป็นสีเดียวกันอยู่แล้ว -> ต่อกันเนียนไม่มีสีกระโดด/กะพริบ
    var cover = document.createElement('div');
    cover.id = 'page-exit';
    cover.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;pointer-events:all;' +
      'background:' + (window.__plColor || '#cfe8fb') + ';opacity:0;will-change:opacity;' +
      'transition:opacity ' + EXIT_MS + 'ms cubic-bezier(.4,0,.2,1)';
    document.documentElement.appendChild(cover);
    void cover.offsetWidth; // บังคับให้เบราว์เซอร์รับค่าเริ่มต้นก่อน ไม่งั้น transition ไม่เล่น
    cover.style.opacity = '1';

    setTimeout(function () { location.href = href; }, EXIT_MS);
    // กันค้าง: ถ้าผ่านไป 4 วิแล้วหน้ายังไม่เปลี่ยน (เช่นเบราว์เซอร์ยกเลิกการนำทาง) ให้เอาม่านออกแล้วใช้งานต่อได้
    setTimeout(function () { navigating = false; removeCover(); }, 4000);
  });
})();
