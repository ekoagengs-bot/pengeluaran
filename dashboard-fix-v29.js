/* MoniKas dashboard repair v29
   Fixes: cloud transactions not reaching dashboard; rolling-period date handling;
   prevents stale/local data from masking cloud totals. */
(function(){
  'use strict';
  const DAYS = () => (window.__mkPeriodDays || 7);
  const pad = n => String(n).padStart(2,'0');
  function ymdLocal(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function safeDate(v){
    if(v instanceof Date && !isNaN(v.getTime())) return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const s=String(v??'').trim();
    if(!s) return null;
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if(m){ let y=+m[3]; if(y<100)y+=2000; return new Date(y,+m[2]-1,+m[1]); }
    const d=new Date(s); return isNaN(d.getTime())?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }
  function num(v){
    if(typeof v==='number' && isFinite(v)) return v;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s) return 0;
    if(s.includes('.')&&s.includes(',')) return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s)) return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s)) return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }
  function allCloudOrLocal(){
    try{
      if(Array.isArray(window.cloudTransactions) && window.cloudTransactions.length) return window.cloudTransactions;
    }catch(e){}
    try{
      if(typeof cloudTransactions!=='undefined' && Array.isArray(cloudTransactions) && cloudTransactions.length) return cloudTransactions;
    }catch(e){}
    try{
      if(typeof data!=='undefined' && Array.isArray(data.transactions)) return data.transactions;
    }catch(e){}
    return [];
  }
  function dashboardRepair(){
    const source=allCloudOrLocal();
    let days=7;
    try{ days=Number(window.period||7); }catch(e){}
    if(![7,30,90].includes(days))days=7;
    window.__mkPeriodDays=days;
    const parsed=source.map(t=>({t,d:safeDate(t.date),a:num(t.amount)})).filter(x=>x.d&&x.a>=0);
    const expenseRows=parsed.filter(x=>String(x.t.type||'').toLowerCase()!=='income');
    const todayDate=new Date(); todayDate.setHours(0,0,0,0);
    let end=new Date(todayDate);
    let start=new Date(end); start.setDate(end.getDate()-days+1);
    let rows=expenseRows.filter(x=>x.d>=start&&x.d<=end);
    // When the browser's day differs from the latest Sheet transaction day,
    // anchor the period to the latest transaction so the dashboard still shows data.
    if(!rows.length && expenseRows.length){
      const latest=new Date(Math.max.apply(null,expenseRows.map(x=>x.d.getTime())));
      end=latest; start=new Date(end); start.setDate(end.getDate()-days+1);
      rows=expenseRows.filter(x=>x.d>=start&&x.d<=end);
    }
    const total=rows.reduce((s,x)=>s+x.a,0);
    const avg=total/days;
    const dTotal=document.getElementById('dTotal'),dAvg=document.getElementById('dAvg'),dProjection=document.getElementById('dProjection');
    if(dTotal)dTotal.textContent=rupiah(total);
    if(dAvg)dAvg.textContent=rupiah(avg);
    if(dProjection)dProjection.textContent=rupiah(avg*30);
    const map={}; rows.forEach(x=>{const k=ymdLocal(x.d);map[k]=(map[k]||0)+x.a;});
    const daysData=[]; for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);daysData.push({d,k:ymdLocal(d),v:map[ymdLocal(d)]||0});}
    const trend=document.getElementById('trend');
    if(trend){const max=Math.max(1,...daysData.map(x=>x.v));trend.innerHTML=daysData.map(x=>`<div class="barcol"><div class="barv" title="${x.k}: ${rupiah(x.v)}" style="height:${Math.max(2,x.v/max*100)}%"></div><div class="barlabel">${x.d.getDate()}/${x.d.getMonth()+1}</div></div>`).join('');}
    const cs=document.getElementById('chartStart'),ce=document.getElementById('chartEnd');if(cs)cs.textContent=daysData[0]?.k||'-';if(ce)ce.textContent=daysData.at(-1)?.k||'-';
    const high=daysData.reduce((a,b)=>b.v>a.v?b:a,{v:0});const hd=document.getElementById('highestDay');if(hd)hd.textContent=high.v?`${high.d.getDate()}/${high.d.getMonth()+1} • ${rupiah(high.v)}`:'-';
    const cats={};rows.forEach(x=>{const c=String(x.t.category||'Lainnya');cats[c]=(cats[c]||0)+x.a;});const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];const tc=document.getElementById('topCategory');if(tc)tc.textContent=top?`${top[0]} • ${rupiah(top[1])}`:'-';
    let maxPct=0;try{Object.entries(cats).forEach(([c,v])=>{const b=(typeof BUDGETS!=='undefined'&&BUDGETS[c])||0;if(b)maxPct=Math.max(maxPct,v/b*100);});}catch(e){}
    const bu=document.getElementById('budgetUse');if(bu)bu.textContent=Math.round(maxPct)+'%';
    const alerts=document.getElementById('alerts');if(alerts)alerts.innerHTML=rows.length?(maxPct>=100?'<div class="alert">⚠️ Ada kategori melewati 100% anggaran.</div>':''):'<div class="alert">ℹ️ Belum ada pengeluaran pada periode ini.</div>';
    const ins=document.getElementById('insight');if(ins)ins.textContent=rows.length?'Data Dashboard diambil dari transaksi cloud Google Sheet.':'Belum ada pengeluaran pada periode ini.';
  }
  function install(){
    const originalRenderDashboard=window.renderDashboard;
    if(typeof originalRenderDashboard==='function' && !originalRenderDashboard.__mkWrapped){
      const wrapped=function(){dashboardRepair();};
      wrapped.__mkWrapped=true;window.renderDashboard=wrapped;
    }
    // Keep the dashboard synchronized after cloud refresh and period clicks.
    setTimeout(dashboardRepair,50);
    setTimeout(dashboardRepair,500);
    setTimeout(dashboardRepair,1500);
    if(window.__mkDashTimer)clearInterval(window.__mkDashTimer);
    window.__mkDashTimer=setInterval(dashboardRepair,5000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
