// MoniKas cloud authority bridge + source dana authority
(function(){
  'use strict';

  const CLOUD_KEY='monikas_cloud_snapshot';
  const GAS_URL='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
  const POLL_MS=30000;
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

  function normalizeDate(v){
    const s=String(v||'').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    let m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');}
    const d=new Date(s);
    return isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function normalizeNumber(v){
    if(typeof v==='number' && isFinite(v)) return v;
    const s=String(v??'').replace(/[^0-9,.-]/g,'').trim();
    if(!s) return 0;
    if(s.includes('.') && s.includes(',')) return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s)) return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s)) return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }

  function jsonp(){
    return new Promise((resolve,reject)=>{
      const cb='mkCloud_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const s=document.createElement('script');
      let timer=setTimeout(()=>{cleanup();reject(new Error('Timeout membaca Google Sheet'))},15000);
      function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove();}
      window[cb]=payload=>{cleanup();resolve(payload)};
      s.onerror=()=>{cleanup();reject(new Error('Apps Script tidak dapat dihubungi'))};
      s.src=GAS_URL+'?action=getTransactions&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  function normalize(records){
    return (Array.isArray(records)?records:[]).map(t=>({
      id:String(t.id||''),
      date:normalizeDate(t.date),
      type:String(t.type||'expense').toLowerCase()==='income'?'income':'expense',
      merchant:String(t.merchant||''),
      desc:String(t.description||t.desc||''),
      category:String(t.category||'Lainnya'),
      amount:normalizeNumber(t.amount),
      paymentMethod:String(t.paymentMethod||''),
      ocrConfidence:String(t.ocrConfidence||''),
      ocrText:String(t.ocrText||''),
      receiptUrl:String(t.receiptUrl||''),
      receiptFileId:String(t.receiptFileId||''),
      source:'Google Sheet',
      synced:true
    })).filter(t=>t.id && t.date);
  }

  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

  function jsonpFunds(){
    return new Promise((resolve,reject)=>{
      const cb='mkFunds_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const s=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('Timeout membaca pos dana'))},12000);
      function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove();}
      window[cb]=v=>{cleanup();resolve(v)};
      s.onerror=()=>{cleanup();reject(new Error('Gagal membaca pos dana'))};
      s.src=GAS_URL+'?action=getFunds&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadFunds(){
    try{
      const res=await jsonpFunds();
      return Array.isArray(res?.data)?res.data:[];
    }catch(e){return [];}
  }

  function injectStyle(){
    if(document.getElementById('mkSourceAuthorityStyle')) return;
    const st=document.createElement('style');
    st.id='mkSourceAuthorityStyle';
    st.textContent=`
      .mk-source-authority-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .mk-source-card{background:#f8fafc;border:1px solid #dbe3ee;border-radius:14px;padding:13px}
      .mk-source-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .mk-source-balance{font-size:20px;font-weight:900;color:#2563eb;margin-top:6px}
      .mk-source-meta{font-size:11px;color:#64748b;margin-top:3px}
      .mk-source-group{display:inline-flex;align-items:center;font-size:11px;font-weight:800;color:#1d4ed8;background:#dbeafe;padding:5px 8px;border-radius:999px}
      @media(max-width:620px){.mk-source-authority-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function ensureSection(){
    let grid=document.getElementById('fundsGrid');
    if(grid) return grid;
    const headings=[...document.querySelectorAll('h2,h3')];
    const heading=headings.find(x=>/Pos Pemasukan|Sumber Dana/i.test(x.textContent||''));
    if(!heading) return null;
    const section=heading.closest('.section,.card') || heading.parentElement?.parentElement;
    if(!section)return null;
    grid=document.createElement('div');
    grid.id='fundsGrid';
    grid.className='mk-source-authority-grid';
    heading.closest('.section-head')?.after(grid);
    return grid;
  }

  function renderSourceCards(funds){
    const grid=ensureSection();
    if(!grid)return;
    const map=new Map((funds||[]).map(f=>[String(f.name||'').trim(),f]));
    grid.className='mk-source-authority-grid';
    grid.innerHTML=DESIRED.map(d=>{
      const f=map.get(d.name)||{balance:0,income:0,expense:0};
      return `<div class="mk-source-card"><div class="mk-source-head"><b>${esc(d.name)}</b><span class="mk-source-group">${esc(d.group)}</span></div><div class="mk-source-balance">${rupiah(f.balance)}</div><div class="mk-source-meta">Masuk ${rupiah(f.income)} • Keluar ${rupiah(f.expense)}</div></div>`;
    }).join('');

    const sourceSection=grid.closest('.card.section')||grid.parentElement;
    if(sourceSection){
      sourceSection.querySelectorAll('#addFundBtn,.fund-v5-manager,.fund-v5-add,.fund-manager').forEach(el=>el.remove());
    }
  }

  function renderFundSelect(funds){
    const s=document.getElementById('fund');
    if(!s)return;
    let html='';
    for(const g of ['Bank','Tabungan Emas','Lainnya']){
      const list=DESIRED.filter(x=>x.group===g);
      html+=`<optgroup label="${esc(g)}">${list.map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</optgroup>`;
    }
    const current=localStorage.getItem(FUND_KEY)||'Bank Jago';
    s.innerHTML=html;
    s.value=DESIRED.some(x=>x.name===current)?current:'Bank Jago';
    localStorage.setItem(FUND_KEY,s.value);
    const f=(funds||[]).find(x=>String(x.name||'')===s.value);
    const hint=document.getElementById('fundHint');
    if(hint)hint.textContent=`Saldo ${s.value}: ${rupiah(f?.balance||0)}`;
  }

  function removeLegacySourceCards(){
    const bad=/^(Kas Utama|Gaji|Usaha|Pendapatan Sampingan|Bonus \/ THR|Investasi|Lainnya)$/i;
    document.querySelectorAll('.fund,.fund-v5-card,.fund-row').forEach(el=>{
      const text=(el.textContent||'').trim();
      const title=(el.querySelector('b,strong,.fhead')?.textContent||text.split(/\s+/).slice(0,4).join(' ')).trim();
      if(bad.test(title))el.remove();
    });
  }

  function applyCloud(records){
    try{
      if(typeof data!=='undefined'){
        data.transactions=records;
        if(!data.budgets) data.budgets={};
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
      }
    }catch(e){ console.warn('MoniKas cloud apply:',e); }
    try{localStorage.setItem(CLOUD_KEY,JSON.stringify({updatedAt:new Date().toISOString(),count:records.length,transactions:records}));}catch(e){}
    const status=document.getElementById('statusText');
    const pill=document.getElementById('syncPill');
    if(status) status.textContent='Cloud aktif • '+records.length+' transaksi terbaca';
    if(pill) pill.textContent='Sheets aktif';
    const badge=document.getElementById('cloudMonitorStatus');
    if(badge) badge.textContent='✅ '+records.length+' transaksi Google Sheet aktif';
  }

  function showError(message){
    const status=document.getElementById('statusText');
    const pill=document.getElementById('syncPill');
    if(status) status.textContent='Cloud gagal dibaca • data terakhir tetap digunakan';
    if(pill) pill.textContent='Perlu sinkronisasi';
    console.warn('MoniKas cloud monitoring:',message);
  }

  async function refresh(){
    try{
      const payload=await jsonp();
      if(!payload || payload.ok!==true) throw new Error(payload&&payload.error||'Respons cloud tidak valid');
      const records=normalize(payload.data);
      applyCloud(records);
      injectStyle();
      const funds=await loadFunds();
      renderSourceCards(funds);
      renderFundSelect(funds);
      removeLegacySourceCards();
    }catch(e){
      showError(e.message||String(e));
      injectStyle();
      const funds=await loadFunds();
      renderSourceCards(funds);
      renderFundSelect(funds);
      removeLegacySourceCards();
    }
  }

  function start(){
    setTimeout(refresh,1200);
    setInterval(refresh,POLL_MS);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();