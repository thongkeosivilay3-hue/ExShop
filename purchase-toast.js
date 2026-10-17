/* =========================================================
   purchase-toast.js — การ์ดแจ้งเตือน "ມີຄົນຊື້ສິນຄ້າ" ເລື່ອນເຂົ້າມາຈາກທາງຊ້າຍ (ໜ້າຫຼັກ)
   - ດຶງຂໍ້ມູນຈິງຈາກ /api/public/recent-purchases ແລ້ວເລື່ອນເຂົ້າມາ → ຄ້າງໄວ້ → ເລື່ອນກັບໄປເອງ → ໃບຕໍ່ໄປ
     ຈົບທຸກໃບແລ້ວດຶງຂໍ້ມູນໃໝ່ ແລ້ວວົນຕໍ່ (ກົດໃສ່ການ໌ດບໍ່ໄດ້)
   - ມີສະວິດຢູ່ລຸ່ມການ໌ດ: ເປີດ → ຢຸດແບບເລື່ອນ ແລ້ວໂຊວ໌ແຖບ "ສິນຄ້າທີ່ຊື້ລ່າສຸດ" ແບບເດີມ
     (ໃນແຖບເດີມມີສະວິດຢູ່ນຳ ເພື່ອກັບມາແບບເລື່ອນ) — ຈື່ຄ່າໄວ້ໃນເຄື່ອງ
   - ອະນິເມຊັນໃຊ້ transform/opacity ເທົ່ານັ້ນ (ລຽບ ບໍ່ກະຕຸກ)
   ========================================================= */
