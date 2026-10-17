/* wave-transition.js — คลื่นน้ำกวาดจากซ้าย คลุมจอ → เปลี่ยนหน้า → โหลดเสร็จ คลื่นไหลออกทางซ้าย
   ใช้ transform ล้วน (GPU) ไม่มี filter/blur หนักๆ เพื่อไม่ให้กระตุก */
(function () {
  'use strict';
  var KEY = 'wv-go', E = 170, busy = false, el, sheet, anims = [];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LAYERS = [ // ชั้นเงา(ลึก) / ฟอง / น้ำหลัก
    { P: 520, base: 138, amp: 17, ph: 0,   fill: 'rgba(18,86,190,.20)',  dir: -1, dur: 3800 },
    { P: 360, base: 108, amp: 20, ph: 1.7, fill: 'rgba(255,255,255,.6)', dir: 1,  dur: 2900 },
    { P: 440, base: 84,  amp: 23, ph: 3.1, fill: '#4fa8f2', stroke: 'rgba(255,255,255,.9)', dir: 1, dur: 3300 }
  ];
  function tile(L) {
    var pts = [], y, x, P = L.P;
    for (y = -8; y <= P + 8; y += 4) {
      x = L.base + L.amp * Math.sin(6.2832 * y / P + L.ph) + L.amp * .35 * Math.sin(12.5664 * y / P + L.ph * 2);
      pts.push(x.toFixed(1) + ' ' + y);
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + E + '" height="' + P + '" viewBox="0 0 ' + E + ' ' + P + '">' +
      '<path d="M0 -8L' + pts.join('L') + 'L0 ' + (P + 8) + 'Z" fill="' + L.fill + '"/>' +
      (L.stroke ? '<path d="M' + pts.join('L') + '" fill="none" stroke="' + L.stroke + '" stroke-width="3" stroke-linecap="round"/>' : '') + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function build() {
    if (el) return;
    var css = '#wv{position:fixed;inset:0;z-index:2147483000;overflow:hidden;display:none;contain:strict}#wv.on{display:block}' +
      '.wv-s{position:absolute;top:0;bottom:0;left:0;width:calc(100% + ' + E + 'px);will-change:transform;transform:translate3d(-100%,0,0)}' +
      '.wv-b{position:absolute;left:0;top:0;bottom:0;width:calc(100% - ' + E + 'px + 4px);overflow:hidden;background:linear-gradient(90deg,#dcf0fd,#a4d5f8 55%,#4fa8f2)}' +
      '.wv-b:before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 25%,rgba(255,255,255,.38) 42%,transparent 58%),radial-gradient(60% 40% at 25% 20%,rgba(255,255,255,.35),transparent),radial-gradient(38% 40% at 58% 88%,rgba(10,70,170,.22),transparent)}' +
      '.wv-o{position:absolute;border-radius:50%;background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.85),rgba(255,255,255,.12) 55%,rgba(255,255,255,.3));box-shadow:inset 0 0 0 1px rgba(255,255,255,.55)}' +
      '.wv-l{position:absolute;right:0;width:' + E + 'px;background-repeat:repeat-y;will-change:transform}';
    var st = document.createElement('style'); st.textContent = css;
    el = document.createElement('div'); el.id = 'wv'; el.setAttribute('aria-hidden', 'true');
    sheet = document.createElement('div'); sheet.className = 'wv-s';
    var b = document.createElement('div'); b.className = 'wv-b';
    [[78,12,22],[62,34,10],[88,58,16],[70,76,8],[92,20,12],[50,88,14]].forEach(function (o) {
      var s = document.createElement('i'); s.className = 'wv-o';
      s.style.cssText = 'left:' + o[0] + '%;top:' + o[1] + '%;width:' + o[2] + 'px;height:' + o[2] + 'px';
      b.appendChild(s);
    });
    sheet.appendChild(b);
    LAYERS.forEach(function (L) {
      var d = document.createElement('div'); d.className = 'wv-l';
      d.style.cssText = 'top:-' + L.P + 'px;height:calc(100% + ' + (2 * L.P) + 'px);background-image:' + tile(L) + ';background-size:' + E + 'px ' + L.P + 'px';
      L.node = d; sheet.appendChild(d);
    });
    el.appendChild(sheet);
    var root = document.documentElement; root.appendChild(st); root.appendChild(el);
  }
  function show(covered) {
    build(); el.classList.add('on');
    sheet.style.transform = (covered || reduce) ? 'translate3d(0,0,0)' : '';
    if (!anims.length && !reduce) LAYERS.forEach(function (L) {
      anims.push(L.node.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,' + (L.dir * L.P) + 'px,0)' }],
        { duration: L.dur, iterations: Infinity, easing: 'linear' }));
    });
  }
  function hide() {
    el.classList.remove('on'); sheet.style.transform = ''; el.style.opacity = '';
    anims.forEach(function (a) { a.cancel(); }); anims = [];
  }
  function run(cover, ms, ease) {
    show(!cover && sheet && sheet.style.transform);
    if (!cover) sheet.style.transform = 'translate3d(0,0,0)';
    var a = reduce
      ? el.animate([{ opacity: cover ? 0 : 1 }, { opacity: cover ? 1 : 0 }], { duration: 200, fill: 'forwards' })
      : sheet.animate([{ transform: 'translate3d(' + (cover ? '-100%' : '0%') + ',0,0)' }, { transform: 'translate3d(' + (cover ? '0%' : '-100%') + ',0,0)' }],
          { duration: ms, easing: ease, fill: 'forwards' });
    return a.finished.then(function () {
      if (cover) { sheet.style.transform = 'translate3d(0,0,0)'; el.style.opacity = 1; a.cancel(); }
      else { a.cancel(); hide(); }
    });
  }
  var api = window.WaveTransition = {
    cover:  function () { return run(true, 640, 'cubic-bezier(.55,.05,.2,1)'); },
    reveal: function () { return run(false, 900, 'cubic-bezier(.4,0,.15,1)'); }
  };
  function ready() { // รอ DOM + ข้อมูลร้าน + ฟอนต์ (ไม่รอรูปทุกใบ) สูงสุด 1.4 วิ แล้วรอ 2 เฟรมให้ภาพนิ่งก่อนเปิดคลื่น
    return new Promise(function (res) {
      var done = false;
      function fin() {
        if (done) return; done = true;
        setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(res); }); }, 80);
      }
      var dcl = new Promise(function (r) {
        if (document.readyState !== 'loading') r(); else document.addEventListener('DOMContentLoaded', r, { once: true });
      });
      var sf = Promise.resolve(window.__sfEarly).catch(function () {});
      var ft = document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : 0;
      Promise.all([dcl, sf, ft]).then(fin);
      setTimeout(fin, 1400);
    });
  }
  if (window.WV_MANUAL) return;
  var flag = false;
  try { flag = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (flag) { show(true); ready().then(api.reveal); }
  addEventListener('pageshow', function (e) { if (e.persisted) { busy = false; if (el) hide(); } });

  api.go = function (href) { // เปลี่ยนหน้าพร้อมคลื่น (ใช้กับลิงก์ปกติ และปุ่ม data-nav-href)
    if (busy) return; busy = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (x) {}
    api.cover().then(function () { location.href = href; });
    setTimeout(function () { // กันค้าง: ถ้า 5 วิแล้วยังไม่เปลี่ยนหน้า (เช่นเบราว์เซอร์ยกเลิกการนำทาง) ให้ปล่อยคลื่นออกแล้วใช้งานต่อได้
      busy = false; try { sessionStorage.removeItem(KEY); } catch (x) {}
      if (el && el.classList.contains('on')) api.reveal();
    }, 5000);
  };
  function sameSite(href) {
    var u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null; // หน้าเดิม/#hash
    return u.href;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-no-transition') || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var h = sameSite(a.getAttribute('href'));
    if (!h) return;
    e.preventDefault(); api.go(h);
  });
})();
