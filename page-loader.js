/* =========================================================
   page-loader.js — หน้าโหลดทุกหน้า: จอสีฟ้าอ่อน แล้วค่อยๆ กลายเป็นขาวจางๆ และจางออกเมื่อหน้าพร้อม
   วางไว้ใน <head> บนสุด เพื่อให้ขึ้นทันทีก่อนหน้าเว็บวาดเสร็จ
   - CSS ฝังอยู่ในไฟล์นี้ทั้งหมด (ไม่ต้องรอ page-loader.css / assets โหลด)
     จึงขึ้นพร้อมกับเฟรมแรกของหน้า ไม่มีจังหวะที่เห็นหน้าเว็บก่อนหน้าโหลดจะขึ้น
   ซ่อนเมื่อ: หน้าโหลดเสร็จ + ข้อมูลร้านจาก /api/public/storefront มาแล้ว
   (หรือครบเวลาสูงสุด 8 วินาที กันค้าง) แล้วเฟดออก
   ========================================================= */
(function () {
  var root = document.documentElement;
  var MIN_SHOW_MS = 150;   // โชว์จอฟ้าอ่อนอย่างน้อยเท่านี้ (มิลลิวินาที) กันกระพริบ
  var MAX_WAIT_MS = 8000;  // รอนานสุด แล้วเปิดหน้าให้เลย
  var EXIT_MS = 900;       // เวลารอก่อนลบ overlay (ต้องมากกว่าเวลา transition ในสไตล์ด้านล่าง = .8s)
  var COLOR = '#cfe8fb';   // สีฟ้าอ่อน — page-transition.js ใช้สีเดียวกันตอนกดลิงก์ เพื่อให้ต่อกันเนียนไม่มีสีกระโดด
  window.__plColor = COLOR;
  var start = Date.now();
  var done = false;
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---- สไตล์ (ฝังในไฟล์นี้ — ใส่ก่อนสร้าง overlay เสมอ) ----
  var CSS =
    'html.pl-lock{overflow:hidden}' +
    '#page-loader{position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;background:' + COLOR + ';opacity:1;visibility:visible;' +
      'animation:pl-failsafe 0s linear 10s forwards}' +
    // ชั้นสีขาวซ้อนทับ: ตอนออกจะค่อยๆ ขึ้นมาแทนสีฟ้า (ใช้ opacity ล้วนๆ ลื่นกว่าไล่ background-color)
    '#page-loader::after{content:\"\";position:absolute;top:0;right:0;bottom:0;left:0;background:#fff;opacity:0}' +
    '@keyframes pl-failsafe{to{opacity:0;visibility:hidden;pointer-events:none}}' +
    '#page-loader.pl-exit{opacity:0;visibility:hidden;pointer-events:none;animation:none;' +
      'transition:opacity .8s cubic-bezier(.4,0,.2,1),visibility 0s linear .8s}' +
    '#page-loader.pl-exit::after{opacity:1;transition:opacity .8s cubic-bezier(.4,0,.2,1)}' +
    '#page-loader.pl-hide{opacity:0;visibility:hidden;pointer-events:none;animation:none;' +
      'transition:opacity .3s ease,visibility 0s linear .3s}';
  var st = document.createElement('style');
  st.id = 'page-loader-style';
  st.appendChild(document.createTextNode(CSS));
  (document.head || root).appendChild(st);

  // สร้าง overlay จอฟ้าอ่อน
  function build() {
    var el = document.createElement('div');
    el.id = 'page-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', 'Loading');
    return el;
  }
  window.__plBuild = build;

  var el = build();
  root.classList.add('pl-lock');
  root.appendChild(el); // ใส่ที่ <html> ได้เลย ไม่ต้องรอ <body>

  function remove() { if (el.parentNode) el.parentNode.removeChild(el); }

  function finish() {
    if (done) return;
    done = true;
    var wait = Math.max(0, MIN_SHOW_MS - (Date.now() - start));
    setTimeout(function () {
      // รอ 2 เฟรมให้เนื้อหาที่เพิ่งเติมวาดเสร็จก่อนค่อยเฟดออก
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          // ปลดล็อกการเลื่อนทันที — หน้าพร้อมใช้งานตั้งแต่เริ่มเปิด ไม่ต้องรอเฟดจบ
          root.classList.remove('pl-lock');
          if (reduced) {
            el.classList.add('pl-hide');
            setTimeout(remove, 400);
          } else {
            el.classList.add('pl-exit');
            setTimeout(remove, EXIT_MS);
            // กันเหนียว: ถ้าแท็บอยู่เบื้องหลังแล้ว timer ช้า ก็ยังเอาออกแน่ๆ
            setTimeout(remove, EXIT_MS + 1500);
          }
        });
      });
    }, wait);
  }

  // กันค้างสูงสุด
  setTimeout(finish, MAX_WAIT_MS);

  var pageLoaded = new Promise(function (res) {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res);
  });

  // รอข้อมูลร้าน (ถ้าหน้านั้นใช้) — สำเร็จหรือพลาดก็ถือว่า "เสร็จ" จะได้ไม่ค้าง
  var dataReady = new Promise(function (res) {
    var tries = 0;
    (function poll() {
      if (window.StorefrontData && window.StorefrontData.fetchData) {
        window.StorefrontData.fetchData().then(res, res);
      } else if (++tries > 100) { res(); }      // หน้านี้ไม่ได้ใช้ข้อมูลร้าน
      else setTimeout(poll, 20);
    })();
  });

  Promise.all([pageLoaded, dataReady]).then(function () {
    // เว้นจังหวะให้ script ของแต่ละหน้าเติมข้อมูลลง DOM ก่อน
    setTimeout(finish, 30);
  });

  // กด "ย้อนกลับ" แล้วหน้ากลับมาจาก bfcache -> อย่าให้ overlay ค้าง
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { remove(); root.classList.remove('pl-lock'); }
  });
})();
