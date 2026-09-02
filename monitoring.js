// MoniKas source-fund authority bridge
(function(){
  'use strict';
  const GAS_URL='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
  const DESIRED=[
    {name:'Bank BNI',group:'Bank'},
    {name:'Bank Jago',group:'Bank'},
    {name:'Bank BCA',group:'Bank'},
    {name:'Bank BSI',group:'Bank'},
    {name:'Ayah',group:'Tabungan Emas'},
    {name:'Biyan',group:'Tabungan Emas'},
    {name:'Eren',group:'Tabungan Emas'},
    {name:'Bunda',group:'Tabungan Emas'},
    {name:'Kas Utama',group:'Lainnya'},
    {name:'Lainnya',group:'Lainnya'}
  ];
  const NAMES=new Set(DESIRED.map(x=>x.name));
  const KEY='monikas_selected_fund';
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  function jsonp(url){return new Promise((resolve,reject)=>{const cb='mkSrc_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},10000);function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){}s.remove()}window[cb]=p=>{cleanup();resolve(p)};s.onerror=()=>{cleanup();reject(new Error('network'))};s.src=url+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)})}
  function injectStyle(){if(document.getElementById('mkSourceFinalStyle'))return;const s=document.createElement('style');s.id='mkSourceFinalStyle';s.textContent='.mk-source-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mk-source-card{background:#f8fafc;border:1px solid #dbe3ee;border-radius:14px;padding:13px}.mk-source-card .mk-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.mk-source-card .mk-balance{font-size:20px;font-weight:900;color:#2563eb;margin-top:6px}.mk-source-card .mk-meta{font-size:11px;color:#64748b;margin-top:3px}.mk-source-group{font-size:11px;font-weight:800;color:#1d4ed8;background:#dbeafe;padding:5px 8px;border-radius:999px}@media(max-width:620px){.mk-source-grid{grid-template-columns:1fr!important}}';document.head.appendChild(s)}
  function ensureGrid(){const g=document.getElementById('fundsGrid');if(!g)return null;g.classList.add('mk-source-grid');return g}
  function renderSources(cloudFunds){const grid=ensureGrid();if(!grid)return;const map=new Map((cloudFunds||[]).map(f=>[String(f.name||'').trim(),f]));grid.innerHTML=DESIRED.map(d=>{const f=map.get(d.name)||{balance:0,income:0,expense:0};return `<div class="mk-source-card"><div class="mk-head"><b>${esc(d.name)}</b><span class="mk-source-group">${esc(d.group)}</span></div><div class="mk-balance">${rupiah(f.balance)}</div><div class="mk-meta">Masuk ${rupiah(f.income)} • Keluar ${rupiah(f.expense)}</div></div>`}).join('');
    const select=document.getElementById('fund');if(select){const current=localStorage.getItem(KEY)||'Bank BNI';select.innerHTML=DESIRED.map(d=>`<option value="${esc(d.name)}">${esc(d.name)}</option>`).join('');select.value=NAMES.has(current)?current:'Bank BNI';localStorage.setItem(KEY,select.value)}
    const hint=document.getElementById('fundHint');if(hint){const f=map.get(select?.value||'Bank BNI')||{};hint.textContent=`Saldo pos ${select?.value||'Bank BNI'}: ${rupiah(f.balance||0)}. Pemasukan menambah saldo, pengeluaran mengurangi saldo.`}
  }
  function cleanLegacy(){document.querySelectorAll('.fund-v5-manager,.fund-v5-card,.fund-row,.fund-final-manager').forEach(el=>el.remove());const grid=document.getElementById('fundsGrid');if(grid)grid.classList.add('mk-source-grid');const select=document.getElementById('fund');if(select)[...select.options].forEach(o=>{if(!NAMES.has(o.value))o.remove()})}
  async function refresh(){try{injectStyle();const r=await jsonp(GAS_URL+'?action=getFunds');renderSources(r?.data||[]);cleanLegacy();}catch(e){cleanLegacy()}}
  function start(){setTimeout(refresh,1200);setInterval(refresh,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();