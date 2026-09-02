/** MoniKas V5 - Google Sheets + Drive Backend */
const SPREADSHEET_ID='1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo';
const SHEET_TX='TRANSAKSI';
const SHEET_SUMMARY='REKAP BULANAN';
const SHEET_FUNDS='POS PEMASUKAN';
const DRIVE_FOLDER_NAME='MoniKas Struk';
const APP_NAME='MoniKas';
const DEFAULT_FUND='Kas Utama';
const DEFAULT_FUNDS=['Bank BNI','Bank Jago','Bank BCA','Bank BSI','Ayah','Biyan','Eren','Bunda','Kas Utama','Lainnya'];
const HEADERS=['TIMESTAMP','ID TRANSAKSI','TANGGAL','JENIS','TOKO/SUMBER','KETERANGAN','KATEGORI','NOMINAL','METODE BAYAR','OCR CONFIDENCE','OCR TEXT','LINK STRUK','FILE ID','SUMBER','POS DANA','JENIS PEMASUKAN'];
const FUND_HEADERS=['ID POS','NAMA POS','SALDO AWAL','TOTAL PEMASUKAN','TOTAL PENGELUARAN','SALDO AKHIR','AKTIF','DIBUAT'];

function doGet(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    const action=String(p.action||'status');
    if(action==='getTransactions'||action==='getSummary') return responseOrJsonp(getTransactionsFromSheet(),p.callback);
    if(action==='getFunds') return responseOrJsonp(getFunds(),p.callback);
    if(action==='status') return response({ok:true,app:APP_NAME,spreadsheetId:SPREADSHEET_ID,message:'Backend aktif'});
    if(action==='setup') return response(setupMoniKas());
    if(action==='test') return saveTransaction({id:'GET_TEST_'+Date.now(),date:today(),type:'expense',merchant:'TEST GET',description:'Tes koneksi Web App',category:'Lainnya',amount:1,paymentMethod:'TEST',fund:DEFAULT_FUND,source:'GET TEST'});
    return response({ok:false,error:'Action GET tidak dikenal: '+action});
  }catch(err){return response({ok:false,error:String(err),stack:err.stack||''});}
}

function doPost(e){
  try{
    const body=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const p=JSON.parse(body),action=String(p.action||'');
    if(action==='ping'){return response({ok:true,message:'PING OK',spreadsheetId:SPREADSHEET_ID});}
    if(action==='setup') return response(setupMoniKas());
    if(action==='saveTransaction') return saveTransaction(p);
    if(action==='deleteTransaction') return deleteTransaction(p);
    if(action==='getTransactions'||action==='getSummary') return response(getTransactionsFromSheet());
    if(action==='getFunds') return response(getFunds());
    if(action==='addFund') return response(addFund(p));
    if(action==='updateFund') return response(updateFund(p));
    if(action==='deleteFund') return response(deleteFund(p));
    return response({ok:false,error:'Action tidak dikenal: '+action});
  }catch(err){return response({ok:false,error:String(err),stack:err.stack||''});}
}

function setupMoniKas(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx=getOrCreateTransactionSheet(ss),summary=getOrCreateSummarySheet(ss),funds=getOrCreateFundsSheet(ss),folder=getOrCreateFolder();
  migrateTransactionHeaders(tx);seedDefaultFunds(funds);rebuildSummary(ss);rebuildFunds(ss);
  formatTransactionSheet(tx);formatSummarySheet(summary);formatFundsSheet(funds);SpreadsheetApp.flush();
  return {ok:true,spreadsheetId:SPREADSHEET_ID,transactionSheet:tx.getName(),summarySheet:summary.getName(),fundsSheet:funds.getName(),driveFolder:folder.getName(),driveFolderId:folder.getId()};
}

