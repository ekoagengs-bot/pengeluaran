/* MoniKas v30 - strict fund routing and balance repair */
(function(){
  'use strict';
  const FUNDS=['Bank BNI','Bank Jago','Bank BCA','Bank BSI','Ayah','Biyan','Eren','Bunda','Kas Utama','Lainnya'];
  const VALID=new Set(FUNDS);
  const $=id=>document.getElementById(id);
  function normalizeFund(v){
    const s=String(v||'').trim();
    return VALID.has(s)?s:'';
  }
  function strictStats(tx){
    const out=Object.fromEntries(FUNDS.map(n=>[n,{income:0,expense:0,balance:0}]));
    (Array.isArray(tx)?tx:[]).forEach(t=>{
      const fund=normalizeFund(t.fund||t.fundSource);
      if(!fund)return; // NEVER move an unknown/blank fund into Kas Utama
      const amount=Number(t.amount)||0;
      if(String(t.type||'').toLowerCase()==='income')out[fund].income+=amount;
      else out[fund].expense+=amount;
    });
    FUNDS.forEach(n=>out[n].balance=out[n].income-out[n].expense);
    return out;
  }
  function patchClientFundStats(){
    if(typeof window.fundStats==='function'&&!window.fundStats.__v30){
      const original=window.fundStats;
      const fn=function(){
        try{
          const tx=(typeof data!=='undefined'&&Array.isArray(data.transactions))?data.transactions:[];
          return strictStats(tx);
        }catch(e){return original.apply(this,arguments)}
      };
      fn.__v30=true;
      window.fundStats=fn;
    }
  }
  function redrawFunds(){
    try{
      const stats=strictStats((typeof data!=='undefined'&&Array.isArray(data.transactions))?data.transactions:[]);
      const fundsBox=$('funds');
      if(!fundsBox)return;
      const groups={Bank:['Bank BNI','Bank Jago','Bank BCA','Bank BSI'],'Tabungan Emas':['Ayah','Biyan','Eren','Bunda'],'Lainnya':['Kas Utama','Lainnya']};
      fundsBox.innerHTML=Object.entries(groups).map(([g,names])=>`<div style="grid-column:1/-1"><div class="label" style="margin:6px 0 7px">${g}</div><div class="funds">${names.map(n=>{const f=stats[n];return `<div class="fund"><div class="fund-head"><span class="fund-name">${n}</span><span class="pill">Aktif</span></div><div class="fund-bal">${typeof rupiah==='function'?rupiah(f.balance):('Rp '+f.balance.toLocaleString('id-ID'))}</div><div class="fund-meta">Masuk ${typeof rupiah==='function'?rupiah(f.income):f.income} • Keluar ${typeof rupiah==='function'?rupiah(f.expense):f.expense}</div></div>`}).join('')}</div></div>`).join('');
    }catch(e){console.warn('v30 fund redraw',e)}
  }
  function enforceFormFund(){
    const sel=$('fund');
    if(!sel)return;
    const options=[...sel.options].map(o=>o.value);
    if(options.length!==FUNDS.length||!FUNDS.every(n=>options.includes(n))){
      sel.innerHTML=FUNDS.map(n=>`<option value="${n}">${n}</option>`).join('');
    }
    const current=normalizeFund(sel.value)||String(localStorage.getItem('mk_fund')||'').trim();
    sel.value=normalizeFund(current)||'Bank BNI';
  }
  function installFormGuard(){
    const form=$('txForm'); if(!form||form.__v30)return;
    form.addEventListener('submit',function(){
      enforceFormFund();
      const type=$('type')?.value;
      const fund=normalizeFund($('fund')?.value);
      if(!fund){
        alert('Pilih Pos Dana terlebih dahulu.');
        return;
      }
      localStorage.setItem('mk_fund',fund);
      window.__mkLastSubmittedFund={type,fund,amount:Number($('amount')?.value||0),at:Date.now()};
    },true);
    form.__v30=true;
  }
  function repairCloudMapping(){
    // Keep cloud rows authoritative, but do not fabricate Kas Utama for missing POS DANA.
    try{
      if(Array.isArray(window.cloudTransactions)){
        window.cloudTransactions=window.cloudTransactions.map(t=>{
          const f=normalizeFund(t.fund||t.fundSource);
          return f?{...t,fund:f,fundSource:f}:{...t,fund:'',fundSource:''};
        });
      }
    }catch(e){}
  }
  function install(){
    patchClientFundStats();
    enforceFormFund();
    installFormGuard();
    redrawFunds();
    repairCloudMapping();
    setTimeout(()=>{patchClientFundStats();enforceFormFund();installFormGuard();redrawFunds();repairCloudMapping()},800);
    setTimeout(()=>{patchClientFundStats();enforceFormFund();installFormGuard();redrawFunds();repairCloudMapping()},2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
