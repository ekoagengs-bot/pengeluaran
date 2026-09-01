/** MoniKas V2 backend - Google Sheets + Drive */
const SPREADSHEET_ID='1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo';
const APP_NAME='MoniKas V2';
const DRIVE_FOLDER_NAME='MoniKas Struk';
const SHEET_TX='TRANSAKSI';
const SHEET_SUMMARY='REKAP BULANAN';

function doGet(){return json_({ok:true,app:APP_NAME,message:'MoniKas backend aktif'});}
function doPost(e){try{const p=JSON.parse(e?.postData?.contents||'{}');if(p.action==='ping')return json_({ok:true});if(p.action==='saveTransaction')return saveTransaction_(p);if(p.action==='deleteTransaction')return deleteTransaction_(p);return json_({ok:false,error:'Action tidak dikenal'});}catch(err){return json_({ok:false,error:String(err)})}}

function saveTransaction_(p){
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=getOrCreateTransactions_(ss),folder=getOrCreateFolder_();
 let receiptUrl='',receiptFileId='';
 const existing=findRowById_(sh,String(p.id||''));
 if(p.receipt?.dataUrl){
   const m=String(p.receipt.dataUrl).match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
   if(m){const bytes=Utilities.base64Decode(m[2]),mime=m[1],ext=(mime.split('/')[1]||'jpg').replace('jpeg','jpg');const name='STRUK_'+(p.date||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'))+'_'+(p.id||Date.now())+'.'+ext;const f=folder.createFile(Utilities.newBlob(bytes,mime,name));receiptUrl=f.getUrl();receiptFileId=f.getId();}
 }
 const row=[new Date(),p.id||'',p.date||'',p.type||'expense',p.merchant||'',p.description||'',p.category||'',Number(p.amount)||0,p.paymentMethod||'',p.ocrConfidence||'',p.ocrText||'',receiptUrl,receiptFileId,p.source||APP_NAME];
 if(existing){sh.getRange(existing,1,1,row.length).setValues([row]);}else{sh.appendRow(row);}
 rebuildSummary_(ss); return json_({ok:true,receiptUrl,receiptFileId,updated:Boolean(existing)});
}

function deleteTransaction_(p){const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName(SHEET_TX);if(!sh)return json_({ok:true});const row=findRowById_(sh,String(p.id||''));if(row){sh.deleteRow(row);rebuildSummary_(ss);}return json_({ok:true,deleted:Boolean(row)});}
function findRowById_(sh,id){if(!id||sh.getLastRow()<2)return 0;const ids=sh.getRange(2,2,sh.getLastRow()-1,1).getValues().flat().map(String);const i=ids.indexOf(id);return i<0?0:i+2;}
function getOrCreateTransactions_(ss){let sh=ss.getSheetByName(SHEET_TX);if(!sh)sh=ss.insertSheet(SHEET_TX);if(sh.getLastRow()===0){sh.appendRow(['TIMESTAMP','ID TRANSAKSI','TANGGAL','JENIS','TOKO/SUMBER','KETERANGAN','KATEGORI','NOMINAL','METODE BAYAR','OCR CONFIDENCE','OCR TEXT','LINK STRUK','FILE ID','SUMBER']);sh.setFrozenRows(1);sh.getRange('A1:N1').setFontWeight('bold');}return sh;}
function rebuildSummary_(ss){let sum=ss.getSheetByName(SHEET_SUMMARY);if(!sum)sum=ss.insertSheet(SHEET_SUMMARY);sum.clearContents();sum.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);sum.setFrozenRows(1);sum.getRange('A1:F1').setFontWeight('bold');const tx=ss.getSheetByName(SHEET_TX);if(!tx||tx.getLastRow()<2)return;const rows=tx.getRange(2,1,tx.getLastRow()-1,14).getValues(),map={};rows.forEach(r=>{const date=r[2];if(!date)return;const d=date instanceof Date?date:new Date(date);if(isNaN(d))return;const month=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM');if(!map[month])map[month]={income:0,expense:0,count:0};const amount=Number(r[7])||0;if(String(r[3])==='income')map[month].income+=amount;else map[month].expense+=amount;map[month].count++;});const out=Object.keys(map).sort().reverse().map(m=>{const x=map[m];return[m,x.income,x.expense,x.income-x.expense,x.count,x.income?x.expense/x.income:0]});if(out.length)sum.getRange(2,1,out.length,6).setValues(out);if(out.length){sum.getRange(2,2,out.length,3).setNumberFormat('#,##0');sum.getRange(2,4,out.length,1).setNumberFormat('#,##0');sum.getRange(2,6,out.length,1).setNumberFormat('0.00%');}}
function getOrCreateFolder_(){const it=DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);return it.hasNext()?it.next():DriveApp.createFolder(DRIVE_FOLDER_NAME);}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
