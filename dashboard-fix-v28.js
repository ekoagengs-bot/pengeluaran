// MoniKas Dashboard / saldo compatibility fix v28
(function(){
  const FUND_NAMES=['Bank BNI','Bank Jago','Bank BCA','Bank BSI','Ayah','Biyan','Eren','Bunda','Kas Utama','Lainnya'];
  const toMoney=v=>{ if(typeof v==='number'&&isFinite(v)) return v; let s=String(v??'').trim().replace(/[^0-9,.-]/g,''); if(!s)return 0; if(s.includes('.')&&s.includes(',')) return Number(s.replace(/\./g,'').replace(/,/g,'.'))||0; if(/\.\d{3}$/.test(s)) return Number(s.replace(/\./g,''))||0; if(/,\d{3}$/.test(s)) return Number(s.replace(/,/g,''))||0; return Number(s.replace(/,/g,'.'))||Number(s)||0; };
  const toDate=v=>{ const s=String(v??'').trim(); if(!s)return ''; let m=s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0'); m=s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');} const d=new Date(s); return isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function normalize(t){ const f=FUND_NAMES.includes(t.fund)?t.fund:(FUND_NAMES.includes(t.fundSource)?t.fundSource:'Lainnya'); return {...t,date:toDate(t.date),fund:f,amount:toMoney(t.amount),type:String(t.type||'expense').toLowerCase()==='income'?'income':'expense'}; }
  function currentSource(){ const src=(window.cloudOk&&Array.isArray(window.cloudTransactions)&&window.cloudTransactions.length)?window.cloudTransactions:(window.data?.transactions||[]); return src.map(normalize).filter(t=>t.date); }
  window.renderDashboard=function(){
    const source=currentSource();
    const end=new Date(); end.setHours(0,0,0,0);
    const start=new Date(end); start.setDate(end.getDate()-((window.period||7)-1));
    const tx=source.filter(t=>t.type==='expense').filter(t=>{const d=new Date(t.date+'T00:00:00'); return d>=start&&d<=end;});
    const total=tx.reduce((s,t)=>s+t.amount,0),days=Math.max(1,(window.period||7)),avg=total/days;
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    const rp=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
    set('dTotal',rp(total)); set('dAvg',rp(avg)); set('dProjection',rp(avg*30));
    const map={}; tx.forEach(t=>map[t.date]=(map[t.date]||0)+t.amount);
    const daysArr=[]; for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=ymd(d);daysArr.push({d,k,v:map[k]||0});}
    const max=Math.max(1,...daysArr.map(x=>x.v)); const trend=document.getElementById('trend'); if(trend)trend.innerHTML=daysArr.map(x=>`<div class="barcol"><div class="barv" title="${x.k}: ${rp(x.v)}" style="height:${Math.max(2,x.v/max*100)}%"></div><div class="barlabel">${x.d.getDate()}/${x.d.getMonth()+1}</div></div>`).join('');
    set('chartStart',daysArr[0]?.k||'-');set('chartEnd',daysArr.at(-1)?.k||'-');
    const high=daysArr.reduce((a,b)=>b.v>a.v?b:a,{v:0});set('highestDay',high.v?`${high.d.getDate()}/${high.d.getMonth()+1} • ${rp(high.v)}`:'-');
    const cats={};tx.forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];set('topCategory',top?`${top[0]} • ${rp(top[1])}`:'-');
    const budgets=window.BUDGETS||{Makanan:1500000,Transportasi:800000,Belanja:1000000,Tagihan:1500000,Pendidikan:500000,Kesehatan:500000,Hiburan:400000,Lainnya:500000}; const use=Math.max(0,...Object.entries(cats).map(([c,v])=>budgets[c]?v/budgets[c]*100:0)); set('budgetUse',Math.round(use)+'%');
    const prevStart=new Date(start); prevStart.setDate(start.getDate()-days); const prevEnd=new Date(start); prevEnd.setDate(start.getDate()-1); const prev=source.filter(t=>t.type==='expense').filter(t=>{const d=new Date(t.date+'T00:00:00');return d>=prevStart&&d<=prevEnd}).reduce((s,t)=>s+t.amount,0); const vs=prev?((total-prev)/prev)*100:0; set('vsPrev',(vs>=0?'+':'')+Math.round(vs)+'%');
    const alerts=[]; if(use>=100)alerts.push('<div class="alert">⚠️ Ada kategori melewati 100% anggaran.</div>'); else if(use>=80)alerts.push('<div class="alert">⚠️ Ada kategori mencapai ≥80% anggaran.</div>'); if(vs>20)alerts.push('<div class="alert">📈 Pengeluaran naik >20% dibanding periode sebelumnya.</div>'); if(!tx.length)alerts.push('<div class="alert">ℹ️ Belum ada pengeluaran pada periode ini.</div>'); const a=document.getElementById('alerts');if(a)a.innerHTML=alerts.join(''); set('insight',vs>20?'Pengeluaran meningkat. Periksa kategori dan pos dana terbesar.':vs<-20?'Pengeluaran menurun dibanding periode sebelumnya.':'Pola pengeluaran relatif stabil.');
  };
  window.fundStats=function(){const out=Object.fromEntries(FUND_NAMES.map(x=>[x,{income:0,expense:0,balance:0}])); currentSource().forEach(t=>{const f=out[FUND_NAMES.includes(t.fund)?t.fund:'Lainnya'];if(t.type==='income')f.income+=t.amount;else f.expense+=t.amount;});FUND_NAMES.forEach(x=>out[x].balance=out[x].income-out[x].expense);return out;};
  function apply(){ if(typeof window.render==='function')window.render(); else if(typeof window.renderDashboard==='function')window.renderDashboard(); }
  window.addEventListener('load',()=>setTimeout(apply,100));
  setTimeout(apply,800);
})();