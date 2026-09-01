/* MoniKas V2 - Google Sheets synchronization */
const MONIKAS_GAS_URL='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
const MONIKAS_SHEET_KEY='monikas_gas_url';
const $s=id=>document.getElementById(id);
function gasUrlS(){return localStorage.getItem(MONIKAS_SHEET_KEY)||MONIKAS_GAS_URL}
function toastS(msg){let t=$s('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast'}t.textContent=msg;t.classList.remove('hidden');clearTimeout(window.__sheetToast);window.__sheetToast=setTimeout(()=>t.classList.add('hidden'),2800)}
function setPillS(){const b=$s('sync');if(b)b.textContent=gasUrlS()?'Sheets aktif':'Perangkat'}
function readTxS(){try{const d=JSON.parse(localStorage.getItem('monikas_v2_local')||'{}');return d.transactions||[]}catch{return[]}}
function snapshotS(){return JSON.stringify(readTxS())}
function findChangedS(beforeJson){const before=JSON.parse(beforeJson||'[]');const after=readTxS();const bm=new Map(before.map(x=>[String(x.id),JSON.stringify(x)]));const changed=after.filter(x=>!bm.has(String(x.id))||bm.get(String(x.id))!==JSON.stringify(x));return changed.sort((a,b)=>Number(b.id)-Number(a.id))[0]||null}
async function postJsonS(payload){
 const url=gasUrlS();
 if(!url)return false;
 try{
   await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),keepalive:true});
   return true;
 }catch(e){
   try{
     const body=JSON.stringify(payload);
     if(navigator.sendBeacon && navigator.sendBeacon(url,new Blob([body],{type:'text/plain;charset=utf-8'}))) return true;
   }catch(_e){}
   return false;
 }
}
async function syncTxS(t){
 if(!t)return false;
 const payload={action:'saveTransaction',id:String(t.id),date:t.date,type:t.type||'expense',merchant:t.merchant||'',description:t.desc||'',category:t.category||'Lainnya',amount:Number(t.amount)||0,paymentMethod:t.paymentMethod||'',ocrConfidence:t.ocrConfidence||'',ocrText:t.ocrText||'',source:'MoniKas V2'};
 const ok=await postJsonS(payload);
 toastS(ok?'✅ Data dikirim ke Google Sheet':'⚠️ Data tersimpan di HP, pengiriman ke Sheet gagal');
 return ok;
}
async function syncAllS(){for(const t of readTxS())await syncTxS(t)}
function openSettingsS(){
 const old=gasUrlS();let m=document.getElementById('sheetSyncModal');
 if(!m){m=document.createElement('div');m.id='sheetSyncModal';m.style='position:fixed;inset:0;background:#0f172a88;display:grid;place-items:center;padding:16px;z-index:9998';m.innerHTML='<div style="width:min(520px,100%);background:#fff;border-radius:20px;padding:18px"><div style="display:flex;justify-content:space-between"><h3 style="margin:0">Rekap Google Sheet</h3><button id="sxClose">✕</button></div><div style="margin-top:12px"><label style="font-size:12px;color:#64748b">URL Web App Google Apps Script</label><input id="sxUrl" style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;margin-top:6px"><p style="font-size:12px;color:#64748b;line-height:1.5">Spreadsheet tujuan sudah ditetapkan. URL bawaan MoniKas sudah aktif.</p></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button id="sxTest" class="btn secondary">Tes</button><button id="sxCancel" class="btn secondary">Batal</button><button id="sxSave" class="btn">Simpan</button></div></div>';document.body.appendChild(m);m.querySelector('#sxClose').onclick=()=>m.remove();m.querySelector('#sxCancel').onclick=()=>m.remove();m.querySelector('#sxSave').onclick=()=>{const v=m.querySelector('#sxUrl').value.trim()||MONIKAS_GAS_URL;localStorage.setItem(MONIKAS_SHEET_KEY,v);m.remove();setPillS();toastS('Rekap Google Sheet aktif')};m.querySelector('#sxTest').onclick=async()=>{const ok=await postJsonS({action:'ping'});toastS(ok?'✅ Permintaan tes terkirim':'❌ Tes gagal')}}
 m.querySelector('#sxUrl').value=old;m.classList.remove('hidden')
}
function installSheetSync(){
 setPillS();
 const parent=document.querySelector('.user')||document.querySelector('.head');
 if(parent&&!document.getElementById('sheetSyncBtn')){const btn=document.createElement('button');btn.id='sheetSyncBtn';btn.textContent='⚙ Rekap';btn.style='border:1px solid #334155;background:#1e293b;color:#fff;border-radius:10px;padding:9px 12px';btn.onclick=openSettingsS;parent.appendChild(btn)}
 const form=$s('txForm');
 if(form&&!form.dataset.sheetHook){form.dataset.sheetHook='1';form.addEventListener('submit',()=>{const before=snapshotS();setTimeout(()=>{const changed=findChangedS(before);if(changed)syncTxS(changed)},700)},true)}
 // Sinkronisasi ulang transaksi yang belum masuk dapat dipanggil manual dengan window.monikasSyncAll().
 window.monikasSyncAll=syncAllS;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSheetSync);else installSheetSync();
