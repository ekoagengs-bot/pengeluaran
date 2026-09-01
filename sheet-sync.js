/* MoniKas Google Sheets synchronization helper.
 * index.html now performs direct synchronization, but this helper remains
 * available for backwards compatibility with cached PWA versions.
 */
const MONIKAS_GAS_URL='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
const MONIKAS_SHEET_KEY='monikas_gas_url';
function gasUrlS(){return localStorage.getItem(MONIKAS_SHEET_KEY)||MONIKAS_GAS_URL}
async function postJsonS(payload){
  const url=gasUrlS();
  if(!url)return false;
  try{
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    return true;
  }catch(e){
    try{
      if(navigator.sendBeacon){
        return navigator.sendBeacon(url,new Blob([JSON.stringify(payload)],{type:'text/plain;charset=utf-8'}));
      }
    }catch(_e){}
    return false;
  }
}
async function syncTxS(t){
  if(!t)return false;
  const payload={action:'saveTransaction',id:String(t.id),date:t.date,type:t.type||'expense',merchant:t.merchant||'',description:t.desc||'',category:t.category||'Lainnya',amount:Number(t.amount)||0,paymentMethod:t.paymentMethod||'',ocrConfidence:t.ocrConfidence||'',ocrText:t.ocrText||'',source:t.source||'MoniKas'};
  if(t.receiptDataUrl)payload.receipt={dataUrl:t.receiptDataUrl,confidence:t.ocrConfidence||'',ocrText:t.ocrText||''};
  return postJsonS(payload);
}
async function syncAllS(list){
  const items=Array.isArray(list)?list:[];
  for(const t of items)await syncTxS(t);
}
window.monikasSheetSync={syncTx:syncTxS,syncAll:syncAllS,gasUrl:gasUrlS};
