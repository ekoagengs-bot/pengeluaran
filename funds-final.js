/* MoniKas - final source funds authority v2 */
(function(){
  'use strict';
  const GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const DESIRED=[
    {name:'Bank BNI',group:'Bank'},
    {name:'Bank Jago',group:'Bank'},
    {name:'Bank BCA',group:'Bank'},
    {name:'Bank BSI',group:'Bank'},
    {name:'Ayah',group:'Tabungan Emas'},
    {name:'Biyan',group:'Tabungan Emas'},
    {name:'Eren',group:'Tabungan Emas'},
    {name:'Bunda',group:'Tabungan Emas'},
    {name:'Kas Utama',group:'Lainnya'},
    {name:'Lainnya',group:'Lainnya'}
  ];
  const HIDE=['Gaji','Usaha','Pendapatan Sampingan','Bonus / THR','Investasi'];
  const FUND_KEY='monikas_selected_fund';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const attr=esc;
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  let funds=[];

  function jsonp(url){return new Promise((resolve,reject)=>{const cb='__mk_final2_'+Date.now()+'_'+Math.floor(Math.random()*10000);const s=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove()}window[cb]=v=>{cleanup();resolve(v)};s.onerror=()=>{cleanup();reject(new Error('network'))};s.src=url+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)});}
  const getFunds=()=>jsonp(GAS+'?action=getFunds');
  const post=(action,payload)=>fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload||{}))});

  async function ensureBackend(){
    try{
      const r=await getFunds();
      funds=Array.isArray(r?.data)?r.data:[];
      const have=new Set(funds.map(f=>String(f.name||'').trim()));
      for(const d of DESIRED) if(!have.has(d.name)) await post('addFund',{name:d.name,opening:0}).catch(()=>{});
      for(const f of funds) if(HIDE.includes(String(f.name||'')) && f.active!==false) await post('updateFund',{id:f.id,name:f.name,active:false}).catch(()=>{});
      const fresh=await getFunds().catch(()=>null);
      if(fresh?.ok) funds=Array.isArray(fresh.data)?fresh.data:funds;
    }catch(e){}
  }

  function styles(){
    if($('fundsFinalV2Style'))return;
    const s=document.createElement('style');s.id='fundsFinalV2Style';s.textContent=`
      .fund-final-section{margin-top:12px}
      .fund-final-headrow{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
      .fund-final-title{margin:0}
      .fund-final-sub{font-size:12px;color:#64748b;line-height:1.45}
      .fund-final-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .fund-final-card{background:#f8fafc;border:1px solid #dbe3ee;border-radius:14px;padding:13px}
      .fund-final-cardhead{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .fund-final-balance{font-size:20px;font-weight:900;color:#2563eb;margin-top:7px}
      .fund-final-meta{font-size:11px;color:#64748b;margin-top:3px}
      .fund-final-manager{margin-top:12px;padding-top:12px;border-top:1px solid #dbe3ee}
      .fund-final-input{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;box-sizing:border-box}
      .fund-final-income{margin-top:10px;padding:11px;border:1px solid #dbe3ee;border-radius:13px;background:#fff}
      .fund-final-income-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:7px}
      @media(max-width:620px){.fund-final-grid{grid-template-columns:1fr}.fund-final-income-row{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function buildIncomeType(){
    if(!$('type')||$('incomeType'))return;
    const wrap=document.createElement('div');wrap.id='incomeTypeBoxFinal';wrap.className='fund-final-income';
    wrap.innerHTML='<div class="label"><b>Jenis Pemasukan</b> <span style="font-weight:400">(hanya muncul saat Pendapatan)</span></div><div class="fund-final-income-row"><select id="incomeType" class="input"></select><button id="addIncomeTypeFinal" type="button" class="btn secondary">+ Jenis</button></div>';
    const row=$('type').closest('.row');
    if(row) row.insertAdjacentElement('afterend',wrap); else $('txForm')?.prepend(wrap);
    renderIncomeType();
    $('addIncomeTypeFinal').onclick=()=>{
      const value=window.prompt('Masukkan jenis pemasukan baru:');
      if(!value)return;
      const name=value.trim();if(!name)return;
      let list=[];try{list=JSON.parse(localStorage.getItem('monikas_income_types')||'[]')}catch(e){}
      if(!Array.isArray(list))list=[];
      if(!list.some(x=>String(x).toLowerCase()===name.toLowerCase())){list.push(name);localStorage.setItem('monikas_income_types',JSON.stringify(list));}
      renderIncomeType();if($('incomeType'))$('incomeType').value=name;
    };
  }
  function renderIncomeType(){
    const s=$('incomeType');if(!s)return;
    let list=[];try{list=JSON.parse(localStorage.getItem('monikas_income_types')||'[]')}catch(e){}
    if(!Array.isArray(list)||!list.length)list=['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya'];
    s.innerHTML=list.map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('');
    syncIncomeVisibility();
  }
  function syncIncomeVisibility(){const box=$('incomeTypeBoxFinal');if(box)box.style.display=$('type')?.value==='income'?'block':'none';}

  function renderSelect(){
    const s=$('fund');if(!s)return;
    const current=localStorage.getItem(FUND_KEY)||'Bank Jago';
    let html='';
    for(const g of ['Bank','Tabungan Emas','Lainnya']){
      const list=DESIRED.filter(d=>d.group===g);
      html+=`<optgroup label="${attr(g)}">`+list.map(d=>`<option value="${attr(d.name)}">${esc(d.name)}</option>`).join('')+'</optgroup>';
    }
    s.innerHTML=html;
    s.value=DESIRED.some(d=>d.name===current)?current:'Bank Jago';
    localStorage.setItem(FUND_KEY,s.value);updateHint();s.onchange=updateHint;
  }
  function updateHint(){const v=$('fund')?.value;const f=funds.find(x=>x.name===v);if($('fundHint'))$('fundHint').textContent=`Saldo ${v}: ${rupiah(f?.balance||0)}`;}

  function renderSection(){
    const oldGrid=$('fundsGrid');
    const oldSection=oldGrid?.closest('.card.section')||(oldGrid?oldGrid.parentElement:null);
    if(!oldSection)return;
    oldSection.classList.add('fund-final-section');
    oldSection.innerHTML=`<div class="fund-final-headrow"><div><h2 class="fund-final-title">💰 Pos Pemasukan / Sumber Dana</h2><div class="fund-final-sub">Pilih sumber dana saat mencatat transaksi. Pemasukan menambah saldo, pengeluaran mengurangi saldo.</div></div></div><div id="fundsGrid" class="fund-final-grid"></div><div class="fund-final-manager"><div class="label"><b>Tambah sumber dana manual</b></div><div class="fund-final-sub">Bisa digunakan untuk rekening/dompet baru.</div><div class="fund-final-addrow" style="display:grid;grid-template-columns:1.4fr 1fr auto;gap:8px;margin-top:8px"><input id="fundFinalName" class="fund-final-input" placeholder="Nama sumber dana"><input id="fundFinalOpening" class="fund-final-input" type="number" min="0" step="1" placeholder="Saldo awal (Rp)"><button id="fundFinalAdd" class="btn secondary" type="button">+ Tambah</button></div></div>`;
    $('fundFinalAdd').onclick=async()=>{const name=($('fundFinalName').value||'').trim();const opening=Number($('fundFinalOpening').value)||0;if(!name||DESIRED.some(d=>d.name.toLowerCase()===name.toLowerCase()))return;await post('addFund',{name,opening}).catch(()=>{});$('fundFinalName').value='';$('fundFinalOpening').value='';await loadAndRender();};
  }

  function renderCards(){
    const grid=$('fundsGrid');if(!grid)return;
    const map=new Map(funds.map(f=>[String(f.name||''),f]));
    grid.innerHTML=DESIRED.map(d=>{const f=map.get(d.name)||{balance:0,income:0,expense:0};return `<div class="fund-final-card"><div class="fund-final-cardhead"><b>${esc(d.name)}</b><span class="pill">${esc(d.group)}</span></div><div class="fund-final-balance">${rupiah(f.balance)}</div><div class="fund-final-meta">Masuk ${rupiah(f.income)} • Keluar ${rupiah(f.expense)}</div></div>`}).join('');
  }

  function cleanLegacy(){
    document.querySelectorAll('.fund-v5-manager,.fund-v5-card,.fund-row').forEach(el=>el.remove());
    const s=$('fund');if(s)Array.from(s.options).forEach(o=>{if(!DESIRED.some(d=>d.name===o.value))o.remove();});
  }

  async function loadAndRender(){await ensureBackend();renderSection();renderCards();renderSelect();cleanLegacy();buildIncomeType();}

  function watch(){
    const observer=new MutationObserver(()=>{
      if(!document.body.contains($('fundsGrid')))try{renderSection();renderCards();renderSelect();}
      catch(e){}
      cleanLegacy();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>loadAndRender().catch(()=>{}),60000);
  }
  function start(){styles();loadAndRender().then(watch).catch(()=>{renderSection();renderSelect();buildIncomeType();watch();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,300));else setTimeout(start,300);
})();
