# MoniKas V2 — Pemantauan Pengeluaran

Aplikasi web responsif untuk mencatat dan memantau pengeluaran pribadi/rumah tangga.

## Fitur utama
- Dashboard pendapatan, pengeluaran, dan saldo
- Tambah, edit, hapus transaksi
- Kategori dan anggaran
- Filter bulan dan pencarian
- Ekspor CSV
- PWA / dapat dipasang ke layar utama Android
- **Foto struk dari kamera atau galeri**
- **AI Detector Struk:** OCR membaca isi struk lalu mendeteksi kandidat nama toko, tanggal, total pembayaran, dan kategori
- Foto struk disimpan lokal di browser menggunakan IndexedDB
- Tidak membutuhkan API key untuk fitur scan struk

## Cara memakai scan struk
1. Buka aplikasi di Android.
2. Tekan **Ambil Foto** atau **Pilih Foto** pada bagian Foto Struk.
3. Aplikasi menjalankan OCR dan Smart Extractor.
4. Hasil toko/tanggal/nominal/kategori diisikan ke formulir.
5. Periksa hasil OCR, koreksi bila perlu, lalu **Simpan Transaksi**.

> Catatan: Detector menggunakan OCR + Smart Extractor di browser. Hasil OCR dapat salah pada foto buram, miring, gelap, atau struk dengan tata letak yang tidak umum. Selalu verifikasi nominal sebelum menyimpan.

## GitHub Pages
Publish repository ini melalui **Settings → Pages → Deploy from a branch → main → /(root)**.

URL: https://ekoagengs-bot.github.io/pengeluaran/

## Privasi
Fitur scan struk tidak mengirim foto ke server MoniKas. OCR dijalankan di browser menggunakan library Tesseract.js dari CDN. Foto transaksi disimpan pada perangkat melalui IndexedDB.

File utama:
- `index.html` — aplikasi
- `manifest.json` — PWA
- `sw.js` — service worker
- `firebase-config.js` dan `firestore.rules` — file Firebase lama; versi Standalone saat ini tidak bergantung padanya.
