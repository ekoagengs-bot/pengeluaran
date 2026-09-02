// MoniKas form recovery - keeps the transaction form visible and usable.
(function(){
  'use strict';
  const DESIRED=['Bank BNI','Bank Jago','Bank BCA','Bank BSI','Ayah','Biyan','Eren','Bunda','Kas Utama','Lainnya'];
  const GROUPS={Bank:['Bank BNI','Bank Jago','Bank BCA','Bank BSI'],'Tabungan Emas':['Ayah','Biyan','Eren','Bunda'],'Lainnya':['Kas Utama','Lainnya']};
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);

  function makeFundOptions(){
    return Object.entries(GROUPS).map(([g,items])=>`<optgroup label="${g}">${items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</optgroup>`).join('');
  }

  function fundSelect(){
    const s=$('fund'); if(!s) return;
    const current=DESIRED.includes(s.value)?s.value:(localStorage.getItem('monikas_selected_fund')||'Bank BNI');
    s.innerHTML=makeFundOptions();
    s.value=DESIRED.includes(current)?current:'Bank BNI';
    localStorage.setItem('monikas_selected_fund',s.value);
    if(typeof window.updateFundHint==='function')window.updateFundHint();
  }

  function buildFormCard(){
    let host=document.querySelector('.grid2');
    if(!host)return;
    let card=$('entryCard');
    if(card){
      card.hidden=false; card.style.display='block'; card.style.visibility='visible'; card.style.opacity='1'; return;
    }
    card=document.createElement('div'); card.id='entryCard'; card.className='card';
    card.innerHTML=`<div class="topline"><h2 id="formTitle">Tambah Transaksi</h2><span class="pill">Cloud + Perangkat</span></div>
      <div class="receipt-box"><div class="topline"><div><b>📷 Foto Struk</b><div class="hint">Foto → OCR → deteksi tanggal, toko, total, dan kategori</div></div><span class="pill">AI Detector</span></div>
      <div class="receipt-actions"><label class="btn"><input id="camera" type="file" accept="image/*" capture="environment">Ambil Foto</label><label class="btn secondary"><input id="gallery" type="file" accept="image/*">Pilih Foto</label><button id="clearReceipt" class="btn secondary" type="button">Hapus Foto</button></div>
      <img id="preview" class="preview hidden" alt="Preview struk"><div id="scanBox" class="scan hidden"><b id="scanText">Membaca struk…</b><div class="progress"><i id="scanProgress"></i></div></div></div>
      <form id="txForm" class="form"><div class="row"><select id="type" class="input"><option value="expense">Pengeluaran</option><option value="income">Pendapatan</option></select><input id="date" class="input" type="date" required></div>
      <input id="merchant" class="input" placeholder="Nama toko / sumber pemasukan"><input id="desc" class="input" placeholder="Keterangan" required>
      <div class="row"><select id="category" class="input"><option>Makanan</option><option>Transportasi</option><option>Belanja</option><option>Tagihan</option><option>Pendidikan</option><option>Kesehatan</option><option>Hiburan</option><option>Lainnya</option></select><input id="amount" class="input" type="number" min="1" step="1" placeholder="Nominal (Rp)" required></div>
      <div><div class="label" style="margin-bottom:6px">Pos Dana</div><select id="fund" class="input" required>${makeFundOptions()}</select><div id="fundHint" class="hint" style="margin-top:6px"></div></div>
      <button id="saveTx" class="btn" type="submit">Simpan Transaksi</button></form>`;
    host.insertBefore(card,host.firstElementChild||null);
    bindForm();
  }

  function bindForm(){
    const form=$('txForm'); if(!form||form.__mkBound)return;
    form.__mkBound=true;
    const today=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())};
    $('date').value=today();
    fundSelect();
    const f=$('fund'); if(f)f.onchange=()=>{localStorage.setItem('monikas_selected_fund',f.value);if(typeof window.updateFundHint==='function')window.updateFundHint();};
    $('type').onchange=()=>{};
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const type=$('type').value,amount=Number($('amount').value)||0,fund=$('fund').value||'Bank BNI';
      const t={id:Date.now(),date:$('date').value,type,merchant:$('merchant').value.trim(),desc:$('desc').value.trim(),description:$('desc').value.trim(),category:$('category').value,amount,paymentMethod:'',source:'MoniKas',fund,synced:false,ocrConfidence:'',ocrText:''};
      if(!t.date||!t.desc||!amount){alert('Isi tanggal, keterangan, dan nominal.');return;}
      try{
        if(typeof data!=='undefined'){
          data.transactions=Array.isArray(data.transactions)?data.transactions:data.transactions||[];
          data.transactions.push(t);
          if(typeof saveLocal==='function')saveLocal();
          if(typeof render==='function')render();
        }
        if(typeof window.postTransaction==='function') await window.postTransaction(t);
        t.synced=true;
        if(typeof saveLocal==='function')saveLocal();
        if(typeof render==='function')render();
        if(typeof window.loadCloud==='function')await window.loadCloud();
      }catch(err){console.warn('form save',err);}
    });
    const clear=$('clearReceipt');if(clear)clear.onclick=()=>{const p=$('preview');if(p){p.src='';p.classList.add('hidden')}const s=$('scanBox');if(s)s.classList.add('hidden');};
  }

  function force(){
    buildFormCard();
    fundSelect();
    const card=$('entryCard');if(card){card.hidden=false;card.style.display='block';card.style.visibility='visible';card.style.opacity='1';}
    const host=document.querySelector('.grid2');if(host)host.style.display='grid';
  }
  function start(){setTimeout(force,700);setTimeout(force,2200);setInterval(force,10000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
