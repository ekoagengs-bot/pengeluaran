# MoniKas — Pemantauan Pengeluaran

Aplikasi web/PWA untuk memantau pengeluaran dan pendapatan, memindai struk dengan OCR, menyimpan foto struk ke Google Drive, dan merekap transaksi ke Google Sheets.

## Fitur
- Langsung masuk ke dashboard, **tanpa login**
- Foto struk dari kamera Android/iPhone/iPad atau galeri
- OCR Tesseract.js
- Deteksi toko, tanggal, total, dan kategori secara otomatis
- Form transaksi terisi otomatis dan tetap dapat dikoreksi
- Pendapatan, pengeluaran, saldo, dan anggaran kategori
- Pencarian, edit, hapus, dan ekspor CSV
- Penyimpanan lokal perangkat sebagai cadangan
- Sinkronisasi transaksi ke Google Sheets
- Foto struk ke Google Drive
- PWA untuk Android dan iOS

## Google Sheet
Spreadsheet tujuan:
`1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo`

## Google Apps Script
Web App aktif:
`https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec`

Script otomatis membuat:
- `TRANSAKSI`
- `REKAP BULANAN`
- folder Drive `MoniKas Struk`

## GitHub Pages
Aktifkan:
`Settings → Pages → Deploy from a branch → main → / (root)`

URL:
`https://ekoagengs-bot.github.io/pengeluaran/`

## iOS
Buka URL utama melalui Safari lalu pilih:
`Bagikan → Tambahkan ke Layar Utama`.

## Catatan
Data transaksi terlebih dahulu disimpan di perangkat. Saat koneksi tersedia aplikasi mengirim data ke Google Apps Script. Tombol **Sinkronisasi** dapat digunakan untuk mengirim ulang transaksi yang ada di perangkat.
