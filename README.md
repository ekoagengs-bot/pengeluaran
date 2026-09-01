# MoniKas V2 — AI Detector Struk

Aplikasi web responsif untuk memantau pengeluaran dan pendapatan, memindai struk dengan OCR, lalu mengirim rekap transaksi ke Google Sheets serta foto struk ke Google Drive.

## Fitur
- Foto struk dari kamera Android / iPhone / iPad / galeri
- OCR Tesseract.js
- Deteksi nama toko, tanggal, nominal total, dan kategori
- Form transaksi terisi otomatis dan tetap bisa dikoreksi
- Dashboard pendapatan, pengeluaran, saldo, rasio
- Anggaran per kategori
- Pencarian transaksi
- Ekspor CSV
- Penyimpanan lokal perangkat
- Rekap transaksi ke Google Sheets
- Foto struk disimpan ke Google Drive
- PWA siap dipasang ke Home Screen Android dan iOS

## Versi iOS
Gunakan Safari pada iPhone/iPad:
1. Buka `https://ekoagengs-bot.github.io/pengeluaran/ios.html`
2. Tunggu aplikasi terbuka atau tekan **Buka MoniKas**.
3. Tekan tombol **Bagikan** di Safari.
4. Pilih **Tambahkan ke Layar Utama**.
5. Jalankan MoniKas dari ikon Home Screen.

Versi iOS menggunakan halaman launcher dengan metadata Apple, safe-area support, dan ikon aplikasi. Kamera pada Safari dapat digunakan untuk memotret struk.

## Google Sheet tujuan
Spreadsheet ID:
`1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo`

## Backend Google Apps Script
URL Web App:
`https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec`

Backend otomatis membuat sheet:
- `TRANSAKSI`
- `REKAP BULANAN`

Foto struk disimpan ke folder Google Drive bernama `MoniKas Struk`.

## Publikasi GitHub Pages
`Settings → Pages → Deploy from a branch → main → / (root)`.

URL utama:
`https://ekoagengs-bot.github.io/pengeluaran/`

Launcher iOS:
`https://ekoagengs-bot.github.io/pengeluaran/ios.html`

Catatan: GitHub Pages tidak dapat menulis langsung ke spreadsheet privat. Google Apps Script dipakai sebagai backend penulis data. Aplikasi tetap dapat digunakan secara lokal meskipun backend belum dikonfigurasi.
