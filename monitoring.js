// MoniKas cloud monitoring bridge
// Reads TRANSAKSI through Apps Script JSONP, stores a normalized cloud snapshot,
// merges cloud data into the app cache, then refreshes the main page from the fresh cache.
(function(){
  'use strict';
  const V3_KEY='monikas_v3_local';
  const V2_KEY='monikas_v2_local';
  const CLOUD_KEY='monikas_cloud_snapshot';
  const GAS_URL='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const GUARD='monikas_cloud_refresh_guard';

  function parse(v,f){try{return JSON.parse(v)}catch(e){return f}}
  function normalizeDate(v){
    const s=String(v||'').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    let m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0')}
    const d=new Date(s);return isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function normalizeNumber(v){
    const s=String(v??'').replace(/[^0-9,.-]/g,'').trim();
    if(!s)return 0;
    if(s.includes('.')&&s.includes(','))return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s))return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s))return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }
  function getState(){
    const v3=parse(localStorage.getItem(V3_KEY)||'null',null);
    const v2=parse(localStorage.getItem(V2_KEY)||'null',null);
    return {transactions:Array.isArray(v3?.transactions)?v3.transactions:(Array.isArray(v2?.transactions)?v2.transactions:[]),budgets:(v3?.budgets)||{}};
  }
  function loadJsonp(){
    return new Promise((resolve,reject)=>{
      const cb='monikasJsonp_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const script=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('Timeout membaca Google Sheet'))},15000);
      function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}script.remove()}
      window[cb]=payload=>{cleanup();resolve(payload)};
      script.onerror=()=>{cleanup();reject(new Error('Apps Script tidak dapat dipanggil'))};
      script.src=GAS_URL+'?action=getTransactions&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }
  function normalizeRecords(records){
    return (Array.isArray(records)?records:[]).map(t=>({
      id:String(t.id||''),date:normalizeDate(t.date),type:String(t.type||'expense').toLowerCase()==='income'?'income':'expense',
      merchant:String(t.merchant||''),desc:String(t.description||t.desc||''),category:String(t.category||'Lainnya'),amount:normalizeNumber(t.amount),
      paymentMethod:String(t.paymentMethod||''),ocrConfidence:String(t.ocrConfidence||''),ocrText:String(t.ocrText||''),receiptUrl:String(t.receiptUrl||''),receiptFileId:String(t.receiptFileId||''),source:'Google Sheet',synced:true
    })).filter(t=>t.id&&t.date);
  }
  function mergeCloud(records){
    const s=getState();
    const map=new Map(s.transactions.map(t=>[String(t.id),t]));
    records.forEach(t=>map.set(String(t.id),{...(map.get(String(t.id))||{}),...t}));
    s.transactions=Array.from(map.values());
    try{localStorage.setItem(CLOUD_KEY,JSON.stringify({updatedAt:new Date().toISOString(),transactions:records,count:records.length}))}catch(e){}
    localStorage.setItem(V3_KEY,JSON.stringify(s));
    return s;
  }
  function show(msg){
    let el=document.getElementById('cloudMonitorStatus');
    if(!el){el=document.createElement('div');el.id='cloudMonitorStatus';el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:999;background:#0f172a;color:#fff;padding:10px 13px;border-radius:12px;font:700 12px system-ui;max-width:90vw;box-shadow:0 10px 25px rgba(0,0,0,.15)';document.body.appendChild(el)}
    el.textContent=msg;clearTimeout(window.__cms);window.__cms=setTimeout(()=>el.remove(),5000);
  }
  function refreshPage(){
    try{sessionStorage.setItem(GUARD,String(Date.now()))}catch(e){}
    const u=new URL(window.location.href);u.searchParams.set('cloud','1');u.searchParams.set('_',String(Date.now()));window.location.replace(u.toString());
  }
  async function refresh(){
    try{
      const payload=await loadJsonp();
      if(!payload||payload.ok!==true)throw new Error(payload?.error||'Respons cloud tidak valid');
      const records=normalizeRecords(payload.data);
      mergeCloud(records);
      show('✅ '+records.length+' transaksi dari Google Sheet dimuat.');
      setTimeout(refreshPage,300);
    }catch(err){show('⚠️ Monitoring cloud gagal: '+err.message)}
  }
  function start(){
    let guard=0;try{guard=Number(sessionStorage.getItem(GUARD)||0)}catch(e){}
    if(guard && Date.now()-guard<15000){try{sessionStorage.removeItem(GUARD)}catch(e){}show('✅ Dashboard menggunakan data Google Sheet terbaru.');return}
    setTimeout(refresh,700);setInterval(refresh,300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
