/**
 * MoniKas V2 - Google Sheets + Google Drive backend
 * Spreadsheet target: 1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo
 *
 * Deploy as Web App:
 * Execute as: Me
 * Who has access: Anyone
 */
const SPREADSHEET_ID = '1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo';
const APP_NAME = 'MoniKas V2';
const DRIVE_FOLDER_NAME = 'MoniKas Struk';
const SHEET_TX = 'TRANSAKSI';
const SHEET_SUMMARY = 'REKAP BULANAN';

function doGet() {
  return json_({ ok: true, app: APP_NAME, message: 'MoniKas backend aktif' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'ping') return json_({ ok: true });
    if (body.action === 'saveTransaction') return saveTransaction_(body);
    return json_({ ok: false, error: 'Action tidak dikenal' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function saveTransaction_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateTransactions_(ss);
  const folder = getOrCreateFolder_();
  let receiptUrl = '';
  let receiptFileId = '';

  if (p.receipt && p.receipt.dataUrl) {
    const m = String(p.receipt.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (m) {
      const bytes = Utilities.base64Decode(m[2]);
      const ext = (m[1].split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const name = 'STRUK_' + (p.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')) + '_' + (p.id || Date.now()) + '.' + ext;
      const file = folder.createFile(Utilities.newBlob(bytes, m[1], name));
      receiptUrl = file.getUrl();
      receiptFileId = file.getId();
    }
  }

  const row = [
    new Date(),
    p.id || '',
    p.date || '',
    p.type || 'expense',
    p.merchant || '',
    p.description || '',
    p.category || '',
    Number(p.amount) || 0,
    p.paymentMethod || '',
    p.ocrConfidence || '',
    p.ocrText || '',
    receiptUrl,
    receiptFileId,
    p.source || 'MoniKas V2'
  ];
  sh.appendRow(row);
  rebuildSummary_(ss);
  return json_({ ok: true, receiptUrl: receiptUrl, receiptFileId: receiptFileId });
}

function getOrCreateTransactions_(ss) {
  let sh = ss.getSheetByName(SHEET_TX);
  if (!sh) sh = ss.insertSheet(SHEET_TX);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['TIMESTAMP','ID TRANSAKSI','TANGGAL','JENIS','TOKO/SUMBER','KETERANGAN','KATEGORI','NOMINAL','METODE BAYAR','OCR CONFIDENCE','OCR TEXT','LINK STRUK','FILE ID','SUMBER']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rebuildSummary_(ss) {
  const tx = ss.getSheetByName(SHEET_TX);
  let sum = ss.getSheetByName(SHEET_SUMMARY);
  if (!sum) sum = ss.insertSheet(SHEET_SUMMARY);
  sum.clearContents();
  sum.getRange(1,1,1,6).setValues([['BULAN','PENDAPATAN','PENGELUARAN','SALDO','JUMLAH TRANSAKSI','% PENGELUARAN/PENDAPATAN']]);
  sum.setFrozenRows(1);

  const last = tx.getLastRow();
  if (last < 2) return;
  const values = tx.getRange(2,1,last-1,14).getValues();
  const map = {};
  values.forEach(r => {
    const date = r[2];
    if (!date) return;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return;
    const month = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!map[month]) map[month] = { income:0, expense:0, count:0 };
    const type = String(r[3] || 'expense');
    const amount = Number(r[7]) || 0;
    if (type === 'income') map[month].income += amount; else map[month].expense += amount;
    map[month].count++;
  });

  const rows = Object.keys(map).sort().reverse().map(month => {
    const x = map[month];
    return [month, x.income, x.expense, x.income - x.expense, x.count, x.income ? x.expense / x.income : 0];
  });
  if (rows.length) sum.getRange(2,1,rows.length,6).setValues(rows);
  sum.getRange('B:C:D').setNumberFormat('#,##0');
  sum.getRange('F:F').setNumberFormat('0.00%');
}

function getOrCreateFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
