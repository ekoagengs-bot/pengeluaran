/* MoniKas dashboard repair v29
   Fixes: cloud transactions not reaching dashboard; rolling-period date handling;
   prevents stale/local data from masking cloud totals. */
(function(){
  'use strict';
  const pad = n => String(n).padStart(2,'0');
  function ymdLocal(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function safeDate(v){
    if(v instanceof Date && !isNaN(v.getTime())) return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const s=String(v??'').trim(); if(!s)return null;
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]);}
    const d=new Date(s);return isNaN(d.getTime())?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }
  function num(v){
    if(typeof v==='number'&&isFinite(v))return v;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');if(!s)return 0;
    if(s.includes('.')&&s.includes(','))return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s))return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s))return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }
  function sourceRows(){
    try{if(typeof cloudTransactions!=='undefined'&&Array.isArray(cloudTransactions)&&cloudTransactions.length)return cloudTransactions;}catch(e){}
    try{if(typeof data!=='undefined'&&Array.isArray(data.transactions))return data.transactions;}catch(e){}
    return [];
  }
  function dashboardRepair(){
    const source=sourceRows();
    let days=7;
    const active=document.querySelector('.tabs button.active[data-period]');
    if(active)days=Number(active.dataset.period)||7;
    if(![7,30,90].includes(days))days=7;
    const parsed=source.map(t=>({t,d:safeDate(t.date),a:num(t.amount)})).filter(x=>x.d&&x.a>=0);
    const expenseRows=parsed.filter(x=>String(x.t.type||'').toLowerCase()!=='income'&&x.a>0);
    const todayDate=new Date();todayDate.setHours(0,0,0,0);
    let end=new Date(todayDate),start=new Date(end);start.setDate(end.getDate()-days+1);
    let rows=expenseRows.filter(x=>x.d>=start&&x.d<=end);
    if(!rows.length&&expenseRows.length){
      const latest=new Date(Math.max(...expenseRows.map(x=>x.d.getTime())));
      end=latest;start=new Date(end);start.setDate(end.getDate()-days+1);
      rows=expenseRows.filter(x=>x.d>=start&&x.d<=end);
    }
    const total=rows.reduce((s,x)=>s+x.a,0),avg=total/days;
    document.getElementById('dTotal').textContent=rupiah(total);
    document.getElementById('dAvg').textContent=rupiah(avg);
    document.getElementById('dProjection').textContent=rupiah(avg*30);
    const map={};rows.forEach(x=>{const k=ymdLocal(x.d);map[k]=(map[k]||0)+x.a;});
    const ds=[];for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);ds.push({d,k:ymdLocal(d),v:map[ymdLocal(d)]||0});}
    const trend=document.getElementById('trend');if(trend){const max=Math.max(1,...ds.map(x=>x.v));trend.innerHTML=ds.map(x=>`<div class="barcol"><div class="barv" title="${x.k}: ${rupiah(x.v)}" style="height:${Math.max(2,x.v/max*100)}%"></div><div class="barlabel">${x.d.getDate()}/${x.d.getMonth()+1}</div></div>`).join('');}
    document.getElementById('chartStart').textContent=ds[0]?.k||'-';document.getElementById('chartEnd').textContent=ds.at(-1)?.k||'-';
    const high=ds.reduce((a,b)=>b.v>a.v?b:a,{v:0});document.getElementById('highestDay').textContent=high.v?`${high.d.getDate()}/${high.d.getMonth()+1} • ${rupiah(high.v)}`:'-';
    const cats={};rows.forEach(x=>{const c=String(x.t.category||'Lainnya');cats[c]=(cats[c]||0)+x.a;});
    const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];document.getElementById('topCategory').textContent=top?`${top[0]} • ${rupiah(top[1])}`:'-';
    let maxPct=0;try{Object.entries(cats).forEach(([c,v])=>{const b=(typeof BUDGETS!=='undefined'&&BUDGETS[c])||0;if(b)maxPct=Math.max(maxPct,v/b*100);});}catch(e){}
    document.getElementById('budgetUse').textContent=Math.round(maxPct)+'%';
    document.getElementById('alerts').innerHTML=rows.length?(maxPct>=100?'<div class="alert">⚠️ Ada kategori melewati 100% anggaran.</div>':''):'<div class="alert">ℹ️ Belum ada pengeluaran pada periode ini.</div>';
    document.getElementById('insight').textContent=rows.length?'Data Dashboard diambil dari transaksi Google Sheet.':'Belum ada pengeluaran pada periode ini.';
  }
  function install(){
    const start=Date.now();
    const timer=setInterval(()=>{
      dashboardRepair();
      if(typeof cloudTransactions!=='undefined'&&Array.isArray(cloudTransactions)&&cloudTransactions.length){clearInterval(timer);}
      if(Date.now()-start>10000)clearInterval(timer);
    },250);
    dashboardRepair();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
