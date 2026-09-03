/* MoniKas Gold Native Lite v6
   Event driven: no MutationObserver, no 800ms polling. */
(function(){
'use strict';
const GOLD=new Set(['Ayah','Biyan','Eren','Bunda']);
const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
let buyback=2477000;
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
function isGold(){return GOLD.has(String($('fund')?.value||'').trim())}
function ensureBox(){
 const fund=$('fund'),amount=$('amount'),form=$('txForm');
 if(!fund||!amount||!form)return false;
 let box=$('goldNativeBox');
 if(!box){
  box=document.createElement('div');box.id='goldNativeBox';
  box.style.cssText='display:none;margin:0 0 10px;padding:14px;border:1.5px solid #e7b84b;border-radius:14px;background:#fffbeb';
  box.innerHTML='<b>🪙 Tabungan Emas</b><div style="font-size:12px;color:#64748b;margin:4px 0 10px">Masukkan jumlah emas dalam gram. Nilai rupiah dihitung otomatis.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Jumlah Emas (gram)</div><input id="goldNativeGrams" class="input" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="contoh 2,5"></div><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Nilai Rupiah</div><input id="goldNativeValue" class="input" type="text" readonly placeholder="Otomatis"></div></div><div id="goldNativePrice" style="font-size:11px;color:#64748b;margin-top:7px"></div>';
  (amount.closest('.row')||amount.parentElement).insertAdjacentElement('beforebegin',box);
  $('goldNativeGrams').addEventListener('input',calc);
 }
 amount.dataset.nativePlaceholder ||= 'Nominal (Rp)';
 const gold=isGold();
 amount.readOnly=gold;
 amount.placeholder=gold?'Nilai Rupiah (otomatis)':amount.dataset.nativePlaceholder;
 box.style.display=gold?'block':'none';
 calc();
 if(!fund.dataset.goldLite){fund.dataset.goldLite='1';fund.addEventListener('change',apply)}
 if(!form.dataset.goldLite){form.dataset.goldLite='1';form.addEventListener('submit',prepare,true)}
 return true;
}
function apply(){ensureBox()}
function calc(){const g=Number($('goldNativeGrams')?.value||0),v=Math.round(g*buyback);if($('goldNativeValue'))$('goldNativeValue').value=g?rupiah(v):'';if($('goldNativePrice'))$('goldNativePrice').textContent='Harga buyback: '+rupiah(buyback)+'/gram';if($('amount')&&isGold())$('amount').value=g?String(v):''}
function hidden(name,value){const f=$('txForm');let e=f.querySelector('[data-gold-lite="'+name+'"]');if(!e){e=document.createElement('input');e.type='hidden';e.name=name;e.dataset.goldLite=name;f.appendChild(e)}e.value=String(value)}
function prepare(ev){if(!isGold())return;const g=Number($('goldNativeGrams')?.value||0);if(!(g>0)){ev.preventDefault();ev.stopImmediatePropagation();alert('Untuk Tabungan Emas, masukkan jumlah emas dalam gram.');return false}const v=Math.round(g*buyback);$('amount').value=String(v);hidden('goldGrams',g);hidden('goldPrice',buyback);hidden('goldValue',v);hidden('goldValuation','buyback');hidden('goldPriceDate','');hidden('fund',$('fund').value);window.__MONIKAS_GOLD={goldGrams:g,goldPrice:buyback,goldValue:v,goldValuation:'buyback',goldPriceDate:'',fund:$('fund').value}}
function price(){const cb='mkGoldLite_'+Date.now();const s=document.createElement('script');window[cb]=r=>{try{if(r&&r.ok&&Number(r.buyback)>0)buyback=Number(r.buyback)}finally{calc();delete window[cb];s.remove()}};s.onerror=()=>{delete window[cb];s.remove()};s.src=GAS+'?action=getGoldPrice&callback='+cb+'&_='+Date.now();document.head.appendChild(s)}
function start(){ensureBox();price();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
