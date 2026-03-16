# 🔍 Audit Dekomposisi Arsitektur A3+ & Yasin

**Status: COMPLETED (Read-Only)**

Laporan ini membedah anatomi kategori `DIGITAL_A3_PRO` dan membuktikan posisi anomali produk Yasin berdasarkan fakta data di Supabase.

---

## 🏛️ Lapis 1: The Engine (Category Level)

| Category ID           | Name                | Logic Type | Analisis POS                                                      |
| :-------------------- | :------------------ | :--------- | :---------------------------------------------------------------- |
| **DIGITAL_A3_PRO**    | DIGITAL PRINT A3+   | **MANUAL** | Mengandalkan parameter manual atau delegasi ke engine per produk. |
| **STATIONERY_OFFICE** | Stationery & Office | **UNIT**   | Harga murni per-satuan (fixed).                                   |

---

## 📦 Lapis 2: Core Products (The Headers)

Fakta di tabel `products` membuktikan bahwa baris-baris ini bertindak sebagai **Shell/Header** (Kolom `variants` = `[]`):

1.  **master_stiker_a3**: `calc_engine: UNIT`
2.  **master_cetak_pod**: `calc_engine: MATRIX`
3.  **master_print_dokumen**: `calc_engine: BOOKLET`
4.  **master_kartu_nama**: `calc_engine: UNIT`
5.  **cetak_majalah_a4**: `calc_engine: BOOKLET`

---

## 🌿 Lapis 3: The Branches (Example: master_stiker_a3)

Koneksi antara Header (Produk) ke Varian menggunakan **Direct Link** (product_id).

### 1. Varian Bahan (`product_materials`)

- `MAT_STIKERA3_STIKERCHROMO` (6.000)
- `MAT_STIKERA3_STIKERVINYLW` (9.000)
- `MAT_STIKERA3_STIKERTRANSP` (9.000)
- `MAT_STIKERA3_STIKERHOLOGR` (25.000)

### 2. Opsi Finishing (`finishing_options`)

Metode: **Direct Link via product_id**.

- **Pola Potong (Cutting):** Kiss Cut (5.000), Die Cut (10.000), Tanpa Potong (0).
- **Laminasi (Per Lembar):** Glossy/Doff (3.000).

---

## ⚠️ Lapis 4: Anomali "Buku Yasin"

**BUKTI DATA:**

- **Product ID:** `master_buku_yasin`
- **Category ID:** `STATIONERY_OFFICE` (Confirmed ⚠️)
- **Calc Engine:** `UNIT`

**Analisis:**
Produk Yasin berada di kategori `UNIT` (Stationery). Hal ini menjelaskan mengapa ia tidak memiliki kompleksitas perhitungan lembaran atau potong seperti produk di `DIGITAL_A3_PRO` (MANUAL). Jika Anda ingin Yasin memiliki logika jilid/bahan yang dinamis seperti A3+, maka ia harus dipindahkan ke kategori berjenis `MANUAL` atau `SHEET`.

---

_Audit selesai. Tidak ada perubahan kode dilakukan._
