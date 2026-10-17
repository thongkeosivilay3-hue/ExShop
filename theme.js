/* theme.js — อนิเมชั่นเสริมของธีมใหม่: reveal ตอนเลื่อน, header เปลี่ยนตอนเลื่อน, การ์ดเอียงตามเมาส์ */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEL = '.stat-card,.why-card,.section-title,.promo,.cat-item,.prod-card,.rp-carousel,.p-card,.auth-card,.order-card,.topup-method,.lb-card';
  var io = 'IntersectionObserver' in window && !reduce ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.12, rootMargin:'0px 0px -40px 0px'}) : null;
  function tag(root){
    (root||document).querySelectorAll(SEL).forEach(function(el,i){
      if(el.dataset.rv) return; el.dataset.rv=1;
      if(!io){ return; }
      el.classList.add('rv'); el.style.setProperty('--d',(i%4)*0.07+'s'); io.observe(el);
    });
  }
  tag();
  // การ์ดที่ JS สร้างทีหลัง (หมวดหมู่/สินค้า/ซื้อล่าสุด)
  if('MutationObserver' in window){
    var t; new MutationObserver(function(){ clearTimeout(t); t=setTimeout(tag,60); }).observe(document.body,{childList:true,subtree:true});
  }
  var hdr = document.querySelector('header');
  function onScroll(){ if(hdr) hdr.classList.toggle('scrolled', (window.scrollY||0) > 12); }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  // เอียงการ์ดสินค้าตามเมาส์ (เฉพาะเดสก์ท็อป)
  if(!reduce && matchMedia('(hover:hover)').matches){
    document.addEventListener('mousemove',function(e){
      var c = e.target.closest && e.target.closest('.prod-card,.cat-item'); if(!c) return;
      var r=c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      c.style.transform='translateY(-6px) perspective(700px) rotateX('+(-y*5)+'deg) rotateY('+(x*6)+'deg)';
    });
    document.addEventListener('mouseout',function(e){
      var c = e.target.closest && e.target.closest('.prod-card,.cat-item'); if(c && !c.contains(e.relatedTarget)) c.style.transform='';
    });
  }
})();

/* ---------- เอฟเฟกต์อลังการ ---------- */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  var rnd=function(a,b){return a+Math.random()*(b-a)};
  // ฟองอากาศพื้นหลัง
  var bb=document.createElement('div'); bb.className='fx-bubbles';
  for(var i=0;i<16;i++){ var b=document.createElement('i'), s=rnd(16,52);
    b.style.cssText='left:'+rnd(2,96)+'%;width:'+s+'px;height:'+s+'px;--t:'+rnd(14,26)+'s;--dl:'+(-rnd(0,20))+'s;--dx:'+rnd(-40,40)+'px'; bb.appendChild(b); }
  document.body.appendChild(bb);
  // ฮีโร่: วงแสง + ออร์บ + ประกาย
  var hero=document.querySelector('.hero');
  if(hero){ var fx=document.createElement('div'); fx.className='fx-hero';
    [[-18,10,70],[78,58,54],[12,70,34],[88,6,26]].forEach(function(o,i){ var e=document.createElement('span'); e.className='orb';
      e.style.cssText='left:'+o[0]+'%;top:'+o[1]+'%;width:'+o[2]+'px;height:'+o[2]+'px;--t:'+(7+i*1.7)+'s;--dl:'+(-i*1.3)+'s;--dx:'+rnd(-20,24)+'px;--dy:'+rnd(-34,-14)+'px'; fx.appendChild(e); });
    for(var k=0;k<7;k++){ var sp=document.createElement('span'); sp.className='spark';
      sp.style.cssText='left:'+rnd(6,92)+'%;top:'+rnd(8,88)+'%;--t:'+rnd(2.4,4.6)+'s;--dl:'+(-rnd(0,4))+'s;width:'+rnd(9,16)+'px;height:'+rnd(9,16)+'px'; fx.appendChild(sp); }
    hero.appendChild(fx); }
  // ไฟสปอตตามตำแหน่งนิ้ว/เมาส์
  document.addEventListener('pointermove',function(e){
    var c=e.target.closest&&e.target.closest('.stat-card,.why-card,.rp-card,.prod-card'); if(!c) return;
    var r=c.getBoundingClientRect(); c.style.setProperty('--mx',(e.clientX-r.left)+'px'); c.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
  // ริปเปิลตอนกดปุ่ม
  document.addEventListener('pointerdown',function(e){
    var b=e.target.closest&&e.target.closest('.btn,.buy-btn,.login-btn'); if(!b||b.disabled) return;
    var r=b.getBoundingClientRect(), d=Math.max(r.width,r.height), s=document.createElement('span'); s.className='fx-ripple';
    s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';
    b.appendChild(s); setTimeout(function(){ s.remove(); },700);
  });
})();

/* ---------- ตัวเลขสถิตินับวิ่งขึ้นทุกครั้งที่ระบบอัปเดตค่า ---------- */
(function(){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.stat-value').forEach(function(el){
    var busy=false;
    var mo=new MutationObserver(function(){
      if(busy) return;
      var n=el.firstChild; if(!n||n.nodeType!==3) return;
      var v=parseFloat(String(n.nodeValue).replace(/[^0-9.]/g,'')); if(!(v>0)) return;
      busy=true; var t0=performance.now();
      (function tick(t){
        var p=Math.min(1,(t-t0)/1500), e=1-Math.pow(1-p,3);
        n.nodeValue=Math.round(v*e).toLocaleString('en-US');
        if(p<1) requestAnimationFrame(tick); else setTimeout(function(){ busy=false; },60);
      })(t0);
    });
    mo.observe(el,{childList:true,characterData:true,subtree:true});
  });
})();

/* โหลดฟอร์ม เຂົ້າສູ່ລະບົບ/ສະໝັກສະມາຊິກ แบบเลื่อนขึ้น (auth-modal) ให้ทุกหน้าที่ใช้ theme.js */
(function(){
  if(window.__amLoaded) return; window.__amLoaded=1;
  var l=document.createElement('link'); l.rel='stylesheet'; l.href='/auth-modal.css?v=20261017a'; document.head.appendChild(l);
  var s=document.createElement('script'); s.src='/auth-modal.js?v=20261017a'; s.defer=true; document.body.appendChild(s);
})();
