// MoniKas cloud monitoring bridge
// Reads TRANSAKSI through Apps Script JSONP (no CORS issue), merges to local cache,
// then refreshes the page once so the main UI renders cloud transactions.
(function(){
  'use strict';
  const V3_KEY='monikas_v3_local';
  const V2_KEY='monikas_v2_local';
  const GAS_URL='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const REFRESH_GUARD='monikas_cloud_reload_at';
  function parse(v,fallback){try{return JSON.parse(v)}catch(e){return fallback}}
  function getState(){
    const v3=parse(localStorage.getItem(V3_KEY)||'null',null);
    const v2=parse(localStorage.getItem(V2_KEY)||'null',null);
    const tx=v3&&Array.isArray(v3.transactions)?v3.transactions:(v2&&Array.isArray(v2.transactions)?v2.transactions:[]);
    const budgets=(v3&&v3.budgets)||{};
    return {transactions:tx,budgets:budgets};
  }
  function normalizeDate(v){
    const s=String(v||'').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    let m=s.match(/^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{2,4})$/);
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
  function merge(records,state){
    const map=new Map(state.transactions.map(t=>[String(t.id),t]));
    records.forEach(t=>{const id=String(t.id||'');if(!id)return;map.set(id,{...(map.get(id)||{}),...t,id,synced:true});});
    state.transactions=[...map.values()];
    localStorage.setItem(V3_KEY,JSON.stringify(state));
  }
  function show(msg){
    let el=document.getElementById('cloudMonitorStatus');
    if(!el){el=document.createElement('div');el.id='cloudMonitorStatus';el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:999;background:#0f172a;color:#fff;padding:10px 13px;border-radius:12px;font:700 12px system-ui;max-width:90vw;box-shadow:0 10px 25px rgba(0,0,0,.15)';document.body.appendChild(el)}
    el.textContent=msg;clearTimeout(window.__cms);window.__cms=setTimeout(()=>el.remove(),5000);
  }
  function loadJsonp(){
    return new Promise((resolve,reject)=>{
      const cb='monikasJsonp_'+Date.now()+'_'+Math.floor(Math.random()*10000);
      const script=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('Timeout membaca Google Sheet'))},15000);
      function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}script.remove()}
      window[cb]=data=>{cleanup();resolve(data)};
      script.onerror=()=>{cleanup();reject(new Error('Gagal memanggil Apps Script'))};
      script.src=GAS_URL+'?action=getTransactions&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }
  async function refresh(){
    try{
      const payload=await loadJsonp();
      if(!payload||payload.ok!==true)throw new Error(payload&&payload.error||'Respons cloud tidak valid');
      const records=Array.isArray(payload.data)?payload.data:[];
      const state=getState();
      merge(records,state);
      show('✅ '+records.length+' transaksi dimuat dari Google Sheet.');
      const now=Date.now();
      const last=Number(sessionStorage.getItem(REFRESH_GUARD)||0);
      if(now-last>10000){sessionStorage.setItem(REFRESH_GUARD,String(now));setTimeout(()=>location.reload(),500);}
    }catch(err){show('⚠️ Monitoring cloud gagal: '+err.message);}
  }
  function start(){
    const last=Number(sessionStorage.getItem(REFRESH_GUARD)||0);
    if(Date.now()-last<=10000){sessionStorage.removeItem(REFRESH_GUARD);show('✅ Data Google Sheet sudah diperbarui.');return;}
    setTimeout(refresh,700);
    setInterval(refresh,300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
