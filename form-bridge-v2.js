/* MoniKas - emergency transaction form bridge v2 */
(function(){
  'use strict';
  const GAS='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
  const DESIRED=['Bank BNI','Bank Jago','Bank BCA','Bank BSI','Ayah','Biyan','Eren','Bunda','Kas Utama','Lainnya'];
  const $=id=>document.getElementById(id);
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const today=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function style(){
    if($('mkFormBridgeStyle'))return;
    const s=document.createElement('style');s.id='mkFormBridgeStyle';s.textContent=`
      #mkRepairEntry{margin-top:12px}
      #mkRepairEntry .repair-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #mkRepairEntry .repair-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
      #mkRepairEntry input,#mkRepairEntry select,#mkRepairEntry button{font:inherit}
      #mkRepairEntry input,#mkRepairEntry select{width:100%;padding:12px 13px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;box-sizing:border-box}
      #mkRepairEntry .repair-actions input{display:none}
      @media(max-width:620px){#mkRepairEntry .repair-grid{grid-template-columns:1fr}#mkRepairEntry .repair-actions{grid-template-columns:1fr 1fr}.repair-actions button:last-child{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }

  function ensureForm(){
    if($('txForm') && $('entryCard')) return false;
    const dashboard=$('dashboardSection');
    if(!dashboard) return false;
    const wrapper=document.createElement('section');
    wrapper.className='grid2 section';wrapper.id='mkRepairEntry';
    wrapper.innerHTML=`
      <div class="card" id="entryCard">
        <div class="topline"><h2 id="formTitle">Tambah Transaksi</h2><span class="pill">Cloud + Perangkat</span></div>
        <div class="receipt-box">
          <div class="topline"><div><b>📷 Foto Struk</b><div class="hint">Foto → OCR → deteksi tanggal, toko, total, dan kategori</div></div><span class="pill">AI Detector</span></div>
          <div class="repair-actions" style="margin-top:10px">
            <label class="btn"><input id="camera" type="file" accept="image/*" capture="environment">Ambil Foto</label>
            <label class="btn secondary"><input id="gallery" type="file" accept="image/*">Pilih Foto</label>
            <button id="clearReceipt" class="btn secondary" type="button">Hapus Foto</button>
          </div>
          <img id="preview" class="preview hidden" alt="Preview struk">
          <div id="scanBox" class="scan hidden"><b id="scanText">Membaca struk…</b><div class="progress"><i id="scanProgress"></i></div></div>
        </div>
        <form id="txForm" class="form">
          <div class="repair-grid"><select id="type" class="input"><option value="expense">Pengeluaran</option><option value="income">Pendapatan</option></select><input id="date" class="input" type="date" required></div>
          <div id="incomeTypeRepair" class="repair-grid" style="display:none"><select id="incomeType" class="input"></select><button id="addIncomeTypeRepair" class="btn secondary" type="button">+ Jenis Pemasukan</button></div>
          <input id="merchant" class="input" placeholder="Nama toko / sumber pemasukan">
          <input id="desc" class="input" placeholder="Keterangan" required>
          <div class="repair-grid"><select id="category" class="input"><option>Makanan</option><option>Transportasi</option><option>Belanja</option><option>Tagihan</option><option>Pendidikan</option><option>Kesehatan</option><option>Hiburan</option><option>Lainnya</option></select><input id="amount" class="input" type="number" min="1" step="1" placeholder="Nominal (Rp)" required></div>
          <div><div class="label" style="margin-bottom:6px">Pos Dana</div><select id="fund" class="input" required></select><div id="fundHint" class="hint" style="margin-top:6px"></div></div>
          <button id="saveTx" class="btn" type="submit">Simpan Transaksi</button>
        </form>
      </div>
    `;
    dashboard.parentNode.insertBefore(wrapper,dashboard);
    $('date').value=today();
    return true;
  }

  function fillFund(){
    const s=$('fund');if(!s)return;
    const current=localStorage.getItem('monikas_selected_fund')||'Bank BNI';
    s.innerHTML=DESIRED.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    s.value=DESIRED.includes(current)?current:'Bank BNI';
    localStorage.setItem('monikas_selected_fund',s.value);
    if($('fundHint'))$('fundHint').textContent='Sumber dana: '+s.value;
  }

  function incomeTypes(){
    const s=$('incomeType');if(!s)return;
    let list=[];try{list=JSON.parse(localStorage.getItem('monikas_income_types')||'[]')}catch(e){}
    if(!Array.isArray(list)||!list.length)list=['Gaji','Usaha','Bonus / THR','Pendapatan Sampingan','Hadiah','Transfer','Lainnya'];
    s.innerHTML=list.map(x=>`<option>${esc(x)}</option>`).join('');
  }

  function bind(){
    const type=$('type');if(!type)return;
    if(type.dataset.mkBridge)return;type.dataset.mkBridge='1';
    type.addEventListener('change',()=>{const b=$('incomeTypeRepair');if(b)b.style.display=type.value==='income'?'grid':'none';});
    $('addIncomeTypeRepair')?.addEventListener('click',()=>{const v=prompt('Masukkan jenis pemasukan baru:');if(!v?.trim())return;let a=[];try{a=JSON.parse(localStorage.getItem('monikas_income_types')||'[]')}catch(e){}if(!Array.isArray(a))a=[];if(!a.some(x=>x.toLowerCase()===v.trim().toLowerCase()))a.push(v.trim());localStorage.setItem('monikas_income_types',JSON.stringify(a));incomeTypes();$('incomeType').value=v.trim();});
    $('fund')?.addEventListener('change',()=>{if($('fundHint'))$('fundHint').textContent='Sumber dana: '+$('fund').value});
  }

  function bindSubmit(){
    const form=$('txForm');if(!form||form.dataset.mkBridgeSubmit)return;form.dataset.mkBridgeSubmit='1';
    form.addEventListener('submit',async e=>{
      if(typeof window.postTransaction==='function')return;
      e.preventDefault();
      const t={id:Date.now(),date:$('date').value||today(),type:$('type').value,merchant:$('merchant').value.trim(),desc:$('desc').value.trim(),description:$('desc').value.trim(),category:$('category').value,amount:Number($('amount').value)||0,fund:$('fund').value||'Bank BNI',synced:false,source:'MoniKas'};
      if(!t.desc||!t.amount){alert('Isi keterangan dan nominal.');return;}
      const key='monikas_v4_local';let data={transactions:[],budgets:{}};try{data=JSON.parse(localStorage.getItem(key)||'null')||data}catch(e){}if(!Array.isArray(data.transactions))data.transactions=[];data.transactions.push(t);localStorage.setItem(key,JSON.stringify(data));
      try{await fetch(GAS,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveTransaction',id:String(t.id),date:t.date,type:t.type,merchant:t.merchant,description:t.desc,category:t.category,amount:t.amount,source:'MoniKas',fund:t.fund})});t.synced=true;localStorage.setItem(key,JSON.stringify(data));alert('Transaksi tersimpan.');}catch(e){alert('Tersimpan di perangkat; sinkronisasi dapat dilakukan kemudian.');}
      if(typeof window.loadCloud==='function')window.loadCloud();
    });
  }

  function start(){style();ensureForm();fillFund();incomeTypes();bind();bindSubmit();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,500));else setTimeout(start,500);
})();
