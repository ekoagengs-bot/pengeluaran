/** MoniKas backend - Sheets + Drive, no login. */
const SPREADSHEET_ID='1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo';
const SHEET_TX='TRANSAKSI';
const SHEET_SUMMARY='REKAP BULANAN';
const DRIVE_FOLDER_NAME='MoniKas Struk';
const APP_NAME='MoniKas';
const HEADERS=['TIMESTAMP','ID TRANSAKSI','TANGGAL','JENIS','TOKO/SUMBER','KETERANGAN','KATEGORI','NOMINAL','METODE BAYAR','OCR CONFIDENCE','OCR TEXT','LINK STRUK','FILE ID','SUMBER'];

function doGet(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    const action=String(p.action||'status');
    if(action==='getSummary' || action==='getTransactions'){
      const result=getTransactionsFromSheet();
      return responseOrJsonp(result,p.callback);
    }
    if(action==='status'){
      setupMoniKas();
      return response({ok:true,app:APP_NAME,message:'Backend MoniKas aktif',sheets:[SHEET_TX,SHEET_SUMMARY],driveFolder:DRIVE_FOLDER_NAME});
    }
    if(action==='test'){
      return saveTransaction({id:'GET_TEST_'+Date.now(),date:today(),type:'expense',merchant:'TEST GET',description:'Tes koneksi Web App',category:'Lainnya',amount:1,paymentMethod:'TEST',source:'GET TEST'});
    }
    return response({ok:false,error:'Action GET tidak dikenal: '+action});
  }catch(err){return response({ok:false,error:String(err),stack:err.stack||''});}
}

function doPost(e){
  try{
    const body=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const p=JSON.parse(body); const action=String(p.action||'');
    if(action==='ping'){setupMoniKas();return response({ok:true,message:'PING OK'});}
    if(action==='setup')return response(setupMoniKas());
    if(action==='saveTransaction')return saveTransaction(p);
    if(action==='deleteTransaction')return deleteTransaction(p);
    if(action==='getSummary' || action==='getTransactions')return response(getTransactionsFromSheet());
    return response({ok:false,error:'Action tidak dikenal: '+action});
  }catch(err){return response({ok:false,error:String(err),stack:err.stack||''});}
}

function setupMoniKas(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx=getOrCreateTransactionSheet(ss); const summary=getOrCreateSummarySheet(ss); const folder=getOrCreateFolder();
  rebuildSummary(ss); formatTransactionSheet(tx); formatSummarySheet(summary); SpreadsheetApp.flush();
  return {ok:true,spreadsheetId:SPREADSHEET_ID,transactionSheet:tx.getName(),summarySheet:summary.getName(),driveFolder:folder.getName(),driveFolderId:folder.getId()};
}
function getOrCreateTransactionSheet(ss){let sh=ss.getSheetByName(SHEET_TX);if(!sh)sh=ss.insertSheet(SHEET_TX);sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);sh.setFrozenRows(1);return sh;}
function getOrCreateSummarySheet(ss){let sh=ss.getSheetByName(SHEET_SUMMARY);if(!sh)sh=ss.insertSheet(SHEET_SUMMARY);sh.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);sh.setFrozenRows(1);return sh;}
function getOrCreateFolder(){const it=DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);return it.hasNext()?it.next():DriveApp.createFolder(DRIVE_FOLDER_NAME);}

function saveTransaction(p){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const ss=SpreadsheetApp.openById(SPREADSHEET_ID);const sh=getOrCreateTransactionSheet(ss);const folder=getOrCreateFolder();
    const id=String(p.id||('TX_'+Date.now()));const oldRow=findRowById(sh,id);
    let receiptUrl='',receiptFileId='';const receiptDataUrl=p.receipt&&p.receipt.dataUrl?String(p.receipt.dataUrl):'';
    if(receiptDataUrl){const saved=saveReceipt(receiptDataUrl,String(p.date||today()),id,folder);receiptUrl=saved.url;receiptFileId=saved.fileId;}
    else if(oldRow){receiptUrl=String(sh.getRange(oldRow,12).getValue()||'');receiptFileId=String(sh.getRange(oldRow,13).getValue()||'');}
    const row=[[new Date(),id,String(p.date||today()),String(p.type||'expense'),String(p.merchant||''),String(p.description||''),String(p.category||'Lainnya'),Number(p.amount)||0,String(p.paymentMethod||''),String(p.ocrConfidence||(p.receipt&&p.receipt.confidence)||''),String(p.ocrText||(p.receipt&&p.receipt.ocrText)||''),receiptUrl,receiptFileId,String(p.source||APP_NAME)]];
    if(oldRow)sh.getRange(oldRow,1,1,row[0].length).setValues(row);else sh.getRange(sh.getLastRow()+1,1,1,row[0].length).setValues(row);
    rebuildSummary(ss);SpreadsheetApp.flush();
    return response({ok:true,id:id,updated:Boolean(oldRow),receiptUrl:receiptUrl,receiptFileId:receiptFileId});
  }finally{lock.releaseLock();}
}
function deleteTransaction(p){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);const sh=ss.getSheetByName(SHEET_TX);if(!sh)return response({ok:true,deleted:false});
  const id=String(p.id||'');const row=findRowById(sh,id);if(!row)return response({ok:true,deleted:false});
  const fileId=String(sh.getRange(row,13).getValue()||'');if(fileId){try{DriveApp.getFileById(fileId).setTrashed(true);}catch(e){}}
  sh.deleteRow(row);rebuildSummary(ss);SpreadsheetApp.flush();return response({ok:true,deleted:true,id:id});
}
function findRowById(sh,id){if(!id||sh.getLastRow()<2)return 0;const values=sh.getRange(2,2,sh.getLastRow()-1,1).getValues();for(let i=0;i<values.length;i++)if(String(values[i][0])===id)return i+2;return 0;}
function saveReceipt(dataUrl,date,id,folder){
  const m=String(dataUrl).match(/^data:(image\/[^;]+);base64,(.+)$/);if(!m)throw new Error('Format foto struk tidak valid');
  const mime=m[1];const bytes=Utilities.base64Decode(m[2]);let ext=(mime.split('/')[1]||'jpg').toLowerCase();if(ext==='jpeg')ext='jpg';
  const name='STRUK_'+date.replace(/[^0-9-]/g,'')+'_'+id.replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+ext;const file=folder.createFile(Utilities.newBlob(bytes,mime,name));
  return {url:file.getUrl(),fileId:file.getId(),name:file.getName()};
}

