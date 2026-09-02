/* MoniKas - final source funds authority */
(function(){
  'use strict';
  const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
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
  const HIDE=['Gaji','Usaha','Pendapatan Sampingan','Bonus / THR','Investasi'];
  const FUND_KEY='monikas_selected_fund';
  let funds=[];
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const attr=esc;
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);

  function jsonp(url){return new Promise((resolve,reject)=>{const cb='__mk_final_'+Date.now()+'_'+Math.floor(Math.random()*10000);const s=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove()}window[cb]=v=>{cleanup();resolve(v)};s.onerror=()=>{cleanup();reject(new Error('network'))};s.src=url+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)});}
  const getFunds=()=>jsonp(GAS+'?action=getFunds');
  const post=(action,payload)=>fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload||{}))});

  async function ensureBackend(){
    try{
      const r=await getFunds();
      funds=Array.isArray(r?.data)?r.data:[];
      const have=new Set(funds.map(f=>f.name));
      for(const d of DESIRED) if(!have.has(d.name)) await post('addFund',{name:d.name,opening:0}).catch(()=>{});
      for(const f of funds) if(HIDE.includes(f.name) && f.active!==false) await post('updateFund',{id:f.id,name:f.name,active:false}).catch(()=>{});
      const fresh=await getFunds().catch(()=>null); if(fresh?.ok) funds=fresh.data||funds;
    }catch(e){}
  }

  function renderCards(){
    const grid=$('fundsGrid'); if(!grid)return;
    const map=new Map(funds.map(f=>[f.name,f]));
    grid.innerHTML=DESIRED.map(d=>{const f=map.get(d.name)||{balance:0,income:0,expense:0};return `<div class="fund-final-card"><div class="fund-final-head"><b>${esc(d.name)}</b><span class="pill">${esc(d.group)}</span></div><div class="fund-final-balance">${rupiah(f.balance)}</div><div class="fund-final-meta">Masuk ${rupiah(f.income)} • Keluar ${rupiah(f.expense)}</div></div>`}).join('');
    const section=grid.closest('.card.section')||grid.parentElement;
    if(section){const add=section.querySelector('#addFundBtn');if(add)add.style.display='none';section.querySelectorAll('.fund-v5-manager,.fund-v5-add').forEach(el=>el.style.display='none');}
  }

  function renderSelect(){
    const s=$('fund');if(!s)return;
    const current=localStorage.getItem(FUND_KEY)||'Bank Jago';
    const groups=['Bank','Tabungan Emas','Lainnya'];
    let html='';
    for(const g of groups){const list=DESIRED.filter(d=>d.group===g);if(!list.length)continue;html+=`<optgroup label="${attr(g)}">`+list.map(d=>`<option value="${attr(d.name)}">${esc(d.name)}</option>`).join('')+'</optgroup>';}
    s.innerHTML=html;
    s.value=DESIRED.some(d=>d.name===current)?current:'Bank Jago';
    localStorage.setItem(FUND_KEY,s.value);
    const f=funds.find(x=>x.name===s.value);if($('fundHint'))$('fundHint').textContent=`Saldo ${s.value}: ${rupiah(f?.balance||0)}`;
    s.onchange=()=>{localStorage.setItem(FUND_KEY,s.value);const x=funds.find(y=>y.name===s.value);if($('fundHint'))$('fundHint').textContent=`Saldo ${s.value}: ${rupiah(x?.balance||0)}`};
  }

  function cleanLegacyNodes(){
    const bad=/^(Kas Utama|Gaji|Usaha|Pendapatan Sampingan|Bonus \/ THR|Investasi|Lainnya)$/i;
    document.querySelectorAll('.fund,.fund-v5-card,.fund-row').forEach(el=>{const txt=(el.textContent||'').trim().split(/\s+/).slice(0,5).join(' ');if(el.matches('.fund')&&bad.test(txt))el.remove()});
  }

  async function run(){
    await ensureBackend();
    renderCards();
    renderSelect();
    cleanLegacyNodes();
    setTimeout(cleanLegacyNodes,500);
    setTimeout(cleanLegacyNodes,1500);
    setInterval(async()=>{await ensureBackend();renderCards();renderSelect();cleanLegacyNodes()},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250));else setTimeout(run,250);
})();
