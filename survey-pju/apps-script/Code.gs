/**
 * BACKEND SURVEY PJU BIMA - DOMPU - KOTA BIMA
 * Spreadsheet utama:
 * 1IhB-agDYb7WcVSnZioHRWYE9Hm2iQLsJdA72E9jlXWY
 *
 * Cara pasang:
 * 1. Buka spreadsheet target -> Extensions -> Apps Script
 * 2. Hapus kode lama jika memang khusus project PJU
 * 3. Tempel file ini ke Code.gs
 * 4. Jalankan setupPJU() sekali dan izinkan akses
 * 5. Deploy -> New deployment -> Web app
 *    Execute as: Me
 *    Who has access: Anyone
 *
 * AppSheet dapat tetap menulis langsung ke sheet PJU_Survey.
 * Dashboard web dapat membaca endpoint doGet().
 */

const CONFIG = {
  SPREADSHEET_ID: '1IhB-agDYb7WcVSnZioHRWYE9Hm2iQLsJdA72E9jlXWY',
  DATA_SHEET: 'PJU_Survey',
  USERS_SHEET: 'Users',
  ULP_SHEET: 'ULP',
  WILAYAH_SHEET: 'Wilayah',
  REF_SHEET: 'Referensi',
  DASHBOARD_SHEET: 'Dashboard'
};

const HEADERS = [
  'ID Survey','Timestamp','Email Petugas','Nama Petugas','ULP','Wilayah',
  'Kabupaten/Kota','Kecamatan','Desa/Kelurahan','Alamat','Latitude','Longitude',
  'Nomor Tiang','Jenis Tiang','Kondisi Tiang','Jenis Lampu','Daya (W)',
  'Lampu Menyala','Kondisi Lampu','Kondisi Panel/Meter','Kondisi Jaringan',
  'Perlu Tindakan','Prioritas','Foto PJU','Foto Meter','Foto Lokasi','Catatan',
  'Status Tindak Lanjut','Tanggal Tindak Lanjut','Catatan Tindak Lanjut'
];

function getSS_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function setupPJU() {
  const ss = getSS_();

  ensureSheet_(ss, CONFIG.DATA_SHEET, HEADERS);
  ensureSheet_(ss, CONFIG.USERS_SHEET, ['Email','Nama','ULP','Role','Aktif']);
  ensureSheet_(ss, CONFIG.ULP_SHEET, ['ULP','Wilayah Kerja','Keterangan']);
  ensureSheet_(ss, CONFIG.WILAYAH_SHEET, ['Kabupaten/Kota','Kecamatan','Desa/Kelurahan']);
  ensureSheet_(ss, CONFIG.REF_SHEET, ['Kategori','Nilai','Aktif']);
  ensureSheet_(ss, CONFIG.DASHBOARD_SHEET, ['KPI','Nilai']);

  seedReferences_(ss);
  formatDataSheet_(ss.getSheetByName(CONFIG.DATA_SHEET));
  buildDashboardSheet_(ss);

  return 'Setup Survey PJU selesai.';
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else if (sh.getRange(1,1).getValue() === '') {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function seedReferences_(ss) {
  const ulp = ss.getSheetByName(CONFIG.ULP_SHEET);
  if (ulp.getLastRow() <= 1) {
    ulp.getRange(2,1,4,3).setValues([
      ['ULP Sape','Kabupaten Bima','ULP Sape'],
      ['ULP Dompu','Kabupaten Dompu','ULP Dompu'],
      ['ULP Woha','Kabupaten Bima','ULP Woha'],
      ['ULP Bikot','Kota Bima','ULP Bima Kota']
    ]);
  }

  const ref = ss.getSheetByName(CONFIG.REF_SHEET);
  if (ref.getLastRow() <= 1) {
    const rows = [
      ['Wilayah','Kabupaten Bima',true],
      ['Wilayah','Kabupaten Dompu',true],
      ['Wilayah','Kota Bima',true],
      ['Kondisi Tiang','Baik',true],
      ['Kondisi Tiang','Rusak Ringan',true],
      ['Kondisi Tiang','Rusak Berat',true],
      ['Jenis Lampu','LED',true],
      ['Jenis Lampu','HPL',true],
      ['Jenis Lampu','SON',true],
      ['Jenis Lampu','Lainnya',true],
      ['Lampu Menyala','Menyala',true],
      ['Lampu Menyala','Mati',true],
      ['Lampu Menyala','Redup',true],
      ['Kondisi Lampu','Baik',true],
      ['Kondisi Lampu','Rusak',true],
      ['Kondisi Panel/Meter','Baik',true],
      ['Kondisi Panel/Meter','Rusak',true],
      ['Kondisi Jaringan','Baik',true],
      ['Kondisi Jaringan','Rusak',true],
      ['Perlu Tindakan','Ya',true],
      ['Perlu Tindakan','Tidak',true],
      ['Prioritas','Rendah',true],
      ['Prioritas','Sedang',true],
      ['Prioritas','Tinggi',true],
      ['Prioritas','Darurat',true],
      ['Status Tindak Lanjut','Belum Ditindaklanjuti',true],
      ['Status Tindak Lanjut','Dalam Proses',true],
      ['Status Tindak Lanjut','Selesai',true]
    ];
    ref.getRange(2,1,rows.length,3).setValues(rows);
  }
}

function formatDataSheet_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold');
  sh.getRange(1,1,1,HEADERS.length).createFilter();
  if (sh.getMaxColumns() < HEADERS.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), HEADERS.length - sh.getMaxColumns());
  }
  const widths = [130,145,210,150,110,140,150,120,150,240,100,100,120,130,130,110,90,110,120,140,140,120,100,180,180,180,280,140,145,260];
  widths.forEach((w,i)=>sh.setColumnWidth(i+1,w));
}