function getOrCreateTransactionSheet(ss){let sh=ss.getSheetByName(SHEET_TX);if(!sh)sh=ss.insertSheet(SHEET_TX);migrateTransactionHeaders(sh);return sh;}
function migrateTransactionHeaders(sh){
  const current=sh.getLastColumn();
  if(current===0){sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);sh.setFrozenRows(1);return;}
  const existing=sh.getRange(1,1,1,Math.max(current,HEADERS.length)).getValues()[0].map(String);
  HEADERS.forEach((h,i)=>{if(existing[i]!==h)sh.getRange(1,i+1).setValue(h);});
  sh.setFrozenRows(1);
}
function getOrCreateSummarySheet(ss){let sh=ss.getSheetByName(SHEET_SUMMARY);if(!sh)sh=ss.insertSheet(SHEET_SUMMARY);sh.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);sh.setFrozenRows(1);return sh;}
function getOrCreateFundsSheet(ss){let sh=ss.getSheetByName(SHEET_FUNDS);if(!sh)sh=ss.insertSheet(SHEET_FUNDS);sh.getRange(1,1,1,FUND_HEADERS.length).setValues([FUND_HEADERS]);sh.setFrozenRows(1);return sh;}
function getOrCreateFolder(){const it=DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);return it.hasNext()?it.next():DriveApp.createFolder(DRIVE_FOLDER_NAME);}
function seedDefaultFunds(sh){
  const existing=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,7).getValues():[];
  const names=new Set(existing.map(r=>String(r[1]||'').trim()).filter(Boolean));
  DEFAULT_FUNDS.forEach(name=>{if(!names.has(name))sh.appendRow([newFundId(),name,0,0,0,0,true,new Date()]);});
  SpreadsheetApp.flush();
}
function newFundId(){return 'FUND_'+Date.now()+'_'+Math.floor(Math.random()*10000);}

function saveTransaction(p){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateTransactionSheet(ss),folder=getOrCreateFolder();
    const id=String(p.id||('TX_'+Date.now())),oldRow=findRowById(sh,id);
    let receiptUrl='',receiptFileId='';
    const receiptDataUrl=p.receipt&&p.receipt.dataUrl?String(p.receipt.dataUrl):'';
    if(receiptDataUrl){const saved=saveReceipt(receiptDataUrl,String(p.date||today()),id,folder);receiptUrl=saved.url;receiptFileId=saved.fileId;}
    else if(oldRow){receiptUrl=String(sh.getRange(oldRow,12).getValue()||'');receiptFileId=String(sh.getRange(oldRow,13).getValue()||'');}
    const fund=String(p.fund||p.fundSource||DEFAULT_FUND)||DEFAULT_FUND;
    const incomeType=String(p.incomeType||'');
    const row=[[new Date(),id,String(p.date||today()),String(p.type||'expense'),String(p.merchant||''),String(p.description||p.desc||''),String(p.category||'Lainnya'),Number(p.amount)||0,String(p.paymentMethod||''),String(p.ocrConfidence||(p.receipt&&p.receipt.confidence)||''),String(p.ocrText||(p.receipt&&p.receipt.ocrText)||''),receiptUrl,receiptFileId,String(p.source||APP_NAME),fund,incomeType]];
    if(oldRow)sh.getRange(oldRow,1,1,row[0].length).setValues(row);else sh.getRange(sh.getLastRow()+1,1,1,row[0].length).setValues(row);
    rebuildSummary(ss);rebuildFunds(ss);SpreadsheetApp.flush();
    return response({ok:true,id:id,updated:Boolean(oldRow),fund:fund,incomeType:incomeType,receiptUrl:receiptUrl,receiptFileId:receiptFileId});
  }finally{lock.releaseLock();}
}

function deleteTransaction(p){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName(SHEET_TX);if(!sh)return response({ok:true,deleted:false});
  const id=String(p.id||''),row=findRowById(sh,id);if(!row)return response({ok:true,deleted:false});
  const fileId=String(sh.getRange(row,13).getValue()||'');if(fileId){try{DriveApp.getFileById(fileId).setTrashed(true);}catch(e){}}
  sh.deleteRow(row);rebuildSummary(ss);rebuildFunds(ss);SpreadsheetApp.flush();return response({ok:true,deleted:true,id:id});
}
function findRowById(sh,id){if(!id||sh.getLastRow()<2)return 0;const values=sh.getRange(2,2,sh.getLastRow()-1,1).getValues();for(let i=0;i<values.length;i++)if(String(values[i][0])===id)return i+2;return 0;}
function saveReceipt(dataUrl,date,id,folder){const m=String(dataUrl).match(/^data:(image\/[^;]+);base64,(.+)$/);if(!m)throw new Error('Format foto struk tidak valid');const mime=m[1],bytes=Utilities.base64Decode(m[2]);let ext=(mime.split('/')[1]||'jpg').toLowerCase();if(ext==='jpeg')ext='jpg';const name='STRUK_'+date.replace(/[^0-9-]/g,'')+'_'+id.replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+ext;const file=folder.createFile(Utilities.newBlob(bytes,mime,name));return{url:file.getUrl(),fileId:file.getId(),name:file.getName()};}

