/* =========================================================
   stat-bg.js — พื้นหลังการ์ดสถิติ 4 ใบหน้าแรก (ข้อมูลจริง แล้วสลับวนไปเรื่อยๆ)
   1) ผู้ใช้งาน  : สมาชิกจริง (ชื่อปิดบังบางส่วน + รูปโปรไฟล์) /api/public/recent-users
   2) สินค้า     : การ์ดสินค้า + รูปสินค้าจริง                 /api/public/storefront
   3) คลังสินค้า : "รหัสหลอก" เบลอหนักๆ — สุ่มสร้างในเบราว์เซอร์เอง ไม่ใช่รหัสสินค้าจริง
                  (ห้ามดึงรหัสจริงมาใส่ฝั่งเบราว์เซอร์: เบลอด้วย CSS ยังเปิดดูต้นทาง/Network ได้)
   4) ขายแล้ว    : สินค้าที่ขายแล้วจริง เบลอ                   /api/public/recent-purchases
   ========================================================= */
(function(){
  var cards=document.querySelectorAll('.stats .stat-card'); if(cards.length<4) return;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOCK=window.__SB_MOCK||null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function get(u){return fetch(u,{headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){return null})}
  function layer(card,cls){card.classList.add('has-bg');var l=document.createElement('div');l.className='sb-layer '+cls;card.insertBefore(l,card.firstChild);return l}
  function cycle(l,items,render,ms,offset){
    if(!items||!items.length)return; var i=0;
    function show(){l.innerHTML=render(items[i%items.length]);var n=l.firstChild;void l.offsetWidth;n.classList.add('sb-in');i++}
    setTimeout(function(){show();if(items.length<2||reduce)return;
      setInterval(function(){if(document.hidden)return;var c=l.firstChild;if(c){c.classList.remove('sb-in');c.classList.add('sb-out')}setTimeout(show,460)},ms)},offset||0);
  }
  function thumb(src,name){
    var ini=esc(Array.from(String(name||'?'))[0]||'?');
    return '<span class="sb-img">'+(src?'<img src="'+esc(src)+'" alt="" loading="lazy" onerror="this.remove()">':'')+'<i>'+ini+'</i></span>';
  }
  /* 1) ผู้ใช้งาน */
  get('/api/public/recent-users').then(function(d){
    var items=(d&&d.items)||(MOCK&&MOCK.users)||[];
    cycle(layer(cards[0],'sb-users'),items,function(u){
      return '<div class="sb-item sb-user"><span class="sb-av">'+(u.avatar?'<img src="'+esc(u.avatar)+'" alt="" onerror="this.remove()">':'')+'<i>'+esc(Array.from(u.name)[0])+'</i></span><b>'+esc(u.name)+'</b></div>';
    },2400,0);
  });
  /* 2) สินค้า */
  var sf=(window.StorefrontData&&StorefrontData.fetchData)?StorefrontData.fetchData().catch(function(){return null}):get('/api/public/storefront');
  Promise.resolve(sf).then(function(d){
    var items=(d&&d.products)||(MOCK&&MOCK.products)||[];
    cycle(layer(cards[1],'sb-prods'),items,function(p){
      var price=p.priceText;
      if(!price&&window.StorefrontData){var v=StorefrontData.productDisplayPrice(p);if(v!=null)price=StorefrontData.formatKip(v)}
      return '<div class="sb-item sb-prod"><div class="sb-card">'+thumb(p.image_url,p.name)+'<span class="sb-nm">'+esc(p.name)+'</span><span class="sb-pr">'+esc(price||'')+'</span></div></div>';
    },2800,500);
  });
  /* 3) คลังสินค้า: รหัสหลอก เบลอหนัก */
  (function(){
    var l=layer(cards[2],'sb-codes'),A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',rows=[];
    function code(){var o='';for(var g=0;g<3;g++){for(var k=0;k<4;k++)o+=A.charAt(Math.floor(Math.random()*A.length));if(g<2)o+='-'}return o}
    for(var i=0;i<12;i++)rows.push('<span>'+code()+'</span>');
    var h=rows.join('');
    l.innerHTML='<div class="sb-scroll">'+h+h+'</div>';
  })();
  /* 4) ขายแล้ว: ของที่ขายแล้วจริง เบลอ */
  get('/api/public/recent-purchases').then(function(d){
    var items=(d&&d.items)||(MOCK&&MOCK.sold)||[];
    cycle(layer(cards[3],'sb-sold'),items,function(p){
      return '<div class="sb-item sb-prod"><div class="sb-card">'+thumb(p.image,p.productName||p.name)+'<span class="sb-nm">'+esc(p.productName||p.name)+'</span><span class="sb-ok">✓</span></div></div>';
    },2600,900);
  });
})();
