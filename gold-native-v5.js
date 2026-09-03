/* MoniKas Gold UI v7
   Lightweight: event-driven, Pegadaian valuation, gram-first cards + form. */
(function(){
'use strict';
const GOLD=new Set(['Ayah','Biyan','Eren','Bunda']);
const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
let goldPrice=0,goldSource='Pegadaian';
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const grams=n=>new Intl.NumberFormat('id-ID',{minimumFractionDigits:3,maximumFractionDigits:3}).format(Number(n)||0);
function isGold(){return GOLD.has(String($('fund')?.value||'').trim())}
function jsonp(url){return new Promise((resolve,reject)=>{const cb='mkGold_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');const tm=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);function cleanup(){clearTimeout(tm);try{delete window[cb]}catch(e){}s.remove()}window[cb]=v=>{cleanup();resolve(v)};s.onerror=()=>{cleanup();reject(new Error('network'))};s.src=url+'&callback='+cb+'&_='+Date.now();document.head.appendChild(s)})}
function styleGoldCard(card,name,stat){
 card.classList.add('mk-gold-card');
 const bal=card.querySelector('.fund-bal'),meta=card.querySelector('.fund-meta');
 if(!bal||!meta)return;
 let g=Number(stat?.goldGrams||0),cash=Number(stat?.balance||0);
 if(g<=0&&cash>0&&goldPrice>0)g=cash/goldPrice;
 const value=g*goldPrice;
 bal.innerHTML='<span class="mk-gold-grams">'+grams(g)+' gr</span>';
 meta.innerHTML='<span class="mk-gold-value">Senilai <b>'+rupiah(value)+'</b></span>'+(goldPrice>0?'<span class="mk-gold-price">Harga Pegadaian '+rupiah(goldPrice)+'/gr</span>':'');
}
function restyleGoldCards(stats){
 const root=$('funds');if(!root)return;
 root.querySelectorAll('.fund').forEach(card=>{
  const name=card.querySelector('.fund-name')?.textContent?.trim()||'';
  if(GOLD.has(name))styleGoldCard(card,name,stats?.[name]);
 });
}
function addGoldCardStyles(){
 if($('mkGoldStyles'))return;
 const s=document.createElement('style');s.id='mkGoldStyles';s.textContent=`
 .mk-gold-card{background:linear-gradient(135deg,#fffdf3,#f8fafc);border:1px solid #eadf9b}
 .mk-gold-card .fund-bal{color:#d49b00;font-size:28px;line-height:1.05;margin-top:8px}
 .mk-gold-grams{font-weight:950;letter-spacing:-.02em}
 .mk-gold-value{display:block;color:#334155;font-size:13px;margin-top:6px}
 .mk-gold-value b{font-weight:950;color:#0f172a}
 .mk-gold-price{display:block;color:#64748b;font-size:10px;margin-top:4px}
 .mk-gold-card .fund-meta{font-size:12px}
 #goldNativeBox{background:linear-gradient(135deg,#fffbeb,#fff)}
 `;document.head.appendChild(s);
}
function ensureGoldForm(){
 const fund=$('fund'),amount=$('amount'),form=$('txForm');
 if(!fund||!amount||!form)return;
 let box=$('goldNativeBox');
 if(!box){
  box=document.createElement('div');box.id='goldNativeBox';
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:10px"><div><b>🪙 Tabungan Emas</b><div style="font-size:12px;color:#64748b;margin-top:4px">Masukkan emas dalam gram. Nilai rupiah dihitung otomatis.</div></div><span style="font-size:11px;font-weight:900;padding:5px 9px;border-radius:999px;background:#fef3c7;color:#92400e">GRAM</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Jumlah Emas (gram)</div><input id="goldNativeGrams" class="input" type="number" min="0.0001" step="0.0001" inputmode="decimal" placeholder="contoh 2,5"></div><div><div style="font-size:11px;color:#64748b;margin-bottom:5px">Nilai Rupiah</div><input id="goldNativeValue" class="input" type="text" readonly placeholder="Otomatis"></div></div><div id="goldNativePrice" style="font-size:11px;color:#64748b;margin-top:8px"></div>';
  box.style.cssText='display:none;margin:0 0 10px;padding:14px;border:1.5px solid #e7b84b;border-radius:14px';
  (amount.closest('.row')||amount.parentElement).insertAdjacentElement('beforebegin',box);
  $('goldNativeGrams').addEventListener('input',calcGold);
 }
 const gold=isGold();amount.readOnly=gold;amount.placeholder=gold?'Nilai Rupiah (otomatis)':'Nominal (Rp)';box.style.display=gold?'block':'none';calcGold();
 if(!fund.dataset.goldV7){fund.dataset.goldV7='1';fund.addEventListener('change',ensureGoldForm)}
 if(!form.dataset.goldV7){form.dataset.goldV7='1';form.addEventListener('submit',prepareGold,true)}
}
function calcGold(){const g=Number($('goldNativeGrams')?.value||0),v=Math.round(g*(goldPrice||0));if($('goldNativeValue'))$('goldNativeValue').value=v?rupiah(v):'';if($('goldNativePrice'))$('goldNativePrice').textContent=goldPrice?'Harga Pegadaian: '+rupiah(goldPrice)+'/gram':'Mengambil harga Pegadaian…';if($('amount')&&isGold())$('amount').value=v?String(v):''}
function hidden(name,value){const f=$('txForm');let e=f.querySelector('[data-gold-v7="'+name+'"]');if(!e){e=document.createElement('input');e.type='hidden';e.name=name;e.dataset.goldV7=name;f.appendChild(e)}e.value=String(value)}
function prepareGold(ev){if(!isGold())return;const g=Number($('goldNativeGrams')?.value||0);if(!(g>0)){ev.preventDefault();ev.stopImmediatePropagation();alert('Untuk Tabungan Emas, masukkan jumlah emas dalam gram.');return false}const v=Math.round(g*(goldPrice||0));$('amount').value=String(v);hidden('goldGrams',g);hidden('goldPrice',goldPrice);hidden('goldValue',v);hidden('goldValuation','pegadaian');hidden('goldPriceDate',new Date().toISOString().slice(0,10));hidden('fund',$('fund').value);window.__MONIKAS_GOLD={goldGrams:g,goldPrice:goldPrice,goldValue:v,goldValuation:'pegadaian',goldPriceDate:new Date().toISOString().slice(0,10),fund:$('fund').value}}
async function loadPegadaianPrice(){
 try{
  const urls=['https://r.jina.ai/https://pegadaian.co.id/harga-emas','https://r.jina.ai/http://pegadaian.co.id/harga-emas'];
  for(const u of urls){
   try{
    const text=await fetch(u,{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(new Error('http')));
    const m=text.match(/Tabungan Emas[\s\S]{0,1800}?(?:Rp\s*)?([0-9][0-9.]+)\s*(?:per|\/|atau)\s*0[,.]01\s*gram/i);
    if(m){goldPrice=Number(m[1].replace(/\./g,''))*100;goldSource='Pegadaian';calcGold();return true}
    const nums=[...text.matchAll(/Rp\s*([0-9][0-9.]+)\s*(?:per|\/|atau)\s*0[,.]01\s*gram/gi)].map(x=>Number(x[1].replace(/\./g,''))*100).filter(n=>n>0);
    if(nums.length){goldPrice=nums[0];goldSource='Pegadaian';calcGold();return true}
   }catch(e){}
  }
 }catch(e){}
 try{const r=await jsonp(GAS+'?action=getGoldPrice');if(r?.ok&&Number(r.buyback)>0){goldPrice=Number(r.buyback);goldSource='Server';calcGold();return false}}catch(e){}
 return false;
}
function loadGoldFunds(){jsonp(GAS+'?action=getFunds').then(r=>{if(!r?.ok)return;const stats={};(r.data||[]).forEach(x=>{if(GOLD.has(x.name))stats[x.name]=x});restyleGoldCards(stats)}).catch(()=>{});}
function start(){addGoldCardStyles();ensureGoldForm();loadGoldFunds();loadPegadaianPrice();const root=$('funds');if(root){const mo=new MutationObserver(()=>restyleGoldCards(window.__mkGoldStats||{}));mo.observe(root,{childList:true});window.__mkGoldStats={};} }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