(function () {
  var KEY = 'rpMode';           // 'toast' (ຄ່າເລີ່ມຕົ້ນ) | 'list'
  var SHOW_MS = 4200;           // ເວລາຄ້າງຂອງແຕ່ລະໃບ
  var GAP_MS = 900;             // ພັກລະຫວ່າງໃບ
  var LOOP_GAP_MS = 3500;       // ພັກກ່ອນເລີ່ມຮອບໃໝ່
  var OUT_MS = 700;

  function load() { try { return localStorage.getItem(KEY) === 'list' ? 'list' : 'toast'; } catch (e) { return 'toast'; } }
  function save(m) { try { localStorage.setItem(KEY, m); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ago(iso) {
    var t = new Date(iso).getTime();
    if (!iso || isNaN(t)) return '';
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'ຫາກໍ່ຊື້';
    var m = Math.floor(s / 60); if (m < 60) return m + ' ນາທີກ່ອນ';
    var h = Math.floor(m / 60); if (h < 24) return h + ' ຊົ່ວໂມງກ່ອນ';
    return Math.floor(h / 24) + ' ມື້ກ່ອນ';
  }

  var CSS = '' +
    '.pt-wrap{position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:90;width:min(200px,calc(100vw - 96px));' +
    'display:flex;flex-direction:column;align-items:flex-start;gap:8px;pointer-events:none;' +
    'transform:translate3d(-130%,0,0);will-change:transform;' +
    'transition:transform ' + OUT_MS + 'ms cubic-bezier(.5,0,.75,0)}' +
    '.pt-wrap.pt-in{transform:translate3d(0,0,0);transition:transform .8s cubic-bezier(.16,1,.3,1)}' +
    '.pt-card{width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px 8px 10px;border-radius:16px;background:rgba(255,255,255,.32);' +
    '-webkit-backdrop-filter:blur(16px) saturate(180%);backdrop-filter:blur(16px) saturate(180%);border:1px solid rgba(255,255,255,.6);' +
    'box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 10px 28px -12px rgba(23,105,181,.35);font-family:"Noto Sans Lao","Rajdhani",sans-serif;color:#0e2237}' +
    '.pt-thumb{position:relative;width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#e6f3fe,#cfe7fb);color:#1769b5;display:grid;place-items:center;flex:none}' +
    '.pt-thumb img{width:100%;height:100%;object-fit:cover;border-radius:11px;display:block}' +
    '.pt-thumb>svg{width:18px;height:18px}' +
    '.pt-badge{position:absolute;right:-4px;bottom:-4px;width:16px;height:16px;border-radius:50%;background:#2f9be8;border:2px solid #fff;display:grid;place-items:center;color:#fff}' +
    '.pt-badge svg{width:9px;height:9px}' +
    '.pt-info{min-width:0;flex:1}' +
    '.pt-name{font-size:13px;font-weight:800;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.pt-meta{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:11px;color:#3f566e;white-space:nowrap;overflow:hidden}' +
    '.pt-meta svg{width:11px;height:11px;flex:none;color:#8497ac}' +
    '.pt-time{font-size:10.5px;color:#1f86d4;font-weight:600;margin-top:1px}' +
    /* switch */
    '.pt-sw{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.4);' +
    '-webkit-backdrop-filter:blur(16px) saturate(180%);backdrop-filter:blur(16px) saturate(180%);box-shadow:0 8px 22px -12px rgba(23,105,181,.4);cursor:pointer;' +
    'font:600 12.5px "Noto Sans Lao","Rajdhani",sans-serif;color:#566b82;-webkit-tap-highlight-color:transparent}' +
    '.pt-knobbar{position:relative;width:38px;height:22px;border-radius:999px;background:#cfdcea;transition:background .35s ease;flex:none}' +
    '.pt-knobbar::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(14,34,55,.3);' +
    'transition:transform .4s cubic-bezier(.32,.72,0,1)}' +
    '.pt-sw[aria-checked="true"] .pt-knobbar{background:#2f9be8}' +
    '.pt-sw[aria-checked="true"] .pt-knobbar::after{transform:translateX(16px)}' +
    '.pt-sw-row{display:flex;justify-content:flex-end;margin:6px 0 10px}' +
    '#rpSection{animation:ptFade .6s cubic-bezier(.32,.72,0,1) both}' +
    '#rpSection[hidden]{display:none!important}' +
    '@keyframes ptFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.pt-wrap,.pt-wrap.pt-in{transition-duration:.01s}#rpSection{animation:none}}';

  var USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var BOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18"/><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function init() {
    var section = document.getElementById('rpSection');
    if (!section) return;

    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    var mode = load();
    var items = [], idx = 0, timer = null, dead = false;

    /* ---------- DOM ---------- */
    var wrap = document.createElement('div');
    wrap.className = 'pt-wrap';
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML = '<div class="pt-card" id="ptCard"></div>' +
      '<button type="button" class="pt-sw" role="switch" aria-checked="false"><span>ສະແດງແບບລາຍການ</span><span class="pt-knobbar"></span></button>';
    document.body.appendChild(wrap);
    var card = wrap.querySelector('#ptCard');
    var sw = wrap.querySelector('.pt-sw');

    var inline = document.createElement('div');
    inline.className = 'pt-sw-row';
    inline.innerHTML = '<button type="button" class="pt-sw" role="switch" aria-checked="true"><span>ແຈ້ງເຕືອນແບບເລື່ອນ</span><span class="pt-knobbar"></span></button>';
    var capt = section.querySelector('.u-caption-faint');
    if (capt && capt.parentNode) capt.parentNode.insertBefore(inline, capt.nextSibling); else section.insertBefore(inline, section.firstChild);
    var sw2 = inline.querySelector('.pt-sw');

    /* ---------- render ---------- */
    function render(it) {
      var media = it.image ? '<img src="' + esc(it.image) + '" alt="" width="36" height="36" decoding="async">' : BOX;
      card.innerHTML =
        '<div class="pt-thumb">' + media + '<span class="pt-badge">' + CHECK + '</span></div>' +
        '<div class="pt-info"><div class="pt-name">' + esc(it.productName) + '</div>' +
        (it.buyer ? '<div class="pt-meta">' + USER + '<span>' + esc(it.buyer) + '</span></div>' : '') +
        '<div class="pt-time">' + esc(ago(it.createdAt)) + '</div></div>';
    }

    function clear() { clearTimeout(timer); timer = null; }
    function later(fn, ms) { clear(); timer = setTimeout(function () { if (!dead) fn(); }, ms); }

    /* ---------- cycle ---------- */
    function showNext() {
      if (mode !== 'toast' || document.hidden) return;
      if (!items.length) { later(refetch, 15000); return; }
      render(items[idx]);
      // ให้เบราว์เซอร์วาดตำแหน่งเริ่มต้นก่อน แล้วค่อยเลื่อนเข้า
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('pt-in'); }); });
      later(leave, SHOW_MS);
    }
    function leave() {
      wrap.classList.remove('pt-in');
      later(function () {
        idx++;
        if (idx >= items.length) { idx = 0; later(refetch, LOOP_GAP_MS); }
        else later(showNext, GAP_MS);
      }, OUT_MS);
    }
    function refetch() {
      fetch('/api/public/recent-purchases', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { items = (d && d.items) || []; })
        .catch(function () { /* ใช้รายการเดิมต่อ */ })
        .then(function () { idx = 0; showNext(); });
    }

    /* ---------- mode switch ---------- */
    function apply(newMode, persist) {
      mode = newMode;
      if (persist) save(mode);
      var list = mode === 'list';
      sw.setAttribute('aria-checked', list ? 'true' : 'false');
      sw2.setAttribute('aria-checked', list ? 'true' : 'false');
      clear();
      if (list) {
        wrap.classList.remove('pt-in');
        section.hidden = false;
      } else {
        section.hidden = true;
        later(function () { idx = 0; showNext(); }, 250);
      }
    }
    sw.addEventListener('click', function () { apply('list', true); });
    sw2.addEventListener('click', function () { apply('toast', true); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clear(); wrap.classList.remove('pt-in'); }
      else if (mode === 'toast') later(function () { idx = 0; refetch(); }, 400);
    });

    /* ---------- start ---------- */
    sw.setAttribute('aria-checked', mode === 'list' ? 'true' : 'false');
    section.hidden = mode !== 'list';
    if (mode === 'toast') later(refetch, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
