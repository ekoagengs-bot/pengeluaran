# Apps Script Survey PJU

Backend untuk Spreadsheet Survey PJU:
`1IhB-agDYb7WcVSnZioHRWYE9Hm2iQLsJdA72E9jlXWY`

## Pasang ke Google Sheets
1. Buka Spreadsheet target.
2. **Extensions -> Apps Script**.
3. Buat / buka `Code.gs`.
4. Salin isi `Code.gs` dari folder ini.
5. Simpan.
6. Jalankan fungsi **setupPJU** satu kali.
7. Beri izin akses Google saat diminta.

Script membuat/menyiapkan sheet:
- `PJU_Survey`
- `Users`
- `ULP`
- `Wilayah`
- `Referensi`
- `Dashboard`

## Web API
Deploy Apps Script sebagai Web app:
- Execute as: **Me**
- Who has access: **Anyone**

Endpoint setelah deploy:
- `...?action=health`
- `...?action=config`
- `...?action=stats`
- `...?action=data`

Endpoint `data` dipakai dashboard GitHub Pages untuk membaca titik survey dan metadata.

## Struktur utama survey
ULP:
- ULP Sape
- ULP Dompu
- ULP Woha
- ULP Bikot

Wilayah:
- Kabupaten Bima
- Kabupaten Dompu
- Kota Bima

AppSheet dapat diarahkan langsung ke `PJU_Survey` sebagai tabel utama sehingga input HP masuk ke spreadsheet yang sama.
