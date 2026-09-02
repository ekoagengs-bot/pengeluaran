/* MoniKas - Pos Dana & Jenis Pemasukan */
(function(){
  'use strict';
  const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const FUND_KEY='monikas_selected_fund';
  const INCOME_KEY='monikas_income_types';
  const DESIRED=[
    {name:'Bank BNI',group:'Bank'},
    {name:'Bank Jago',group:'Bank'},
    {name:'Bank BCA',group:'Bank'},
    {name:'Bank BSI',group:'Bank'},
    {name:'Ayah',group:'Tabungan Emas'},
    {name:'Biyan',group:'Tabungan Emas'},
    {name:'Eren',group:'Tabungan Emas'},
    {name:'Bunda',group:'Tabungan Emas'}
  ];
  const LEGACY=['Kas Utama','Gaji','Usaha','Pendapatan Sampingan','Bonus / THR','Investasi','Lainnya'];
  let funds=[];
  let incomeTypes=loadIncomeTypes();
  function $(id){return document.getElementById(id)}
  function rupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)}
  function loadIncomeTypes(){try{const x=JSON.parse(localStorage.getItem(INCOME_KEY)||'null');return Array.isArray(x)&&x.length?x:['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya']}catch(e){return ['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya']}}
  function saveIncomeTypes(){localStorage.setItem(INCOME_KEY,JSON.stringify(incomeTypes))}
  function jsonp(url){return new Promise((resolve,reject)=>{const cb='__mk_pos_'+Date.now()+'_'+Math.floor(Math.random()*10000);const s=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}window[cb]=v=>{cleanup();resolve(v)};s.onerror=()=>{cleanup();reject(new Error('network'))};s.src=url+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)})}
  async function api(action,payload){if(payload){return fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload))}).then(()=>({ok:true}));}return jsonp(GAS+'?action='+encodeURIComponent(action))}
  function selectedFund(){return localStorage.getItem(FUND_KEY)||'Bank Jago'}
  function setSelectedFund(v){if(v)localStorage.setItem(FUND_KEY,v)}
  function buildUI(){
    const entry=document.getElementById('entryCard'); if(!entry||document.getElementById('posDanaBox')) return;
    const box=document.createElement('div'); box.id='posDanaBox'; box.innerHTML=`
      <div class="pos-head"><div><h3>💰 Pos Dana / Sumber Pemasukan</h3><div class="hint">Pengeluaran akan mengurangi saldo pos yang dipilih. Pemasukan akan menambah saldo pos.</div></div><button type="button" id="manageFundsBtn" class="btn secondary pos-small">Kelola</button></div>
      <div class="pos-select-row"><select id="fundSource" class="input"></select><div id="fundBalance" class="pos-balance">Saldo: Rp 0</div></div>
      <div id="incomeTypeWrap" class="income-type-wrap hidden"><div class="income-type-row"><select id="incomeType" class="input"></select><button type="button" id="addIncomeTypeBtn" class="btn secondary pos-small">+ Jenis Pemasukan</button></div></div>
      <div id="fundManager" class="fund-manager hidden"><div class="fund-manager-title">Daftar Pos Dana</div><div id="fundList"></div><div class="add-fund-row"><input id="newFundName" class="input" placeholder="Nama pos baru"><input id="newFundOpening" class="input" type="number" min="0" step="1" placeholder="Saldo awal (Rp)"><button type="button" id="addFundBtn" class="btn">+ Pos</button></div></div>`;
    entry.insertBefore(box, entry.querySelector('.receipt-box'));
    injectStyle();
    bindUI();
    renderIncomeTypes();
    loadFunds();
  }
  function injectStyle(){
    if(document.getElementById('posDanaStyle'))return;
    const s=document.createElement('style');s.id='posDanaStyle';s.textContent=`
      #posDanaBox{margin-top:12px;padding:14px;border:1px solid #bfdbfe;border-radius:16px;background:#f8fbff}.pos-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.pos-head h3{margin:0;font-size:17px}.pos-small{padding:8px 11px}.pos-select-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}.pos-balance{display:flex;align-items:center;padding:0 12px;border-radius:13px;background:#dbeafe;color:#1d4ed8;font-weight:850;white-space:nowrap;font-size:12px}.income-type-wrap{margin-top:9px}.income-type-row{display:grid;grid-template-columns:1fr auto;gap:8px}.fund-manager{margin-top:10px;border-top:1px solid #dbe3ee;padding-top:10px}.fund-manager-title{font-weight:850;margin-bottom:8px}.fund-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px}.fund-row:last-child{border-bottom:0}.fund-group{font-size:11px;color:#64748b}.fund-actions{display:flex;gap:5px}.add-fund-row{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;margin-top:10px}.hidden{display:none!important}@media(max-width:620px){.pos-select-row,.income-type-row,.add-fund-row{grid-template-columns:1fr}.pos-balance{min-height:42px;justify-content:center}}`;
    document.head.appendChild(s)
  }
  function bindUI(){
    $('manageFundsBtn').onclick=()=>{$('fundManager').classList.toggle('hidden');renderFundList()};
    $('addIncomeTypeBtn').onclick=addIncomeType;
    $('addFundBtn').onclick=addFund;
    $('fundSource').onchange=()=>{setSelectedFund($('fundSource').value);updateSelectedBalance()};
    $('type').addEventListener('change',updateIncomeMode);
  }
  function renderIncomeTypes(){const s=$('incomeType');if(!s)return;s.innerHTML=incomeTypes.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('');}
  function addIncomeType(){const name=prompt('Masukkan jenis pemasukan baru:');if(!name)return;const v=name.trim();if(!v)return;if(!incomeTypes.some(x=>x.toLowerCase()===v.toLowerCase())){incomeTypes.push(v);saveIncomeTypes();renderIncomeTypes();$('incomeType').value=v;toast('✅ Jenis pemasukan ditambahkan')}else{toast('Jenis pemasukan sudah ada')}}
  function renderFunds(){
    const s=$('fundSource');if(!s)return;
    const wanted=DESIRED.map(x=>x.name).filter(n=>funds.some(f=>f.name===n&&f.active!==false));
    let html='';
    ['Bank','Tabungan Emas'].forEach(group=>{const arr=DESIRED.filter(d=>d.group===group&&wanted.includes(d.name));if(!arr.length)return;html+=`<optgroup label="${escapeAttr(group)}">`;arr.forEach(d=>html+=`<option value="${escapeAttr(d.name)}">${escapeHtml(d.name)}</option>`);html+='</optgroup>'});
    s.innerHTML=html||'<option value="Bank Jago">Bank Jago</option>';
    const saved=selectedFund();s.value=(Array.from(s.options).some(o=>o.value===saved)?saved:s.options[0]?.value||'Bank Jago');setSelectedFund(s.value);updateSelectedBalance();renderFundList();
  }
  function updateSelectedBalance(){const v=selectedFund();const f=funds.find(x=>x.name===v);if($('fundBalance'))$('fundBalance').textContent='Saldo: '+rupiah(f?.balance||0)}
  function renderFundList(){const el=$('fundList');if(!el)return;el.innerHTML=funds.filter(f=>DESIRED.some(d=>d.name===f.name)).map(f=>{const meta=DESIRED.find(d=>d.name===f.name);return `<div class="fund-row"><div><b>${escapeHtml(f.name)}</b><div class="fund-group">${escapeHtml(meta?.group||'')}</div></div><div>${rupiah(f.balance)}</div><div class="fund-actions"><button type="button" class="icon" data-fund-active="${escapeAttr(f.id)}" data-active="${f.active!==false}">${f.active===false?'Aktifkan':'Nonaktifkan'}</button></div></div>`}).join('')||'<div class="hint">Belum ada pos.</div>';el.querySelectorAll('[data-fund-active]').forEach(b=>b.onclick=async()=>{const id=b.dataset.fundActive;const f=funds.find(x=>x.id===id);if(!f)return;await api('updateFund',{id,name:f.name,active:f.active===false});await loadFunds()})}
  async function loadFunds(){try{const r=await api('getFunds');if(r&&r.ok){funds=Array.isArray(r.data)?r.data:[];await ensureDesiredFunds();renderFunds();}}catch(e){/* keep local UI */}}
  async function ensureDesiredFunds(){
    const names=new Set(funds.map(f=>f.name));
    for(const d of DESIRED){if(!names.has(d.name)){try{await api('addFund',{name:d.name,opening:0})}catch(e){}}}
    for(const f of funds){if(LEGACY.includes(f.name)&&f.active!==false){try{await api('updateFund',{id:f.id,name:f.name,active:false})}catch(e){}}}
    try{const r=await api('getFunds');if(r&&r.ok)funds=Array.isArray(r.data)?r.data:funds}catch(e){}
  }
  async function addFund(){const name=($('newFundName').value||'').trim();const opening=Number($('newFundOpening').value)||0;if(!name){toast('Isi nama pos baru.');return}const r=await api('addFund',{name,opening});if(r&&r.ok){$('newFundName').value='';$('newFundOpening').value='';toast('✅ Pos dana ditambahkan')}else toast('Pos dana dikirim.');await loadFunds()}
  function updateIncomeMode(){const income=$('type')?.value==='income';$('incomeTypeWrap')?.classList.toggle('hidden',!income)}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function escapeAttr(s){return escapeHtml(s)}
  function toast(msg){if(typeof window.toast==='function'){window.toast(msg);return}let t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3000)}}
  function patchPostTransaction(){
    if(typeof window.postTransaction!=='function'||window.__posPatched)return;
    const original=window.postTransaction;
    window.postTransaction=async function(t){
      const fund=String($('fundSource')?.value||selectedFund()||'Bank Jago');
      const incomeType=String($('incomeType')?.value||'');
      const payload={action:'saveTransaction',id:String(t.id),date:t.date,type:t.type,merchant:t.merchant||'',description:t.desc||'',category:t.category||'Lainnya',amount:Number(t.amount)||0,paymentMethod:t.paymentMethod||'',ocrConfidence:t.ocrConfidence||'',ocrText:t.ocrText||'',source:t.type==='income'?(incomeType?('MoniKas | '+incomeType):'MoniKas'):'MoniKas',fund:fund,receipt:t.receiptDataUrl?{dataUrl:t.receiptDataUrl,confidence:t.ocrConfidence||'',ocrText:t.ocrText||''}:undefined};
      try{await fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return true}catch(e){return original(t)}
    };
    window.__posPatched=true;
  }
  function showFundOnForm(){
    const f=selectedFund();const income=$('type')?.value==='income';
    if($('fundSource')){$('fundSource').value=f;updateSelectedBalance()}
    if($('incomeTypeWrap'))$('incomeTypeWrap').classList.toggle('hidden',!income);
  }
  function start(){buildUI();patchPostTransaction();updateIncomeMode();showFundOnForm();setInterval(()=>{loadFunds();patchPostTransaction()},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,250));else setTimeout(start,250);
})();
