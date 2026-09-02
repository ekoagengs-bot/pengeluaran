/* MoniKas Gold Native v5 - permanent gram-first form */
(function(){
'use strict';
const GOLD=new Set(['Ayah','Biyan','Eren','Bunda']);
const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
let buyback=2477000;
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
function isGold(){return GOLD.has(String($('fund')?.value||'').trim())}
function install(){
 const fund=$('fund'), amount=$('amount'), form=$('txForm');
 if(!fund||!amount||!form)return;
 let box=$('goldNativeBox');
 if(!box){
  box=document.createElement('div'); box.id='goldNativeBox';
  box.style.cssText='display:none;margin:0 0 10px;padding:14px;border:1.5px solid #e7b84b;border-radius:14px;background:#fffbeb';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:10px"><div><b>🪙 Tabungan Emas</b><div style="font-size:12px;color:#64748b;margin-top:4px">Masukkan jumlah emas dalam gram. Nilai rupiah dihitung otomatis.</div></div><span style="font-size:11px;font-weight:900;padding:5px 9px;border-radius:999px;background:#fef3c7;color:#92400e">GRAM</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div style="font-size:11px;color:#64748b;margin-bottom:6px">Jumlah Emas (gram)</div><input id="goldNativeGrams" class="input" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="contoh 2,5"></div><div><div style="font-size:11px;color:#64748b;margin-bottom:6px">Nilai Rupiah</div><input id="goldNativeValue" class="input" type="text" readonly placeholder="Otomatis"></div></div><div id="goldNativePrice" style="font-size:11px;color:#64748b;margin-top:8px"></div>';
  (amount.closest('.row')||amount.parentElement).insertAdjacentElement('beforebegin',box);
  $('goldNativeGrams').addEventListener('input',calc);
 }
 if(!amount.dataset.nativePlaceholder)amount.dataset.nativePlaceholder='Nominal (Rp)';
 amount.readOnly=isGold(); amount.placeholder=isGold()?'Nilai Rupiah (otomatis)':amount.dataset.nativePlaceholder;
 box.style.setProperty('display',isGold()?'block':'none','important');
 calc();
 if(!fund.dataset.goldNativeV5){fund.dataset.goldNativeV5='1';fund.addEventListener('change',apply,true)}
 if(!form.dataset.goldNativeV5){form.dataset.goldNativeV5='1';form.addEventListener('submit',prepare,true)}
}
function apply(){install()}
function calc(){const g=Number($('goldNativeGrams')?.value||0),v=Math.round(g*buyback);if($('goldNativeValue'))$('goldNativeValue').value=g?rupiah(v):'';if($('goldNativePrice'))$('goldNativePrice').textContent='Harga buyback: '+rupiah(buyback)+'/gram';if($('amount')&&isGold())$('amount').value=g?String(v):''}
function hidden(name,value){const form=$('txForm');let e=form.querySelector('[data-gold-native="'+name+'"]');if(!e){e=document.createElement('input');e.type='hidden';e.name=name;e.dataset.goldNative=name;form.appendChild(e)}e.value=String(value)}
function prepare(ev){if(!isGold())return;const g=Number($('goldNativeGrams')?.value||0);if(!(g>0)){ev.preventDefault();ev.stopImmediatePropagation();alert('Untuk Tabungan Emas, masukkan jumlah emas dalam gram.');return false}const v=Math.round(g*buyback);$('amount').value=String(v);hidden('goldGrams',g);hidden('goldPrice',buyback);hidden('goldValue',v);hidden('goldValuation','buyback');hidden('goldPriceDate','');hidden('fund',$('fund').value);window.__MONIKAS_GOLD={goldGrams:g,goldPrice:buyback,goldValue:v,goldValuation:'buyback',goldPriceDate:'',fund:$('fund').value};}
function patchNetwork(){if(window.__monikasGoldNetwork)return;window.__monikasGoldNetwork=1;const orig=window.fetch;if(orig){window.fetch=function(input,init){const d=window.__MONIKAS_GOLD;if(d&&init&&typeof init.body==='string'){try{const o=JSON.parse(init.body);Object.assign(o,d,{amount:d.goldValue});init={...init,body:JSON.stringify(o)}}catch(e){try{const u=new URLSearchParams(init.body);Object.entries(d).forEach(([k,v])=>u.set(k,String(v)));u.set('amount',String(d.goldValue));init={...init,body:u.toString()}}catch(_){} } }return orig.call(this,input,init)}}if(window.XMLHttpRequest){const send=XMLHttpRequest.prototype.send;if(!send.__monikasGold){function s(body){const d=window.__MONIKAS_GOLD;if(d&&typeof body==='string'){try{const o=JSON.parse(body);Object.assign(o,d,{amount:d.goldValue});body=JSON.stringify(o)}catch(e){}}return send.call(this,body)}s.__monikasGold=1;XMLHttpRequest.prototype.send=s}}
function price(){const cb='mkGoldNative_'+Date.now();const s=document.createElement('script');window[cb]=r=>{try{if(r&&r.ok&&Number(r.buyback)>0)buyback=Number(r.buyback)}finally{calc();delete window[cb];s.remove()}};s.onerror=()=>{delete window[cb];s.remove()};s.src=GAS+'?action=getGoldPrice&callback='+cb+'&_='+Date.now();document.head.appendChild(s)}
function init(){install();patchNetwork();price();const mo=new MutationObserver(()=>install());mo.observe(document.body,{childList:true,subtree:true});setInterval(install,800);setInterval(price,300000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