function getTransactionsFromSheet(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);const sh=ss.getSheetByName(SHEET_TX);
  if(!sh||sh.getLastRow()<2)return {ok:true,data:[],count:0,source:'Google Sheet'};
  const rows=sh.getRange(2,1,sh.getLastRow()-1,HEADERS.length).getValues();
  const tz=Session.getScriptTimeZone()||'Asia/Makassar';
  const formatTxDate=function(value){
    if(value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value,tz,'yyyy-MM-dd');
    const s=String(value||'').trim();
    if(!s)return '';
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');}
    const d=new Date(s);
    return isNaN(d.getTime())?'':Utilities.formatDate(d,tz,'yyyy-MM-dd');
  };
  const data=rows.map(function(r){return {
    id:String(r[1]||''),date:formatTxDate(r[2]),type:String(r[3]||'expense').toLowerCase()==='income'?'income':'expense',
    merchant:String(r[4]||''),description:String(r[5]||''),category:String(r[6]||'Lainnya'),amount:Number(r[7])||0,
    paymentMethod:String(r[8]||''),ocrConfidence:String(r[9]||''),ocrText:String(r[10]||''),receiptUrl:String(r[11]||''),receiptFileId:String(r[12]||''),source:String(r[13]||APP_NAME),synced:true
  };}).filter(x=>x.id&&x.date);
  return {ok:true,data:data,count:data.length,source:'Google Sheet',spreadsheetId:SPREADSHEET_ID};
}

function rebuildSummary(ss){
  const tx=ss.getSheetByName(SHEET_TX);const summary=getOrCreateSummarySheet(ss);summary.clearContents();
  summary.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);
  if(!tx||tx.getLastRow()<2)return;
  const rows=tx.getRange(2,1,tx.getLastRow()-1,HEADERS.length).getValues();const map={};
  rows.forEach(function(r){const d=parseDateValue(r[2]);if(!d)return;const month=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');if(!map[month])map[month]={income:0,expense:0,count:0};const amount=Number(r[7])||0;if(String(r[3]).toLowerCase()==='income')map[month].income+=amount;else map[month].expense+=amount;map[month].count++;});
  const months=Object.keys(map).sort().reverse();if(!months.length)return;const out=months.map(function(month){const x=map[month];return [month,x.income,x.expense,x.income-x.expense,x.count,x.income?x.expense/x.income:0];});
  summary.getRange(2,1,out.length,6).setValues(out);summary.getRange(2,2,out.length,3).setNumberFormat('#,##0');summary.getRange(2,6,out.length,1).setNumberFormat('0.00%');
}
function parseDateValue(v){
  if(v instanceof Date&&!isNaN(v.getTime()))return v;const s=String(v||'').trim();if(!s)return null;let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return new Date(y,Number(m[2])-1,Number(m[1]));}const d=new Date(s);return isNaN(d.getTime())?null:d;
}
function formatTransactionSheet(sh){sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setHorizontalAlignment('center');sh.setFrozenRows(1);const max=Math.max(1,sh.getMaxRows()-1);sh.getRange(2,8,max,1).setNumberFormat('#,##0');}
function formatSummarySheet(sh){sh.getRange(1,1,1,6).setFontWeight('bold').setHorizontalAlignment('center');sh.setFrozenRows(1);}
function today(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function response(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function responseOrJsonp(obj,callback){if(callback){const safe=String(callback).replace(/[^a-zA-Z0-9_$.]/g,'');return ContentService.createTextOutput(safe+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);}return response(obj);}
