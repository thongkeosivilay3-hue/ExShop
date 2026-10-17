/* =========================================================
   page-loader.js — (ไม่มีจอโหลดสีฟ้าแล้ว)
   ไฟล์นี้วางไว้บนสุดของ <head> ทุกหน้า ตอนนี้ทำแค่ 2 อย่าง:
   1) เริ่มดึงข้อมูลร้าน (/api/public/storefront) ทันที ขนานไปกับการโหลด CSS/ฟอนต์
      แล้วให้ storefront-data.js หยิบผลลัพธ์ (window.__sfEarly) ไปใช้ต่อ — ไม่ต้องยิงซ้ำ
   2) เก็บสีฟ้าอ่อน (window.__plColor) ให้ page-transition.js ใช้ตอนกดลิงก์เปลี่ยนหน้า
   ========================================================= */
(function () {
  window.__plColor = '#cfe8fb';

  // ตัวเลือกเหมือน storefront-data.js ทุกอย่าง (cache: 'no-store' = ได้ข้อมูลสดเท่าเดิม)
  try {
    window.__sfEarly = fetch('/api/public/storefront', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('storefront endpoint responded ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        return data;
      });
    window.__sfEarly.catch(function () {});   // กัน unhandled rejection (storefront-data.js จะลองใหม่เองถ้าพลาด)
  } catch (e) { window.__sfEarly = null; }
})();
