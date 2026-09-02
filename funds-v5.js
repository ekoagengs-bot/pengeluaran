/* MoniKas V5 - sumber dana baru + jenis pemasukan manual */
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
    {name:'Bunda',group:'Tabungan Emas'}
  ];
  const LEGACY=['Kas Utama','Gaji','Usaha','Pendapatan Sampingan','Bonus / THR','Investasi','Lainnya'];
  const INCOME_KEY='monikas_income_types';
  const FUND_KEY='monikas_selected_fund';
  const DEFAULT_INCOME=['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya'];
  let funds=[];

  const $=id=>document.getElementById(id);
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const attr=esc;

  function jsonp(url){
    return new Promise((resolve,reject)=>{
      const cb='__mk_fund_'+Date.now()+'_'+Math.floor(Math.random()*10000);
      const s=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);
      function cleanup(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}s.remove()}
      window[cb]=v=>{cleanup();resolve(v)};
      s.onerror=()=>{cleanup();reject(new Error('network'))};
      s.src=url+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }
  function apiGet(action){return jsonp(GAS+'?action='+encodeURIComponent(action));}
  function apiPost(action,payload){return fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload||{}))}).then(()=>({ok:true}));}

  function incomeTypes(){
    try{
      const v=JSON.parse(localStorage.getItem(INCOME_KEY)||'null');
      if(Array.isArray(v)&&v.length)return v;
    }catch(e){}
    const v=DEFAULT_INCOME.slice();
    localStorage.setItem(INCOME_KEY,JSON.stringify(v));
    return v;
  }
  function saveIncomeTypes(v){localStorage.setItem(INCOME_KEY,JSON.stringify(v));}

  function activeDesired(){
    return DESIRED.filter(d=>{
      const f=funds.find(x=>x.name===d.name);
      return !f || f.active!==false;
    });
  }

  function injectStyle(){
    if($('fundsV5Style'))return;
    const s=document.createElement('style');s.id='fundsV5Style';s.textContent=`
      .fund-v5{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .fund-v5-card{background:#f8fafc;border:1px solid #dbe3ee;border-radius:14px;padding:13px}
      .fund-v5-card .fh{display:flex;justify-content:space-between;gap:8px;align-items:center}
      .fund-v5-card .fg{font-size:11px;color:#64748b;margin-top:2px}
      .fund-v5-card .fb{font-size:20px;font-weight:900;color:#2563eb;margin-top:6px}
      .fund-v5-card .fm{font-size:11px;color:#64748b;margin-top:3px}
      .fund-v5-manager{margin-top:12px;padding-top:12px;border-top:1px solid #dbe3ee}
      .fund-v5-add{display:grid;grid-template-columns:1.4fr 1fr auto;gap:8px;margin-top:9px}
      .fund-v5-income{margin-top:9px;padding:11px;border:1px solid #dbe3ee;border-radius:13px;background:#fff}
      .fund-v5-income-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:7px}
      @media(max-width:620px){.fund-v5{grid-template-columns:1fr}.fund-v5-add,.fund-v5-income-row{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function buildIncomeType(){
    if(!$('type')||$('incomeType'))return;
    const wrap=document.createElement('div');wrap.id='incomeTypeBox';wrap.className='fund-v5-income';
    wrap.innerHTML='<div class="label"><b>Jenis Pemasukan</b> <span style="font-weight:400">(aktif saat transaksi = Pendapatan)</span></div>'+
      '<div class="fund-v5-income-row"><select id="incomeType" class="input"></select><button id="addIncomeTypeV5" type="button" class="btn secondary">+ Jenis</button></div>';
    $('type').closest('.row')?.insertAdjacentElement('afterend',wrap) || $('txForm')?.prepend(wrap);
    renderIncomeType();
    $('addIncomeTypeV5').onclick=()=>{
      const v=prompt('Masukkan jenis pemasukan baru:');
      if(!v)return;
      const name=v.trim();if(!name)return;
      const list=incomeTypes();
      if(!list.some(x=>x.toLowerCase()===name.toLowerCase())){list.push(name);saveIncomeTypes(list);renderIncomeType();$('incomeType').value=name;notify('✅ Jenis pemasukan ditambahkan')}
    };
    $('type').addEventListener('change',syncIncomeVisibility);
  }
  function renderIncomeType(){const s=$('incomeType');if(!s)return;s.innerHTML=incomeTypes().map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('');syncIncomeVisibility();}
  function syncIncomeVisibility(){const box=$('incomeTypeBox');if(box)box.style.display=$('type')?.value==='income'?'block':'none';}

  function renderFundSelect(){
    const s=$('fund');if(!s)return;
    const active=activeDesired();
    const current=localStorage.getItem(FUND_KEY)||'Bank Jago';
    let html='';
    ['Bank','Tabungan Emas'].forEach(group=>{
      const arr=active.filter(x=>x.group===group);
      if(!arr.length)return;
      html+=`<optgroup label="${attr(group)}">`;
      arr.forEach(x=>html+=`<option value="${attr(x.name)}">${esc(x.name)}</option>`);
      html+='</optgroup>';
    });
    s.innerHTML=html || '<option value="Bank Jago">Bank Jago</option>';
    s.value=Array.from(s.options).some(o=>o.value===current)?current:(s.options[0]?.value||'Bank Jago');
    localStorage.setItem(FUND_KEY,s.value);
    updateHint();
    s.onchange=()=>{localStorage.setItem(FUND_KEY,s.value);updateHint()};
  }
  function updateHint(){const v=$('fund')?.value;const f=funds.find(x=>x.name===v);if($('fundHint'))$('fundHint').textContent=f?`Saldo ${v}: ${rupiah(f.balance||0)}`:'Sumber dana';}

  function renderCards(){
    const grid=$('fundsGrid');if(!grid)return;
    const desired=activeDesired();
    grid.innerHTML=desired.map(x=>{
      const f=funds.find(z=>z.name===x.name)||{balance:0,income:0,expense:0,active:true};
      return `<div class="fund-v5-card"><div class="fh"><b>${esc(x.name)}</b><span class="pill">${esc(x.group)}</span></div><div class="fb">${rupiah(f.balance)}</div><div class="fm">Masuk ${rupiah(f.income||0)} • Keluar ${rupiah(f.expense||0)}</div></div>`;
    }).join('') || '<div class="empty">Belum ada sumber dana aktif.</div>';
    const section=grid.parentElement;
    if(section&&!section.querySelector('.fund-v5-manager')){
      const manager=document.createElement('div');manager.className='fund-v5-manager';manager.innerHTML=`<div class="topline"><div><b>Tambah sumber dana manual</b><div class="hint">Contoh: Dana Darurat, Dompet, Rekening lain.</div></div></div><div class="fund-v5-add"><input id="fundV5Name" class="input" placeholder="Nama sumber dana"><input id="fundV5Opening" class="input" type="number" min="0" step="1" placeholder="Saldo awal (Rp)"><button id="fundV5Add" class="btn">+ Tambah</button></div>`;
      section.appendChild(manager);
      $('fundV5Add').onclick=async()=>{const name=($('fundV5Name').value||'').trim();const opening=Number($('fundV5Opening').value)||0;if(!name){notify('Isi nama sumber dana.');return}const exists=funds.some(f=>f.name.toLowerCase()===name.toLowerCase());if(exists){notify('Sumber dana sudah ada.');return}try{await apiPost('addFund',{name,opening});$('fundV5Name').value='';$('fundV5Opening').value='';notify('✅ Sumber dana ditambahkan');await loadFunds()}catch(e){notify('Gagal menambah sumber dana')}};
    }
  }

  function notify(msg){
    if(typeof window.toast==='function'){window.toast(msg);return}
    let t=$('toast');if(t){t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3000)}
  }

  function patchPostTransaction(){
    if(typeof window.postTransaction!=='function'||window.__fundsV5Patched)return;
    const original=window.postTransaction;
    window.postTransaction=async function(t){
      const fund=$('fund')?.value||localStorage.getItem(FUND_KEY)||'Bank Jago';
      const incomeType=$('incomeType')?.value||'';
      const source=t.type==='income' && incomeType ? `MoniKas | ${incomeType}` : 'MoniKas';
      const payload={action:'saveTransaction',id:String(t.id),date:t.date,type:t.type,merchant:t.merchant||'',description:t.desc||'',category:t.category||'Lainnya',amount:Number(t.amount)||0,paymentMethod:t.paymentMethod||'',ocrConfidence:t.ocrConfidence||'',ocrText:t.ocrText||'',source, fund, receipt:t.receiptDataUrl?{dataUrl:t.receiptDataUrl,confidence:t.ocrConfidence||'',ocrText:t.ocrText||''}:undefined};
      try{await fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return true}catch(e){return original(t)}
    };
    window.__fundsV5Patched=true;
  }

  async function loadFunds(){
    try{
      const r=await apiGet('getFunds');
      if(r&&r.ok){funds=Array.isArray(r.data)?r.data:[];DESIRED.forEach(d=>{if(!funds.some(f=>f.name===d.name))apiPost('addFund',{name:d.name,opening:0}).catch(()=>{})});
        // Hide legacy funds in the backend without changing historical transactions.
        for(const f of funds){if(LEGACY.includes(f.name)&&f.active!==false){apiPost('updateFund',{id:f.id,name:f.name,active:false}).catch(()=>{})}}
        renderCards();renderFundSelect();patchPostTransaction();
      }
    }catch(e){renderFundSelect();patchPostTransaction()}
  }

  function start(){
    injectStyle();
    buildIncomeType();
    renderCards();
    renderFundSelect();
    patchPostTransaction();
    loadFunds();
    setInterval(()=>{loadFunds()},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,300));else setTimeout(start,300);
})();
