// MoniKas monitoring helper
// - migrates old local data (v2 -> v3)
// - optionally loads transactions from public Google Sheets CSV endpoint
// - refreshes dashboard/re-cap after remote data is merged
(function () {
  'use strict';

  const V3_KEY = 'monikas_v3_local';
  const V2_KEY = 'monikas_v2_local';
  const SHEET_ID = '1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo';
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
  const BUDGETS = {Makanan:1500000,Transportasi:800000,Belanja:1000000,Tagihan:1500000,Pendidikan:500000,Kesehatan:500000,Hiburan:400000,Lainnya:500000};

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function load(key) {
    return safeParse(localStorage.getItem(key) || 'null', null);
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeLocal(d) {
    if (!d || !Array.isArray(d.transactions)) return { transactions: [], budgets: {...BUDGETS} };
    return {
      transactions: d.transactions,
      budgets: {...BUDGETS, ...(d.budgets || {})}
    };
  }

  function migrateLegacy() {
    const v3 = normalizeLocal(load(V3_KEY));
    const v2 = normalizeLocal(load(V2_KEY));

    if (!v3.transactions.length && v2.transactions.length) {
      v3.transactions = v2.transactions.map(t => ({
        ...t,
        id: t.id || Date.now() + Math.random(),
        synced: Boolean(t.synced)
      }));
      save(V3_KEY, v3);
    }

    // Also normalize malformed/legacy records already in v3.
    v3.transactions = v3.transactions.map(t => ({
      ...t,
      date: normalizeDate(t.date),
      type: t.type === 'income' ? 'income' : 'expense',
      category: t.category || 'Lainnya',
      amount: Number(t.amount || 0)
    })).filter(t => t.date && t.amount >= 0);

    save(V3_KEY, v3);
    return v3;
  }

  function normalizeDate(value) {
    if (!value) return '';
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) {
      let y = Number(m[3]); if (y < 100) y += 2000;
      return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function csvParse(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i+1];
      if (ch === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { row.push(cell); cell=''; continue; }
      if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell); cell='';
        if (row.some(v => String(v).trim() !== '')) rows.push(row);
        row=[]; continue;
      }
      cell += ch;
    }
    row.push(cell);
    if (row.some(v => String(v).trim() !== '')) rows.push(row);
    return rows;
  }

  function normalizeNumber(value) {
    const s = String(value || '').replace(/[^0-9,.-]/g, '').trim();
    if (!s) return 0;
    if (s.includes('.') && s.includes(',')) {
      return Number(s.replace(/\./g,'').replace(/,/g,'.')) || 0;
    }
    const dotGroups = s.match(/\.\d{3}(?:$|[^0-9])/);
    if (dotGroups) return Number(s.replace(/\./g,'')) || 0;
    const commaGroups = s.match(/,\d{3}(?:$|[^0-9])/);
    if (commaGroups) return Number(s.replace(/,/g,'')) || 0;
    return Number(s.replace(/,/g,'.')) || Number(s) || 0;
  }

  function mergeCloudTransactions(records, state) {
    const byId = new Map(state.transactions.map(t => [String(t.id), t]));
    records.forEach(t => {
      const id = String(t.id || '');
      if (!id) return;
      const local = byId.get(id) || {};
      byId.set(id, {
        ...local,
        ...t,
        id,
        synced: true
      });
    });
    state.transactions = Array.from(byId.values());
    save(V3_KEY, state);
  }

  async function loadCloudFromSheet() {
    // Works when the spreadsheet is accessible through Google's public gviz CSV endpoint.
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=TRANSAKSI&_=${Date.now()}`;
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error('Google Sheet tidak dapat dibaca');
    const text = await res.text();
    const rows = csvParse(text);
    if (rows.length < 2) return [];
    const header = rows[0].map(x => String(x).trim().toUpperCase());
    const idx = name => header.indexOf(name);
    const map = {
      id: idx('ID TRANSAKSI'), date: idx('TANGGAL'), type: idx('JENIS'), merchant: idx('TOKO/SUMBER'),
      desc: idx('KETERANGAN'), category: idx('KATEGORI'), amount: idx('NOMINAL'), paymentMethod: idx('METODE BAYAR'),
      ocrConfidence: idx('OCR CONFIDENCE'), ocrText: idx('OCR TEXT'), receiptUrl: idx('LINK STRUK')
    };
    return rows.slice(1).map(r => ({
      id: String(r[map.id] || ''), date: normalizeDate(r[map.date] || ''), type: String(r[map.type] || '').toLowerCase()==='income' ? 'income' : 'expense',
      merchant: r[map.merchant] || '', desc: r[map.desc] || '', category: r[map.category] || 'Lainnya', amount: normalizeNumber(r[map.amount] || ''),
      paymentMethod: r[map.paymentMethod] || '', ocrConfidence: r[map.ocrConfidence] || '', ocrText: r[map.ocrText] || '',
      receiptUrl: r[map.receiptUrl] || '', source: 'Google Sheet', synced: true
    })).filter(t => t.id && t.date);
  }

  async function refreshFromCloud() {
    const state = migrateLegacy();
    try {
      const cloud = await loadCloudFromSheet();
      if (cloud.length) mergeCloudTransactions(cloud, state);
      if (typeof window.render === 'function') window.render();
      showCloudStatus(cloud.length ? `Data monitoring diperbarui dari Google Sheet (${cloud.length} transaksi).` : 'Google Sheet terbaca, belum ada transaksi.');
      return cloud.length;
    } catch (error) {
      if (typeof window.render === 'function') window.render();
      showCloudStatus('Monitoring memakai data perangkat. Google Sheet belum bisa dibaca otomatis dari browser.');
      return 0;
    }
  }

  function showCloudStatus(message) {
    const id = 'cloudMonitorStatus';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:120;background:#0f172a;color:#fff;padding:10px 13px;border-radius:12px;font:700 12px system-ui;box-shadow:0 10px 25px rgba(0,0,0,.15);max-width:min(92vw,460px)';
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(window.__cloudStatusTimer);
    window.__cloudStatusTimer = setTimeout(() => el.remove(), 5000);
  }

  function start() {
    migrateLegacy();
    // Let the page finish its own initial render first.
    setTimeout(refreshFromCloud, 600);
    // Re-check periodically for monitoring.
    setInterval(refreshFromCloud, 300000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
