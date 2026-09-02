// MoniKas cloud authority bridge
// Google Sheet is the authoritative source for Dashboard and Rekap.
(function(){
  'use strict';

  const CLOUD_KEY='monikas_cloud_snapshot';
  const GAS_URL='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const POLL_MS=30000;

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

  function applyCloud(records){
    // Replace the app transaction dataset with the cloud-authoritative snapshot.
    // Keep budgets from the existing app state.
    try{
      if(typeof data!=='undefined'){
        data.transactions=records;
        if(!data.budgets) data.budgets={};
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
      }
    }catch(e){ console.warn('MoniKas cloud apply:',e); }

    try{
      localStorage.setItem(CLOUD_KEY,JSON.stringify({updatedAt:new Date().toISOString(),count:records.length,transactions:records}));
    }catch(e){}

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
    }catch(e){
      showError(e.message||String(e));
    }
  }

  function start(){
    // Start after the main page has initialized its global state/functions.
    setTimeout(refresh,1200);
    setInterval(refresh,POLL_MS);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
