// MoniKas cloud-first watchdog.
// Keeps Dashboard/Rekap driven by Google Sheet data after the first cloud load.
(function(){
  'use strict';

  const GAS_URL='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const PERIOD_KEY='monikas_cloud_tx_cache_v1';
  let lastCloudCount=-1;
  let busy=false;

  function normDate(v){
    if(v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0,10);
    const s=String(v??'').trim();
    if(!s) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    let m=s.match(/^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{2,4})$/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');}
    const d=new Date(s);
    return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }

  function normNumber(v){
    const s=String(v??'').replace(/[^0-9,.-]/g,'').trim();
    if(!s) return 0;
    if(s.includes('.')&&s.includes(',')) return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s)) return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s)) return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }

  function jsonp(){
    return new Promise((resolve,reject)=>{
      const cb='__mk_fix_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const s=document.createElement('script');
      let done=false;
      const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove();fn(value)};
      const timer=setTimeout(()=>finish(reject,new Error('timeout')),15000);
      window[cb]=p=>finish(resolve,p);
      s.onerror=()=>finish(reject,new Error('network'));
      s.src=GAS_URL+'?action=getTransactions&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  function normalizeRecords(records){
    return records.map(t=>({
      id:String(t.id??''),
      date:normDate(t.date),
      type:String(t.type||'expense').toLowerCase()==='income'?'income':'expense',
      merchant:String(t.merchant||''),
      desc:String(t.desc??t.description??''),
      category:String(t.category||'Lainnya'),
      amount:normNumber(t.amount),
      paymentMethod:String(t.paymentMethod||''),
      ocrConfidence:String(t.ocrConfidence||''),
      ocrText:String(t.ocrText||''),
      receiptUrl:String(t.receiptUrl||''),
      receiptFileId:String(t.receiptFileId||''),
      source:String(t.source||'Google Sheet'),
      synced:true
    })).filter(t=>t.id && t.date);
  }

  function forceApply(records){
    if(typeof data==='undefined') return false;
    const current=Array.isArray(data.transactions)?data.transactions:[];
    const localById=new Map(current.map(t=>[String(t.id),t]));
    records.forEach(t=>localById.set(String(t.id),{...(localById.get(String(t.id))||{}),...t,synced:true}));
    data.transactions=Array.from(localById.values());
    try{localStorage.setItem('monikas_v3_local',JSON.stringify(data));}catch(e){}
    try{sessionStorage.setItem(PERIOD_KEY,JSON.stringify(records));}catch(e){}
    if(typeof render==='function') render();
    return true;
  }

  async function refresh(){
    if(busy) return;
    busy=true;
    try{
      const payload=await jsonp();
      if(!payload || payload.ok!==true) throw new Error(payload&&payload.error||'Respons cloud tidak valid');
      const records=normalizeRecords(Array.isArray(payload.data)?payload.data:[]);
      if(records.length){
        forceApply(records);
        lastCloudCount=records.length;
        const status=document.getElementById('statusText');
        const pill=document.getElementById('syncPill');
        if(status) status.textContent='Cloud aktif • '+records.length+' transaksi terbaca';
        if(pill) pill.textContent='Sheets aktif';
      }
    }catch(e){
      // Keep the last valid cloud cache; do not overwrite it with empty data.
    }finally{busy=false;}
  }

  function start(){
    refresh();
    // Watchdog: re-apply cloud data periodically so another render cannot revert the UI to 0.
    setInterval(refresh,15000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