function buildDashboardSheet_(ss) {
  const sh = ss.getSheetByName(CONFIG.DASHBOARD_SHEET);
  sh.clear();
  sh.getRange('A1').setValue('DASHBOARD SURVEY PJU BIMA - DOMPU - KOTA BIMA').setFontWeight('bold').setFontSize(16);
  sh.getRange('A3:B12').setValues([
    ['Total Survey','=COUNTA(PJU_Survey!A2:A)'],
    ['ULP Sape','=COUNTIF(PJU_Survey!E2:E,"ULP Sape")'],
    ['ULP Dompu','=COUNTIF(PJU_Survey!E2:E,"ULP Dompu")'],
    ['ULP Woha','=COUNTIF(PJU_Survey!E2:E,"ULP Woha")'],
    ['ULP Bikot','=COUNTIF(PJU_Survey!E2:E,"ULP Bikot")'],
    ['Perlu Tindakan','=COUNTIF(PJU_Survey!V2:V,"Ya")'],
    ['Prioritas Tinggi/Darurat','=COUNTIF(PJU_Survey!W2:W,"Tinggi")+COUNTIF(PJU_Survey!W2:W,"Darurat")'],
    ['Lampu Mati','=COUNTIF(PJU_Survey!R2:R,"Mati")'],
    ['Wilayah Kab. Bima','=COUNTIF(PJU_Survey!G2:G,"Kabupaten Bima")'],
    ['Wilayah Kab. Dompu','=COUNTIF(PJU_Survey!G2:G,"Kabupaten Dompu")']
  ]);
  sh.getRange('A3:A12').setFontWeight('bold');
  sh.autoResizeColumns(1,2);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'data';
  try {
    if (action === 'health') return json_({ok:true, service:'Survey PJU API', time:new Date().toISOString()});
    if (action === 'stats') return json_(getStats_());
    if (action === 'data') return json_({ok:true, rows:getData_()});
    if (action === 'config') return json_({ok:true, ulp:['ULP Sape','ULP Dompu','ULP Woha','ULP Bikot'], wilayah:['Kabupaten Bima','Kabupaten Dompu','Kota Bima']});
    return json_({ok:false,error:'Action tidak dikenal'});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action || 'append';
    if (action === 'append') {
      const result = appendSurvey_(body.data || body);
      return json_({ok:true,result});
    }
    return json_({ok:false,error:'Action POST tidak dikenal'});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function appendSurvey_(data) {
  const sh = getSS_().getSheetByName(CONFIG.DATA_SHEET);
  if (!sh) throw new Error('Sheet PJU_Survey belum ada. Jalankan setupPJU().');

  const id = data['ID Survey'] || ('PJU-' + Utilities.getUuid().slice(0,8).toUpperCase());
  const timestamp = data['Timestamp'] || new Date();
  const row = HEADERS.map(h => h === 'ID Survey' ? id : h === 'Timestamp' ? timestamp : (data[h] ?? ''));
  sh.appendRow(row);
  return {id, row: sh.getLastRow()};
}

function getData_() {
  const sh = getSS_().getSheetByName(CONFIG.DATA_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(1,1,sh.getLastRow(),Math.min(sh.getLastColumn(),HEADERS.length)).getDisplayValues();
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((h,i)=>obj[h]=row[i]);
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

function getStats_() {
  const rows = getData_();
  const byUlp = {'ULP Sape':0,'ULP Dompu':0,'ULP Woha':0,'ULP Bikot':0};
  const byWilayah = {'Kabupaten Bima':0,'Kabupaten Dompu':0,'Kota Bima':0};
  let perluTindakan=0, lampuMati=0, prioritasTinggi=0;
  rows.forEach(r=>{
    if (byUlp.hasOwnProperty(r['ULP'])) byUlp[r['ULP']]++;
    if (byWilayah.hasOwnProperty(r['Kabupaten/Kota'])) byWilayah[r['Kabupaten/Kota']]++;
    if (String(r['Perlu Tindakan']).toLowerCase()==='ya') perluTindakan++;
    if (String(r['Lampu Menyala']).toLowerCase()==='mati') lampuMati++;
    if (['tinggi','darurat'].includes(String(r['Prioritas']).toLowerCase())) prioritasTinggi++;
  });
  return {total:rows.length,byUlp,byWilayah,perluTindakan,lampuMati,prioritasTinggi};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Survey PJU')
    .addItem('Setup / Perbaiki Struktur','setupPJU')
    .addItem('Refresh Dashboard','buildDashboardSheet_')
    .addToUi();
}
