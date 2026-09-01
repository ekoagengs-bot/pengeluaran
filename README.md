# MoniKas V2 — AI Detector Struk

Aplikasi web responsif untuk memantau pengeluaran dan pendapatan, memindai struk dengan OCR, lalu mengirim rekap transaksi ke Google Sheets serta foto struk ke Google Drive.

## Fitur
- Foto struk dari kamera Android / galeri
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

## Google Sheet tujuan
Spreadsheet ID:
`1uF7zUH5boy3VA7abBgWQETccIUp1_lrvYDyeDsrWBlo`

Backend otomatis membuat sheet:
- `TRANSAKSI`
- `REKAP BULANAN`

## Hubungkan Google Sheet
1. Buka `apps-script/Code.gs` di repository.
2. Salin isinya ke project Google Apps Script.
3. Pastikan project dapat mengakses spreadsheet dan Google Drive.
4. Deploy sebagai **Web app**.
5. Pilih **Execute as: Me**.
6. Pilih akses **Anyone**.
7. Salin URL berakhiran `/exec`.
8. Buka MoniKas → tombol **⚙ Rekap** → masukkan URL tersebut.

Setelah aktif, setiap transaksi baru akan direkap otomatis ke spreadsheet. Foto struk akan masuk ke folder Google Drive bernama `MoniKas Struk`.

## Publikasi GitHub Pages
`Settings → Pages → Deploy from a branch → main → / (root)`.

URL:
`https://ekoagengs-bot.github.io/pengeluaran/`

Catatan: GitHub Pages tidak dapat menulis langsung ke spreadsheet privat. Google Apps Script dipakai sebagai backend penulis data. Aplikasi tetap dapat digunakan secara lokal meskipun backend belum dikonfigurasi.
