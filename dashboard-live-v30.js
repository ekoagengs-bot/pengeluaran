/* MoniKas Dashboard Live v30 */
(function(){
  'use strict';
  const KEY='monikas_v5_standalone';
  const BUDGETS={Makanan:1500000,Transportasi:800000,Belanja:1000000,Tagihan:1500000,Pendidikan:500000,Kesehatan:500000,Hiburan:400000,Lainnya:500000};
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const pad=n=>String(n).padStart(2,'0');
  function dateOnly(v){
    if(v instanceof Date&&!isNaN(v)) return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const s=String(v??'').trim(); if(!s)return null;
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m)return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]);}
    const d=new Date(s); return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }
  function amount(v){
    if(typeof v==='number'&&isFinite(v))return v;
    let s=String(v??'').replace(/[^0-9,.-]/g,''); if(!s)return 0;
    if(s.includes('.')&&s.includes(','))return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0;
    if(/\.\d{3}$/.test(s))return Number(s.replace(/\./g,''))||0;
    if(/,\d{3}$/.test(s))return Number(s.replace(/,/g,''))||0;
    return Number(s.replace(/,/g,'.'))||Number(s)||0;
  }
  function getTx(){
    try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return Array.isArray(x?.transactions)?x.transactions:[]}catch(e){return[]}
  }
  function txDate(t){return dateOnly(t.date)}
  function getPeriod(){const a=document.querySelector('[data-period].active');return a?Number(a.dataset.period)||7:7}
  function render(){
    const all=getTx().filter(t=>txDate(t));
    let days=getPeriod(); if(![7,30,90].includes(days))days=7;
    const exp=all.filter(t=>String(t.type||'').toLowerCase()!=='income').map(t=>({t,d:txDate(t),a:amount(t.amount)}));
    const income=all.filter(t=>String(t.type||'').toLowerCase()==='income').reduce((s,t)=>s+amount(t.amount),0);
    const expenseMonth=all.filter(t=>String(t.type||'').toLowerCase()!=='income').reduce((s,t)=>s+amount(t.amount),0);
    const monthInput=document.getElementById('month'); const selectedMonth=monthInput?.value||'';
    let end=new Date();end.setHours(0,0,0,0);let start=new Date(end);start.setDate(end.getDate()-days+1);
    let rows=exp.filter(x=>x.d>=start&&x.d<=end);
    if(!rows.length&&exp.length){const latest=new Date(Math.max(...exp.map(x=>x.d.getTime())));end=latest;start=new Date(end);start.setDate(end.getDate()-days+1);rows=exp.filter(x=>x.d>=start&&x.d<=end);}
    const total=rows.reduce((s,x)=>s+x.a,0);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    set('income',money(selectedMonth?all.filter(t=>txDate(t)&&String(t.date).slice(0,7)===selectedMonth&&String(t.type||'').toLowerCase()==='income').reduce((s,t)=>s+amount(t.amount),0):income));
    set('expense',money(selectedMonth?all.filter(t=>txDate(t)&&String(t.date).slice(0,7)===selectedMonth&&String(t.type||'').toLowerCase()!=='income').reduce((s,t)=>s+amount(t.amount),0):expenseMonth));
    const mi=selectedMonth?all.filter(t=>txDate(t)&&String(t.date).slice(0,7)===selectedMonth):all;
    const miIncome=mi.filter(t=>String(t.type||'').toLowerCase()==='income').reduce((s,t)=>s+amount(t.amount),0);
    const miExp=mi.filter(t=>String(t.type||'').toLowerCase()!=='income').reduce((s,t)=>s+amount(t.amount),0);
    set('balance',money(miIncome-miExp));
    set('dTotal',money(total));set('dAvg',money(total/days));set('dProjection',money(total/days*30));
    const map={};rows.forEach(x=>{const k=x.d.getFullYear()+'-'+pad(x.d.getMonth()+1)+'-'+pad(x.d.getDate());map[k]=(map[k]||0)+x.a});
    const trend=document.getElementById('trend');const ds=[];for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());ds.push({d,k,v:map[k]||0})}const max=Math.max(1,...ds.map(x=>x.v));if(trend)trend.innerHTML=ds.map(x=>`<div class="barcol"><div class="barv" title="${x.k}: ${money(x.v)}" style="height:${Math.max(2,x.v/max*100)}%"></div><div class="barlabel">${x.d.getDate()}/${x.d.getMonth()+1}</div></div>`).join('');
    set('chartStart',ds[0]?.k||'-');set('chartEnd',ds.at(-1)?.k||'-');
    const high=ds.reduce((a,b)=>b.v>a.v?b:a,{v:0});set('highestDay',high.v?`${high.d.getDate()}/${high.d.getMonth()+1} • ${money(high.v)}`:'-');
    const cats={};rows.forEach(x=>{const c=x.t.category||'Lainnya';cats[c]=(cats[c]||0)+x.a});const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];set('topCategory',top?`${top[0]} • ${money(top[1])}`:'-');
    let maxPct=0;Object.entries(cats).forEach(([c,v])=>{if(BUDGETS[c])maxPct=Math.max(maxPct,v/BUDGETS[c]*100)});set('budgetUse',Math.round(maxPct)+'%');
    const al=document.getElementById('alerts');if(al)al.innerHTML=rows.length?(maxPct>=100?'<div class="alert">⚠️ Ada kategori melewati 100% anggaran.</div>':''):'<div class="alert">ℹ️ Belum ada pengeluaran pada periode ini.</div>';
    set('insight',rows.length?'Dashboard dihitung dari data transaksi yang tersimpan setelah sinkronisasi.':'Belum ada pengeluaran pada periode ini.');
  }
  function start(){render();setInterval(render,2000);document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,30)));const m=document.getElementById('month');if(m)m.addEventListener('change',()=>setTimeout(render,30));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();