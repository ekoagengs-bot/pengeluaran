// MoniKas cloud authority bridge + source dana authority FINAL
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
  const DESIRED_NAMES=new Set(DESIRED.map(x=>x.name));
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
    return (Array.isArray(records)?records:[]).map(t=>{
      const rawFund=String(t.fund||t.fundSource||'').trim();
      return {
        id:String(t.id||''),
        date:normalizeDate(t.date),
        type:String(t.type||'expense').toLowerCase()==='income'?'income':'expense',
        merchant:String(t.merchant||''),
        desc:String(t.description||t.desc||''),
        description:String(t.description||t.desc||''),
        category:String(t.category||'Lainnya'),
        amount:normalizeNumber(t.amount),
        paymentMethod:String(t.paymentMethod||''),
        ocrConfidence:String(t.ocrConfidence||''),
        ocrText:String(t.ocrText||''),
        receiptUrl:String(t.receiptUrl||''),
        receiptFileId:String(t.receiptFileId||''),
        source:'Google Sheet',
        fund:DESIRED_NAMES.has(rawFund)?rawFund:'Kas Utama',
        synced:true
      };
    }).filter(t=>t.id && t.date);
  }

  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

  function makeFundsFromTransactions(){
    const result=DESIRED.map((d,i)=>({id:'authority_'+i,name:d.name,opening:0,income:0,expense:0,balance:0,active:true,group:d.group}));
    const map=new Map(result.map(f=>[f.name,f]));
    if(typeof data!=='undefined' && Array.isArray(data.transactions)){
      data.transactions.forEach(t=>{
        const name=DESIRED_NAMES.has(String(t.fund||t.fundSource||''))?String(t.fund||t.fundSource):'Kas Utama';
        const f=map.get(name)||map.get('Kas Utama');
        const a=Number(t.amount)||0;
        if(String(t.type).toLowerCase()==='income') f.income+=a; else f.expense+=a;
      });
    }
    result.forEach(f=>f.balance=f.opening+f.income-f.expense);
    return result;
  }

  function enforceSourceUI(){
    if(typeof data==='undefined') return;
    funds=makeFundsFromTransactions();
    if(typeof window.renderFunds==='function' && window.renderFunds.__mkAuthority!==true){
      const original=window.renderFunds;
      const authorityRenderFunds=function(){
        funds=makeFundsFromTransactions();
        const balances=fundBalances();
        const grid=document.getElementById('fundsGrid');
        if(grid){
          grid.innerHTML=DESIRED.map(d=>{
            const b=balances[d.name]||{balance:0,income:0,expense:0};
            return `<div class="fund"><div class="fhead"><b>${esc(d.name)}</b><span class="pill">${b.balance<0?'Minus':'Aktif'}</span></div><div class="fbalance ${b.balance<0?'red':'blue'}">${rupiah(b.balance)}</div><div class="fmeta">Masuk ${rupiah(b.income)} • Keluar ${rupiah(b.expense)}</div></div>`;
          }).join('');
        }
        const s=document.getElementById('fund');
        if(s){
          const current=localStorage.getItem(FUND_KEY)||'Bank BNI';
          let html='';
          for(const g of ['Bank','Tabungan Emas','Lainnya']){
            const list=DESIRED.filter(x=>x.group===g);
            html+=`<optgroup label="${esc(g)}">${list.map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</optgroup>`;
          }
          s.innerHTML=html;
          s.value=DESIRED_NAMES.has(current)?current:'Bank BNI';
          localStorage.setItem(FUND_KEY,s.value);
          if(typeof updateFundHint==='function') updateFundHint();
        }
      };
      authorityRenderFunds.__mkAuthority=true;
      window.renderFunds=authorityRenderFunds;
      void original;
    }
    if(typeof window.renderFunds==='function') window.renderFunds();
  }

  function injectStyle(){
    if(document.getElementById('mkSourceAuthorityStyle')) return;
    const st=document.createElement('style');
    st.id='mkSourceAuthorityStyle';
    st.textContent=`
      .mk-source-authority-note{font-size:12px;color:#64748b;margin-top:6px}
      .fund-authority-hidden{display:none!important}
    `;
    document.head.appendChild(st);
  }

  function cleanLegacyDOM(){
    document.querySelectorAll('.fund-v5-manager,.fund-v5-add,.fund-manager,.fund-final-manager').forEach(el=>el.remove());
    const grid=document.getElementById('fundsGrid');
    if(grid){
      [...grid.children].forEach(card=>{
        const title=(card.querySelector('b')?.textContent||'').trim();
        if(!DESIRED_NAMES.has(title)) card.remove();
      });
    }
    const s=document.getElementById('fund');
    if(s){
      [...s.options].forEach(o=>{if(!DESIRED_NAMES.has(o.value))o.remove();});
    }
  }

  async function loadFundsAndEnforce(){
    try{
      const res=await new Promise((resolve,reject)=>{
        const cb='mkFunds_'+Date.now()+'_'+Math.floor(Math.random()*100000);
        const s=document.createElement('script');
        const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);
        function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove();}
        window[cb]=v=>{cleanup();resolve(v)};s.onerror=()=>{cleanup();reject(new Error('network'))};
        s.src=GAS_URL+'?action=getFunds&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s);
      });
      void res;
    }catch(e){}
    enforceSourceUI();
    cleanLegacyDOM();
  }

  function applyCloud(records){
    try{
      if(typeof data!=='undefined'){
        data.transactions=records;
        if(!data.budgets) data.budgets={};
        if(typeof saveLocal==='function') saveLocal();
        enforceSourceUI();
        if(typeof render==='function') render();
        enforceSourceUI();
      }
    }catch(e){ console.warn('MoniKas cloud apply:',e); }

    try{localStorage.setItem(CLOUD_KEY,JSON.stringify({updatedAt:new Date().toISOString(),count:records.length,transactions:records}));}catch(e){}
    const status=document.getElementById('statusText');
    const pill=document.getElementById('syncPill');
    if(status) status.textContent='Cloud aktif • '+records.length+' transaksi terbaca';
    if(pill) pill.textContent='Sheets aktif';
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
      await loadFundsAndEnforce();
    }catch(e){
      showError(e.message||String(e));
      injectStyle();
      enforceSourceUI();
      cleanLegacyDOM();
    }
  }

  function start(){
    setTimeout(refresh,1000);
    setInterval(refresh,POLL_MS);
    setTimeout(()=>{enforceSourceUI();cleanLegacyDOM();},2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();