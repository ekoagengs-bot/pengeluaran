# MoniKas — Pemantauan Pengeluaran

Aplikasi web responsif untuk mencatat dan memantau pengeluaran serta pendapatan.

## Fitur
- Dashboard pendapatan, pengeluaran, dan saldo
- Transaksi pengeluaran/pendapatan
- Kategori pengeluaran
- Anggaran per kategori
- Progress anggaran
- Filter bulan
- Ekspor data JSON
- PWA / bisa dipasang ke layar utama Android
- Penyimpanan lokal browser

## Publikasi GitHub Pages
1. Buka **Settings** repository.
2. Pilih **Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Branch: `main` dan folder: `/ (root)`.
5. Save.
6. Tunggu GitHub Pages aktif.

URL umumnya: `https://ekoagengs-bot.github.io/pengeluaran/`

## Catatan
Versi ini menggunakan `localStorage`, sehingga data tersimpan pada perangkat/browser yang digunakan. Tahap berikutnya dapat menambahkan login dan database online (Supabase/Firebase) agar data tersinkron antar perangkat.
