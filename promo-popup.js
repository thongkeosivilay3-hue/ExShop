/* =========================================================
   promo-popup.js — popup ໂປຣໂມຊັ່ນ ໂຊວ໌ຕອນເປີດໜ້າຫຼັກ (index.html)
   ຮູບ/ເປີດ-ປິດ ຕັ້ງຄ່າໄດ້ຈາກຫ້ອງແອດມິນ (admin.html -> ຕັ້ງຄ່າຮ້ານ -> Popup ໂປຣໂມຊັ່ນ)
   ດຶງຄ່າຈາກ /api/public/storefront -> store.promoPopup { enabled, image }
   ຖ້າລູກຄ້າກົດ "ບໍ່ໂຊວ໌ອີກ 1 ຊົ່ວໂມງ" ແລ້ວກົດປິດ -> ເກັບ timestamp ໄວ້ໃນ localStorage
   ຈະບໍ່ໂຊວ໌ popup ນີ້ອີກຈົນກວ່າຈະຄົບ 1 ຊົ່ວໂມງ
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.StorefrontData) return;

  const HIDE_KEY = 'promoPopupHideUntil';
  const HIDE_DURATION_MS = 60 * 60 * 1000; // 1 ຊົ່ວໂມງ

  function isHiddenByUser() {
    const until = Number(localStorage.getItem(HIDE_KEY) || 0);
    return until && Date.now() < until;
  }

  if (isHiddenByUser()) return;

  let data;
  try {
    data = await window.StorefrontData.fetchData();
  } catch (err) {
    console.error('promo-popup: fetchData ບໍ່ສຳເລັດ', err);
    return;
  }

  const promo = data && data.store && data.store.promoPopup;
  if (!promo || !promo.enabled || !promo.image) return; // ແອດມິນຍັງບໍ່ໄດ້ເປີດ ຫຼື ຍັງບໍ່ໄດ້ໃສ່ຮູບ

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ไม่มีการ์ดสีขาว + ไม่มีปุ่ม X — เหลือแค่ตัวเลือก "ບໍ່ໂຊວ໌ອີກ" กับปุ่ม "ປິດທັງໝົດ" ลอยใต้รูป (โทนฟ้า)
  const popupStyle = document.createElement('style');
  popupStyle.textContent = `
    .promo-popup .promo-popup-close{ display:none; }
    .promo-popup .promo-popup-footer{ margin-top:16px; background:none; border:0; border-radius:0; padding:0; box-shadow:none;
      display:flex; flex-direction:column; align-items:center; gap:12px; }
    .promo-popup .promo-popup-check-row{ margin:0; padding:9px 16px; border-radius:999px; background:rgba(255,255,255,.18);
      border:1px solid rgba(255,255,255,.38); color:#fff; font-weight:500;
      -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
    .promo-popup .promo-popup-check-row input[type="checkbox"]{ accent-color:#2f9be8; }
    .promo-popup .promo-popup-close-all{ min-width:170px; padding:12px 28px; border-radius:14px; border:0; color:#fff;
      background:linear-gradient(135deg,#46aef2,#1f86d6); box-shadow:0 10px 24px -8px rgba(31,134,214,.85); }
  `;
  document.head.appendChild(popupStyle);

  const overlay = document.createElement('div');
  overlay.className = 'promo-popup-overlay';
  overlay.innerHTML = `
    <div class="promo-popup" role="dialog" aria-modal="true" aria-label="ໂປຣໂມຊັ່ນ">
      <div class="promo-popup-img-wrap">
        <img src="${escHtml(promo.image)}" alt="ໂປຣໂມຊັ່ນ">
      </div>
      <div class="promo-popup-footer">
        <label class="promo-popup-check-row">
          <input type="checkbox" id="promoPopupHideCheck">
          ບໍ່ໂຊວ໌ອີກ 1 ຊົ່ວໂມງ
        </label>
        <button type="button" class="promo-popup-close-all" id="promoPopupCloseAll">ປິດທັງໝົດ</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('promo-popup-open');
  requestAnimationFrame(() => overlay.classList.add('show'));

  function closePopup() {
    const hideCheck = document.getElementById('promoPopupHideCheck');
    if (hideCheck && hideCheck.checked) {
      localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DURATION_MS));
    }
    overlay.classList.remove('show');
    document.body.classList.remove('promo-popup-open');
    setTimeout(() => overlay.remove(), 250);
  }

  overlay.querySelector('#promoPopupCloseAll').addEventListener('click', closePopup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup(); // ກົດພື້ນທີ່ນອກກ່ອງ ໃຫ້ປິດ
  });
  document.addEventListener('keydown', function escListener(e) {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', escListener);
    }
  });
});
