# MoniKas V2 — Pemantauan Pengeluaran

Aplikasi web responsif untuk memantau pendapatan, pengeluaran, saldo, transaksi, dan anggaran kategori.

## V2
- Login / daftar akun dengan Firebase Authentication (email + password)
- Database cloud dengan Cloud Firestore
- Data transaksi terpisah berdasarkan akun pengguna
- Tambah, edit, hapus transaksi
- Anggaran per kategori
- Dashboard bulanan
- Pencarian transaksi
- Ekspor CSV
- PWA / responsif untuk Android dan desktop

## Struktur
- `index.html` — aplikasi utama
- `firebase-config.js` — konfigurasi Firebase Web App
- `firestore.rules` — aturan keamanan Firestore per pengguna
- `manifest.json` — PWA
- `sw.js` — service worker

## Setup Firebase
Firebase perlu dibuat dan Web App perlu didaftarkan. Salin konfigurasi Web App dari Firebase Console lalu isi `firebase-config.js`.

1. Buat project di Firebase Console.
2. Tambahkan Web App.
3. Aktifkan Authentication > Sign-in method > Email/Password.
4. Buat Cloud Firestore Database.
5. Atur Firestore Rules menggunakan isi `firestore.rules`.
6. Ganti nilai `GANTI_*` di `firebase-config.js` dengan config Web App Anda.
7. Publikasikan repository ini menggunakan GitHub Pages.

Firebase saat ini mendukung modul JavaScript melalui CDN gstatic dan dokumentasi resminya merekomendasikan modular API untuk aplikasi produksi.
