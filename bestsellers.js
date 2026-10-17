/* =========================================================
   bestsellers.js — แถบสินค้าขายดี (index.html #bsSection)
   - ดึงสินค้าจริงจาก /api/public/storefront (StorefrontData) เรียงตามยอดขาย (soldCount)
   - ใช้การ์ดสินค้าแบบเดียวกับหน้าหมวดหมู่ (.prod-card.grid-card)
   - เลื่อนอัตโนมัติไปทางซ้ายทีละการ์ด (easing นุ่มๆ ผ่าน requestAnimationFrame)
   - ปัดด้วยมือได้ (scroll-snap) / ปุ่มซ้าย-ขวา / หยุดชั่วคราวตอนผู้ใช้แตะ-ปัด
   - วนลูปไม่รู้จบ (ทำสำเนาการ์ด 3 ชุดแล้วกระโดดกลับชุดกลางตอนหยุดนิ่ง)
   ปรับค่าได้ที่ CONFIG ด้านล่าง
   ========================================================= */
(function () {
  'use strict';

  const CONFIG = {
    MAX_ITEMS: 8,        // จำนวนสินค้าสูงสุดในแถบ
    MIN_SOLD: 0,         // ยอดขายขั้นต่ำที่จะติดอันดับ (0 = โชว์ทุกสินค้า เรียงจากขายดีสุด) — ตั้งเป็น 1 ถ้าอยากโชว์เฉพาะที่เคยขายได้
    VISIBLE: 2,          // จำนวนการ์ดที่เห็นพร้อมกัน (ต้องตรงกับ CSS: 2 ใบ)
    AUTOPLAY_MS: 2600,   // เว้นระยะระหว่างการเลื่อนแต่ละครั้ง
    SMOOTH_MS: 105,      // ความเร็วเลื่อน: ยิ่งน้อยยิ่งเร็ว (105 ≈ เลื่อน 1 ใบจบใน ~0.45 วิ / เดิม 0.7 วิ)
    RESUME_MS: 5000,     // หยุดเลื่อนอัตโนมัติกี่ ms หลังผู้ใช้แตะ/ปัดเอง
  };

  const sec = document.getElementById('bsSection');
  const track = document.getElementById('bsTrack');
  const wrap = sec && sec.querySelector('.bs-wrap');
  if (!sec || !track || !wrap || !window.StorefrontData) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ตัวช่วยสร้างการ์ด (ก๊อปจาก category.js ให้หน้าตาเหมือนกัน) ---------- */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  const CART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
  const UP_ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11l6-6 6 6"/></svg>';
  const X_CIRCLE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>';
  const FLAME_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c2 2 3 4 3 6.5A7 7 0 1 1 8 15.5c0-2 1-3 2-4.5.5 1 1.5 1.5 2 1 1-1 0-2.5-1-4.5C10 5.5 11 3.5 12 2Z"/></svg>';

  function fxDelay(id) {
    const str = String(id || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return -(h % 250) / 100;
  }

  function fireIconHTML(delay, active) {
    return `<svg class="fire-ico${active ? '' : ' is-off'}" viewBox="0 0 24 24" aria-hidden="true" style="--fd:${delay}s">
      <g class="fire-flame">
        <path class="fire-outer" d="M12 2c.8 3.4 6 6 6 12a6 6 0 0 1-12 0c0-2.2 1-3.8 2.2-5.2.2 1.6 1 2.4 1.8 2.4C10.4 8.4 10.6 4.6 12 2Z"/>
        <path class="fire-mid" d="M12 9.5c.6 2.2 3.4 3.4 3.4 6.5a3.4 3.4 0 0 1-6.8 0c0-1.3.6-2.2 1.4-3 .2.9.7 1.3 1.2 1.3.4-1.1.2-3.1.8-4.8Z"/>
        <path class="fire-core" d="M12 14c.4 1 1.5 1.6 1.5 2.9a1.5 1.5 0 0 1-3 0c0-.9.5-1.4.9-1.9.2.4.4.5.6.5Z"/>
      </g>
      <circle class="fire-spark s1" cx="9" cy="6" r="0.9"/>
      <circle class="fire-spark s2" cx="15.5" cy="7" r="0.7"/>
      <circle class="fire-spark s3" cx="12" cy="4" r="0.6"/>
    </svg>`;
  }

  function stockState(p, stock) {
    if (p.paused) return 'paused';
    if (!(stock > 0)) return 'soldout';
    return 'ok';
  }

  function mediaHTML(p) {
    if (p.image_url) {
      return `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="prod-img" loading="lazy" decoding="async">`;
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>';
  }

  // หมายเหตุ: ในแถบนี้การ์ดที่ปิดปรับปรุง/หมดจะโชว์แบบเรียบๆ (ไม่ทำอนิเมชันเต็มแบบหน้าหมวดหมู่)
  function mediaBodyHTML(p, state) {
    if (state === 'paused') {
      return `<div class="st-stage"><div class="st-title">ປັບປຸງ / ລໍຖ້າອັບເດດ</div></div>`;
    }
    if (state === 'soldout') {
      return `<div class="st-stage"><div class="st-title">ໝົດແລ້ວ</div></div>`;
    }
    return mediaHTML(p);
  }

  function statusHTML(stock, state) {
    if (state === 'paused') return `<div class="prod-status out">ຄັງ ${stock.toLocaleString('en-US')}</div>`;
    if (state === 'soldout') return '<div class="prod-status out">ຄັງ 0</div>';
    return `<div class="prod-status">ເຫຼືອ ${stock.toLocaleString('en-US')} ອັນ</div>`;
  }

  function cardHTML(p, catIndex, isTop) {
    const SD = window.StorefrontData;
    const stock = SD.productTotalStock(p);
    const buyable = SD.isProductBuyable(p);
    const state = stockState(p, stock);
    const price = SD.productDisplayPrice(p);
    const priceHTML = price === null
      ? '<div class="prod-price todo">₭ 0</div>'
      : `<div class="prod-price">${SD.formatKip(price)}</div>`;
    const sold = Math.max(0, Number(p.soldCount) || 0);
    const d = fxDelay(p.id);
    const label = state === 'paused' ? 'ກຳລັງປັບປຸງ' : state === 'soldout' ? 'ສິນຄ້າໝົດ' : 'ຊື້ເລີຍ';
    const icon = state === 'paused' ? UP_ARROW_SVG : state === 'soldout' ? X_CIRCLE_SVG : CART_SVG;
    const stamp = (isTop && state === 'ok') ? `<div class="prod-stamp">${FLAME_SVG}ຂາຍດີ!</div>` : '';
    return `
      <article class="prod-card grid-card${isTop ? ' is-top-seller' : ''}" data-pid="${escapeHtml(p.id)}" data-cat="${escapeHtml(catIndex)}">
        <div class="prod-media${state === 'ok' ? '' : ' is-' + state}">
          ${stamp}
          ${mediaBodyHTML(p, state)}
        </div>
        <div class="prod-body">
          <div class="prod-name" title="${escapeHtml(p.name || '')}">${escapeHtml(p.name || '')}</div>
          <div class="prod-row">${priceHTML}${statusHTML(stock, state)}</div>
          <button type="button" class="buy-btn" ${buyable ? '' : 'disabled'}>${icon}${label}</button>
          <div class="prod-sold-tag${sold > 0 ? '' : ' is-zero'}" style="--fd:${d}s">${fireIconHTML(d, sold > 0)}<span class="sold-txt">ຂາຍແລ້ວ <b class="sold-num">${sold.toLocaleString('en-US')}</b> ອັນ</span></div>
        </div>
      </article>`;
  }

  /* ---------- ตัวเลื่อน ---------- */
  let loopOn = false;
  let setW = 0;          // ความกว้างของ 1 ชุดการ์ด (px)
  let stepW = 0;         // ระยะเลื่อน 1 การ์ด = กว้างการ์ด + gap
  let animating = false;
  let raf = 0;
  let pauseUntil = 0;
  let idleTimer = 0;
  let inView = true;
  let quietUntil = 0;    // ช่วงสั้นๆ หลังอนิเมชันจบ ให้ scroll event ที่ค้างอยู่ไม่ไปรบกวน autoplay
  let pos = 0;           // ตำแหน่งปัจจุบัน (ทศนิยมได้ ไม่ปัดเศษ -> ลื่นกว่า)
  let target = 0;        // ตำแหน่งปลายทาง — กดซ้ำกี่ครั้งก็บวกเพิ่มทีละ 1 การ์ด
  let vel = 0;           // ความเร็วปัจจุบัน (ต่อเนื่องแม้เปลี่ยนปลายทางกลางทาง)
  let lastT = 0;

  function measure() {
    const kids = track.children;
    if (kids.length < 2) return;
    stepW = kids[1].offsetLeft - kids[0].offsetLeft;
    if (loopOn) {
      const n = kids.length / 3;
      setW = kids[n].offsetLeft - kids[0].offsetLeft;
    }
  }

  function cancelAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    vel = 0;
    if (animating) {
      animating = false;
      track.classList.remove('is-animating');
    }
  }

  // SmoothDamp (สปริงแบบ critically damped): เริ่มนุ่ม-จบนุ่ม และถ้าเปลี่ยนปลายทางกลางทาง
  // ความเร็วจะต่อเนื่อง ไม่สะดุด/ไม่เริ่มใหม่จาก 0 เหมือน easing แบบเดิม
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;

    const st = Math.max(0.03, CONFIG.SMOOTH_MS / 1000);
    const omega = 2 / st;
    const x = omega * dt;
    const k = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = pos - target;
    const temp = (vel + omega * change) * dt;
    vel = (vel - omega * temp) * k;
    pos = target + (change + temp) * k;

    // วนลูป: ชุดการ์ดเหมือนกันทุกชุด จึงขยับ pos/target ไปทีละ 1 ชุดได้โดยตาไม่เห็นรอยต่อ
    if (loopOn && setW) {
      if (pos >= 2 * setW) { pos -= setW; target -= setW; }
      else if (pos < setW) { pos += setW; target += setW; }
    }

    if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 8) {
      pos = target;
      track.scrollLeft = pos;
      raf = 0;
      vel = 0;
      animating = false;
      quietUntil = performance.now() + 120;
      track.classList.remove('is-animating');
      normalize();
      return;
    }
    track.scrollLeft = pos;
    raf = requestAnimationFrame(frame);
  }

  // กระโดดกลับชุดกลางแบบเนียน (ชุดการ์ดเหมือนกันทุกชุด ตาไม่เห็นความต่าง)
  function normalize() {
    if (!loopOn || !setW) return;
    const sl = track.scrollLeft;
    if (sl < setW - 1) track.scrollLeft = sl + setW;
    else if (sl >= 2 * setW - 1) track.scrollLeft = sl - setW;
  }

  function go(dir) {
    if (!stepW) measure();
    if (!stepW) return;
    if (!animating) {
      // เริ่มใหม่: อ่านตำแหน่งจริง + ปัดให้ตรงการ์ดที่ใกล้ที่สุดเป็นฐาน
      normalize();
      pos = track.scrollLeft;
      target = Math.round(pos / stepW) * stepW;
      vel = 0;
      animating = true;
      track.classList.add('is-animating');
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }
    target += dir * stepW;   // กดย้ำ = บวกเพิ่มทีละใบ ไม่โดนทิ้ง
  }

  function userTouched() {
    pauseUntil = Date.now() + CONFIG.RESUME_MS;
    cancelAnim();
  }

  function bindControls() {
    ['touchstart', 'pointerdown', 'wheel', 'mousedown'].forEach((ev) =>
      track.addEventListener(ev, userTouched, { passive: true }));

    track.addEventListener('scroll', () => {
      if (animating || performance.now() < quietUntil) return;
      pauseUntil = Math.max(pauseUntil, Date.now() + 1200);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(normalize, 160);   // รอให้หยุดนิ่งก่อนค่อยวาร์ป
    }, { passive: true });

    const prev = wrap.querySelector('.bs-prev');
    const next = wrap.querySelector('.bs-next');
    if (prev) prev.addEventListener('click', () => { pauseUntil = Date.now() + CONFIG.RESUME_MS; go(-1); });
    if (next) next.addEventListener('click', () => { pauseUntil = Date.now() + CONFIG.RESUME_MS; go(1); });

    // ปุ่มซื้อ -> ไปหน้า product.html
    track.addEventListener('click', (e) => {
      const btn = e.target.closest('.buy-btn');
      if (!btn || btn.disabled) return;
      const card = btn.closest('.prod-card[data-pid]');
      if (!card) return;
      const cat = card.dataset.cat;
      window.location.href = `product.html?pid=${encodeURIComponent(card.dataset.pid)}${cat ? `&cat=${encodeURIComponent(cat)}` : ''}`;
    });

    window.addEventListener('resize', () => { measure(); normalize(); }, { passive: true });
  }

  function startAutoplay() {
    if (reduceMotion || !loopOn) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries.some((en) => en.isIntersecting);
      }, { threshold: 0.2 }).observe(wrap);
    }
    setInterval(() => {
      if (document.hidden || !inView || animating) return;
      if (Date.now() < pauseUntil) return;
      go(1);                                    // เลื่อนไปทางซ้ายทีละการ์ด
    }, CONFIG.AUTOPLAY_MS);
  }

  /* ---------- เริ่มทำงาน ---------- */
  window.StorefrontData.fetchData()
    .then((data) => {
      const SD = window.StorefrontData;
      const cats = data.categories || [];
      const list = (data.products || [])
        .filter((p) => (Number(p.soldCount) || 0) >= CONFIG.MIN_SOLD)
        .sort((a, b) =>
          (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0) ||
          Number(SD.isProductBuyable(b)) - Number(SD.isProductBuyable(a)) ||
          SD.productTotalStock(b) - SD.productTotalStock(a))
        .slice(0, CONFIG.MAX_ITEMS);

      if (!list.length) return;                  // ไม่มีสินค้า -> ซ่อนทั้งแถบ

      const cards = list.map((p, i) => {
        const cat = cats.find((c) => (c.name || '').trim() === (p.category || '').trim());
        const isTop = i === 0 && (Number(p.soldCount) || 0) > 0;
        return cardHTML(p, cat ? cat.index : '', isTop);
      }).join('');

      loopOn = list.length > CONFIG.VISIBLE;
      track.innerHTML = loopOn ? cards + cards + cards : cards;
      wrap.classList.toggle('is-static', !loopOn);
      sec.hidden = false;

      bindControls();
      if (loopOn) {
        // รอ layout เสร็จก่อนค่อยวัดและกระโดดไปชุดกลาง
        requestAnimationFrame(() => requestAnimationFrame(() => {
          measure();
          track.scrollLeft = setW;
          startAutoplay();
        }));
      }
    })
    .catch(() => { /* โหลดไม่สำเร็จ -> แถบนี้ซ่อนอยู่เฉยๆ */ });
})();
