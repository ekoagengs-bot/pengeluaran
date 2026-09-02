/* MoniKas - restore original transaction form + source dana */
(function(){
  'use strict';
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
  const DEFAULT_INCOME=['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya'];
  const GAS='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  function renderFundSelect(){
    const s=$('fund');if(!s)return;
    const old=s.value;
    s.innerHTML=['Bank','Tabungan Emas','Lainnya'].map(g=>`<optgroup label="${g}">${DESIRED.filter(x=>x.group===g).map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</optgroup>`).join('');
    s.value=DESIRED.some(x=>x.name===old)?old:'Bank BNI';
    if(typeof updateFundHint==='function')updateFundHint();
  }
  function ensureIncomeType(){
    if(!$('type')||$('incomeTypeBox'))return;
    const box=document.createElement('div');box.id='incomeTypeBox';box.className='form';
    box.style.marginTop='0';
    box.innerHTML='<div class="row"><select id="incomeType" class="input"></select><button id="addIncomeType" class="btn secondary" type="button">+ Jenis Pemasukan</button></div>';
    const typeRow=$('type').closest('.row');
    if(typeRow)typeRow.insertAdjacentElement('afterend',box);else $('txForm')?.appendChild(box);
    renderIncomeType();
    const sync=()=>{box.style.display=$('type').value==='income'?'grid':'none';};
    $('type').addEventListener('change',sync);sync();
    $('addIncomeType').onclick=()=>{const v=(prompt('Masukkan jenis pemasukan baru:')||'').trim();if(!v)return;let list=[];try{list=JSON.parse(localStorage.getItem('monikas_income_types')||'[]')}catch(e){}if(!Array.isArray(list))list=[];if(!list.some(x=>x.toLowerCase()===v.toLowerCase())){list.push(v);localStorage.setItem('monikas_income_types',JSON.stringify(list));}renderIncomeType();$('incomeType').value=v;};
  }
  function renderIncomeType(){
    const s=$('incomeType');if(!s)return;
    let list=DEFAULT_INCOME.slice();try{const saved=JSON.parse(localStorage.getItem('monikas_income_types')||'[]');if(Array.isArray(saved))list=[...DEFAULT_INCOME,...saved.filter(x=>!DEFAULT_INCOME.some(d=>d.toLowerCase()===String(x).toLowerCase()))]}catch(e){}
    s.innerHTML=list.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  }
  function ensureFormVisible(){
    const entry=$('entryCard');
    if(entry)entry.style.display='block';
    const form=$('txForm');if(form){form.style.display='grid';form.removeAttribute('aria-hidden');}
    renderFundSelect();ensureIncomeType();
  }
  function preventInterference(){
    const obs=new MutationObserver(()=>ensureFormVisible());
    obs.observe(document.body,{childList:true,subtree:true});
    setInterval(ensureFormVisible,10000);
  }
  function start(){setTimeout(()=>{ensureFormVisible();preventInterference();},500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
