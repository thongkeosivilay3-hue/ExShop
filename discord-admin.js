/* =========================================================
   discord-admin.js — ตั้งลิ้ง Discord Webhook สำหรับแจ้งเตือนตอนมีคนเติมเงิน (ห้องแอดมิน)
   คุยกับ Worker ที่ GET/POST /api/admin/discord และ POST /api/admin/discord/test (เฉพาะแอดมิน)
   ลิ้งจริงเก็บฝั่งเซิร์ฟเวอร์ (Supabase site_settings) — เบราว์เซอร์ไม่เคยได้ลิ้งเต็มกลับมา เห็นแค่ตัวย่อ
   ========================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const urlInput = $('dcUrl'), saveBtn = $('dcSaveBtn'), testBtn = $('dcTestBtn'), clearBtn = $('dcClearBtn');
  const sw = $('dcEnabled'), msg = $('dcMsg'), status = $('dcStatus'), statusText = $('dcStatusText');
  if (!urlInput || !saveBtn || !sw) return;

  const API = '/api/admin/discord';
  const HOOK_RE = /^https:\/\/(?:discord(?:app)?\.com|ptb\.discord\.com|canary\.discord\.com)\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/;
  let state = null;     // { configured, enabled, hint, at, by } จากเซิร์ฟเวอร์ (null = ยังไม่รู้)
  let enabled = true;   // ค่าสวิตช์ที่แสดงอยู่
  let busy = false;

  function toast(t) {
    if (typeof showToast === 'function') showToast(t);
  }

  function setMsg(text, kind) {
    msg.classList.remove('show', 'error', 'success', 'pending');
    msg.textContent = text || '';
    if (text) msg.classList.add('show', kind || 'pending');
  }

  function setLoading(btn, on) {
    btn.classList.toggle('loading', on);
  }

  function lock(on) {
    busy = on;
    const configured = !!(state && state.configured);
    saveBtn.disabled = on;
    testBtn.disabled = on || !configured;
    clearBtn.disabled = on || !configured;
    sw.disabled = on;
  }

  function paint(fromServer) {
    if (fromServer && state) enabled = state.enabled;
    sw.classList.toggle('on', enabled);
    sw.setAttribute('aria-checked', enabled ? 'true' : 'false');
    status.classList.remove('ok', 'off', 'none');
    if (!state) {
      status.classList.add('none');
      statusText.textContent = 'ກວດສະຖານະບໍ່ໄດ້ — ລອງເປີດໜ້ານີ້ໃໝ່';
    } else if (!state.configured) {
      status.classList.add('none');
      statusText.textContent = 'ຍັງບໍ່ໄດ້ຕັ້ງຄ່າລິ້ງ';
    } else if (state.enabled) {
      status.classList.add('ok');
      statusText.textContent = 'ເຊື່ອມຕໍ່ແລ້ວ · ' + (state.hint || '');
    } else {
      status.classList.add('off');
      statusText.textContent = 'ມີລິ້ງແລ້ວ ແຕ່ປິດແຈ້ງເຕືອນຢູ່ · ' + (state.hint || '');
    }
    urlInput.placeholder = state && state.configured
      ? 'ວາງລິ້ງໃໝ່ຖ້າຕ້ອງການປ່ຽນ (ປັດຈຸບັນ: ' + (state.hint || '') + ')'
      : 'https://discord.com/api/webhooks/...';
    lock(false);
  }

  async function call(path, method, body) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctl.signal,
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* ไม่ใช่ JSON */ }
      if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
      return data || {};
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'ການເຊື່ອມຕໍ່ຊ້າເກີນໄປ' : e.message);
    } finally {
      clearTimeout(t);
    }
  }

  async function load() {
    try {
      state = await call(API, 'GET');
    } catch (e) {
      state = null;
    }
    paint(true);
  }

  async function save(extra, okText) {
    if (busy) return false;
    lock(true);
    setMsg('ກຳລັງບັນທຶກ...', 'pending');
    try {
      state = await call(API, 'POST', extra);
      urlInput.value = '';
      setMsg(okText, 'success');
      toast(okText);
      paint(true);
      return true;
    } catch (e) {
      setMsg('ບັນທຶກບໍ່ສຳເລັດ: ' + e.message, 'error');
      paint();
      return false;
    }
  }

  saveBtn.addEventListener('click', async () => {
    const val = urlInput.value.trim();
    if (!val && !(state && state.configured)) {
      setMsg('ກະລຸນາວາງລິ້ງ Discord Webhook ກ່ອນ', 'error');
      urlInput.focus();
      return;
    }
    if (val && !HOOK_RE.test(val)) {
      setMsg('ລິ້ງບໍ່ຖືກຕ້ອງ — ຕ້ອງເປັນ https://discord.com/api/webhooks/...', 'error');
      urlInput.focus();
      return;
    }
    setLoading(saveBtn, true);
    await save({ url: val || undefined, enabled }, 'ບັນທຶກລິ້ງແລ້ວ');
    setLoading(saveBtn, false);
  });

  sw.addEventListener('click', async () => {
    if (busy) return;
    const next = !enabled;
    if (state && state.configured) {
      enabled = next; paint();                    // สลับให้เห็นทันที
      const ok = await save({ enabled: next }, next ? 'ເປີດແຈ້ງເຕືອນແລ້ວ' : 'ປິດແຈ້ງເຕືອນແລ້ວ');
      if (!ok) { enabled = !next; paint(); }      // บันทึกไม่ได้ -> คืนค่าเดิม
    } else {
      enabled = next; paint();                    // ยังไม่มีลิ้ง: จำค่าไว้ใช้ตอนกดบันทึก
    }
  });

  testBtn.addEventListener('click', async () => {
    if (busy) return;
    lock(true);
    setLoading(testBtn, true);
    setMsg('ກຳລັງສົ່ງຂໍ້ຄວາມທົດສອບ...', 'pending');
    try {
      await call(API + '/test', 'POST', {});
      setMsg('ສົ່ງແລ້ວ — ເຊັກຂໍ້ຄວາມໃນຫ້ອງ Discord', 'success');
    } catch (e) {
      setMsg(e.message, 'error');
    }
    setLoading(testBtn, false);
    paint();
  });

  clearBtn.addEventListener('click', async () => {
    if (busy) return;
    if (!confirm('ລຶບລິ້ງ Discord ນີ້ອອກ? ຫຼັງຈາກນີ້ຈະບໍ່ມີການແຈ້ງເຕືອນເຕີມເງິນເຂົ້າ Discord ຈາກລິ້ງນີ້')) return;
    setLoading(clearBtn, true);
    await save({ clear: true }, 'ລຶບລິ້ງແລ້ວ');
    setLoading(clearBtn, false);
  });

  // เปิดแผงนี้ทีไร โหลดสถานะล่าสุดใหม่ (ไม่ขวางการเปิดแผงของ admin-glass.js)
  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('.d2-fn-card[data-goto="panelDiscord"]');
    if (c && !busy) load();
  }, true);

  lock(true);
  load();
})();