function getTransactionsFromSheet(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName(SHEET_TX);if(!sh||sh.getLastRow()<2)return{ok:true,data:[],count:0,source:'Google Sheet'};
  migrateTransactionHeaders(sh);const lastCol=Math.max(sh.getLastColumn(),HEADERS.length),rows=sh.getRange(2,1,sh.getLastRow()-1,lastCol).getValues(),tz=Session.getScriptTimeZone()||'Asia/Makassar';
  const fmt=v=>{if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,tz,'yyyy-MM-dd');const s=String(v||'').trim();if(!s)return'';let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');}const d=new Date(s);return isNaN(d.getTime())?'':Utilities.formatDate(d,tz,'yyyy-MM-dd')};
  const data=rows.map(r=>({id:String(r[1]||''),date:fmt(r[2]),type:String(r[3]||'expense').toLowerCase()==='income'?'income':'expense',merchant:String(r[4]||''),description:String(r[5]||''),desc:String(r[5]||''),category:String(r[6]||'Lainnya'),amount:Number(r[7])||0,paymentMethod:String(r[8]||''),ocrConfidence:String(r[9]||''),ocrText:String(r[10]||''),receiptUrl:String(r[11]||''),receiptFileId:String(r[12]||''),source:String(r[13]||APP_NAME),fund:DEFAULT_FUNDS.includes(String(r[14]||''))?String(r[14]):(String(r[14]||'')||DEFAULT_FUND),fundSource:DEFAULT_FUNDS.includes(String(r[14]||''))?String(r[14]):(String(r[14]||'')||DEFAULT_FUND),incomeType:String(r[15]||''),synced:true})).filter(x=>x.id&&x.date);
  return{ok:true,data:data,count:data.length,source:'Google Sheet',spreadsheetId:SPREADSHEET_ID};
}

