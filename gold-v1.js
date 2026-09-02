/* MoniKas Gold v5 - permanent gram-first UI for Ayah/Biyan/Eren/Bunda */
(function(){
'use strict';
const GOLD=new Set(['Ayah','Biyan','Eren','Bunda']);
const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
let buyback=2477000;
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
function gold(){return GOLD.has(String($('fund')?.value||'').trim())}
function ensure(){
 const fund=$('fund'), amount=$('amount'), form=$('txForm');
 if(!fund||!amount||!form)return;
 let box=$('monikasGoldNative');
 if(!box){
  box=document.createElement('div');box.id='monikasGoldNative';
  box.style.cssText='display:none;margin:0 0 10px;padding:14px;border:1.5px solid #e7b84b;border-radius:14px;background:#fffbeb';
  box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><b style="font-size:15px">🪙 Tabungan Emas</b><div style="font-size:12px;color:#64748b;margin-top:3px">Untuk Ayah, Biyan, Eren, dan Bunda gunakan gram emas.</div></div><span style="font-size:11px;font-weight:900;padding:5px 9px;border-radius:999px;background:#fef3c7;color:#92400e">GRAM</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Jumlah Emas (gram)</div><input id="monikasGoldGrams" class="input" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="contoh 2,5"></div><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Nilai Rupiah</div><input id="monikasGoldValue" class="input" type="text" readonly placeholder="Otomatis"></div></div><div id="monikasGoldPrice" style="font-size:11px;color:#64748b;margin-top:8px"></div>';
  const row=amount.closest('.row');
  if(row)row.insertAdjacentElement('beforebegin',box);else amount.parentElement.insertAdjacentElement('beforebegin',box);
  $('monikasGoldGrams').addEventListener('input',calc);
 }
 apply();
 if(!fund.dataset.monikasGold5){fund.dataset.monikasGold5='1';fund.addEventListener('change',apply,true)}
 if(!form.dataset.monikasGold5){form.dataset.monikasGold5='1';form.addEventListener('submit',validate,true)}
}
function apply(){
 const amount=$('amount'),box=$('monikasGoldNative'),is=gold();
 if(box)box.style.setProperty('display',is?'block':'none','important');
 if(amount){
  if(!amount.dataset.mkNormalPlaceholder)amount.dataset.mkNormalPlaceholder='Nominal (Rp)';
  amount.readOnly=is;
  amount.placeholder=is?'Nilai Rupiah (otomatis)':amount.dataset.mkNormalPlaceholder;
 }
 calc();
}
function calc(){
 const g=Number($('monikasGoldGrams')?.value||0),v=Math.round(g*buyback);
 if($('monikasGoldValue'))$('monikasGoldValue').value=g?rupiah(v):'';
 if($('monikasGoldPrice'))$('monikasGoldPrice').textContent=`Harga buyback: ${rupiah(buyback)}/gram`;
 if($('amount')&&gold())$('amount').value=g?String(v):'';
}
function validate(e){
 if(!gold())return;
 const form=$('txForm'),g=Number($('monikasGoldGrams')?.value||0),v=Math.round(g*buyback);
 if(!(g>0)){e.preventDefault();e.stopImmediatePropagation();alert('Untuk Tabungan Emas, masukkan jumlah emas dalam gram.');return false}
 $('amount').value=String(v);
 [['goldGrams',g],['goldPrice',buyback],['goldValue',v],['goldValuation','buyback'],['goldPriceDate',''],['fund',$('fund').value]].forEach(([n,x])=>{
  let el=form.querySelector('[data-mk-gold-field="'+n+'"]');
  if(!el){el=document.createElement('input');el.type='hidden';el.name=n;el.dataset.mkGoldField=n;form.appendChild(el)}
  el.value=String(x);
 });
}
function loadPrice(){
 const cb='mkGoldPrice5_'+Date.now(),s=document.createElement('script');
 window[cb]=r=>{try{if(r&&r.ok&&Number(r.buyback)>0)buyback=Number(r.buyback);calc()}finally{delete window[cb];s.remove()}};
 s.onerror=()=>{delete window[cb];s.remove()};
 s.src=GAS+'?action=getGoldPrice&callback='+cb+'&_='+Date.now();document.head.appendChild(s);
}
function init(){
 ensure();loadPrice();
 const mo=new MutationObserver(()=>ensure());mo.observe(document.body,{childList:true,subtree:true});
 setInterval(ensure,1000);setInterval(loadPrice,300000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