function getFunds(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateFundsSheet(ss);seedDefaultFunds(sh);rebuildFunds(ss);
  const rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,FUND_HEADERS.length).getValues();
  const data=rows.filter(r=>String(r[1]||'').trim()).map(r=>({id:String(r[0]),name:String(r[1]),opening:Number(r[2])||0,income:Number(r[3])||0,expense:Number(r[4])||0,balance:Number(r[5])||0,active:r[6]!==false}));
  return{ok:true,data:data,count:data.length,source:'Google Sheet'};
}
function addFund(p){const name=String(p.name||'').trim();if(!name)return{ok:false,error:'Nama pos kosong'};const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateFundsSheet(ss),rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,2).getValues();if(rows.some(r=>String(r[1]).trim().toLowerCase()===name.toLowerCase()))return{ok:false,error:'Pos sudah ada'};const opening=Number(p.opening)||0,id=newFundId();sh.appendRow([id,name,opening,0,0,opening,true,new Date()]);rebuildFunds(ss);SpreadsheetApp.flush();return{ok:true,id:id,name:name,opening:opening};}
function updateFund(p){const id=String(p.id||''),name=String(p.name||'').trim();if(!id||!name)return{ok:false,error:'ID/nama pos tidak lengkap'};const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateFundsSheet(ss),row=findFundRow(sh,id);if(!row)return{ok:false,error:'Pos tidak ditemukan'};sh.getRange(row,2).setValue(name);sh.getRange(row,7).setValue(p.active!==false);rebuildFunds(ss);SpreadsheetApp.flush();return{ok:true,id:id,name:name};}
function deleteFund(p){const id=String(p.id||'');if(!id)return{ok:false,error:'ID pos kosong'};const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateFundsSheet(ss),row=findFundRow(sh,id);if(!row)return{ok:false,error:'Pos tidak ditemukan'};const name=String(sh.getRange(row,2).getValue()||'');if(DEFAULT_FUNDS.includes(name))return{ok:false,error:'Pos standar tidak boleh dihapus'};sh.getRange(row,7).setValue(false);rebuildFunds(ss);SpreadsheetApp.flush();return{ok:true,id:id,active:false};}
function findFundRow(sh,id){if(sh.getLastRow()<2)return 0;const rows=sh.getRange(2,1,sh.getLastRow()-1,1).getValues();for(let i=0;i<rows.length;i++)if(String(rows[i][0])===id)return i+2;return 0;}
function rebuildFunds(ss){const tx=ss.getSheetByName(SHEET_TX),fs=getOrCreateFundsSheet(ss);seedDefaultFunds(fs);const n=fs.getLastRow()-1;if(n<1)return;const fdata=fs.getRange(2,1,n,FUND_HEADERS.length).getValues(),totals={};if(tx&&tx.getLastRow()>1){const lastCol=Math.max(tx.getLastColumn(),HEADERS.length),rows=tx.getRange(2,1,tx.getLastRow()-1,lastCol).getValues();rows.forEach(r=>{const fund=String(r[14]||DEFAULT_FUND)||DEFAULT_FUND,type=String(r[3]||'expense').toLowerCase(),amount=Number(r[7])||0;if(!totals[fund])totals[fund]={income:0,expense:0};if(type==='income')totals[fund].income+=amount;else totals[fund].expense+=amount;});}const out=fdata.map(r=>{const name=String(r[1]),x=totals[name]||{income:0,expense:0},opening=Number(r[2])||0;return[r[0],name,opening,x.income,x.expense,opening+x.income-x.expense,r[6]!==false,r[7]||new Date()];});fs.getRange(2,1,out.length,FUND_HEADERS.length).setValues(out);}
function rebuildSummary(ss){const tx=ss.getSheetByName(SHEET_TX),summary=getOrCreateSummarySheet(ss);summary.clearContents();summary.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);if(!tx||tx.getLastRow()<2)return;const lastCol=Math.max(tx.getLastColumn(),HEADERS.length),rows=tx.getRange(2,1,tx.getLastRow()-1,lastCol).getValues(),map={};rows.forEach(r=>{const d=parseDateValue(r[2]);if(!d)return;const month=Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Makassar','yyyy-MM');if(!map[month])map[month]={income:0,expense:0,count:0};const amount=Number(r[7])||0;if(String(r[3]).toLowerCase()==='income')map[month].income+=amount;else map[month].expense+=amount;map[month].count++;});const months=Object.keys(map).sort().reverse();if(!months.length)return;const out=months.map(m=>{const x=map[m];return[m,x.income,x.expense,x.income-x.expense,x.count,x.income?x.expense/x.income:0];});summary.getRange(2,1,out.length,6).setValues(out);summary.getRange(2,2,out.length,3).setNumberFormat('#,##0');summary.getRange(2,6,out.length,1).setNumberFormat('0.00%');}
function parseDateValue(v){if(v instanceof Date&&!isNaN(v.getTime()))return v;const s=String(v||'').trim();if(!s)return null;let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return new Date(y,Number(m[2])-1,Number(m[1]));}const d=new Date(s);return isNaN(d.getTime())?null:d;}
function formatTransactionSheet(sh){sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setHorizontalAlignment('center');sh.setFrozenRows(1);const max=Math.max(1,sh.getMaxRows()-1);sh.getRange(2,8,max,1).setNumberFormat('#,##0');}
function formatSummarySheet(sh){sh.getRange(1,1,1,6).setFontWeight('bold').setHorizontalAlignment('center');sh.setFrozenRows(1);}
function formatFundsSheet(sh){sh.getRange(1,1,1,FUND_HEADERS.length).setFontWeight('bold').setHorizontalAlignment('center');sh.setFrozenRows(1);if(sh.getLastRow()>1)sh.getRange(2,3,sh.getLastRow()-1,4).setNumberFormat('#,##0');}
function today(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyy-MM-dd');}
function response(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function responseOrJsonp(obj,callback){if(callback){const safe=String(callback).replace(/[^a-zA-Z0-9_$.]/g,'');return ContentService.createTextOutput(safe+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);}return response(obj);}
