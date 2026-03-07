# 🔍 Laporan Deep Architectural Audit (Joglo POS)

**Mode: READ-ONLY AUDIT**
**Status: COMPLETED**

Berdasarkan audit mendalam terhadap skema database Supabase, logika sinkronisasi `useProductStore`, dan file seeder aktif, berikut adalah pemetaan arsitektur sistem saat ini.

---

## 🏗️ Tingkat 1: Hierarki Master Produk & Kategori

### 1. Tabel Master Valid

- **Kategori Produk:** `public.product_categories` (8 baris aktif).
  - _Foreign Key:_ Produk merujuk ke tabel ini via `products.category_id`.
  - _Status:_ **ACTIVE**.
- **Produk Utama:** `public.products` (41 baris aktif).
  - _Status:_ **ACTIVE**.
- **Tabel Fosil (Mines):**
  - `public.z_archive_categories_old`: Hasil rename dari tabel `categories` lama. Status: ARCHIVED (Safe to keep as backup).

### 2. Mekanisme Relasi (Supabase vs POS)

Sistem menggunakan pola **Asymmetric Synchronization**:

- **Supabase (Source of Truth):** Data terpecah dalam tabel-tabel relasional murni.
- **Dexie (IndexedDB):** Data dikonsolidasi menjadi objek JSON bersarang (nested) di lokal.
- **Sync Logic:** `useProductStore.js` (fungsi `syncCloudProducts`) melakukan "stitching" atau penjahitan data dari 7 tabel berbeda menjadi 1 objek produk di Dexie agar UI POS tetap responsif (offline-first).

---

## 🛠️ Tingkat 2: Hierarki Varian (Material & Finishing)

### 1. Hierarki Material (Bahan)

- **Tabel Valid:** `public.product_materials` (155 baris).
- **Mapping:**
  - Setiap baris di `product_materials` memiliki `product_id`.
  - Di Frontend, data ini di-inject ke dalam array `product.variants`.
  - _Contoh:_ Spanduk (ID: `PROD_SPANDUK_V2`) mengambil varian "Flexi 280gr", "Flexi 340gr" dari tabel ini.

### 2. Hierarki Finishing (Opsi Tambahan)

- **Master Definisi:** `public.finishings` (Master list kategori finishing).
- **Opsi & Harga:** `public.finishing_options` (107 baris).
  - Di sini tersimpan `group_key` (misal: `fin_outdoor`) dan `group_title` (misal: `Finishing Mata Ayam`).
- **Junction Table:** `public.product_finishings` (0 baris - _Warning_).
  - **Temuan Audit:** Saat ini finishing lebih banyak di-link langsung via `product_id` di tabel `finishing_options` (Direct Link) daripada melalui Junction Table. Logic di `useProductStore` (line 174) mendukung kedua jalur (Direct & Junction).

---

## 💣 Tingkat 3: Evaluasi Seeder & "Ranjau" Arsitektural

### 1. Temuan "Ranjau" di `largeFormat.js` & `reconstructLargeFormat.js`

- **Ranjau Naming:** Terdapat View `v_products_legacy_poster`. Meskipun namanya memakai kata **"legacy"**, audit SQL menunjukkan view ini **SUDAH** menggunakan tabel modern (`product_price_matrix`, `product_materials`). Ini hanya masalah penamaan (mismatch label).
- **Ranjau ID Kategori:** Di `pilotSeeder.js` (line 18), masih ditemukan hardcode categoryId `LARGE_FORMAT`.
  - _Fakta:_ `LARGE_FORMAT` adalah ID kategori lama. Namun, `migrationSeeder.js` (line 306) memasukkannya dalam `SAFE_IDS` sebagai alias/fallback.
  - _Rekomendasi:_ Sebaiknya ID di seeder mulai diarahkan ke pillar baru: `CAT_OUTDOOR`, `CAT_ROLLS`, atau `CAT_POSTER`.

### 2. Status SQL Seeder (Global Scan)

- `supabase.from('product_materials')`: **OK** (Digunakan di `largeFormat.js` & `reconstructMerchandise.js`).
- `supabase.from('product_categories')`: **OK** (Digunakan di `largeFormat.js`).
- `supabase.from('categories')`: **BERSIH** (Tidak ditemukan pemanggilan ke tabel fosil ini di seluruh seeder).

---

## 📊 Kesimpulan Audit

Sistem saat ini sudah berada di jalur konvergensi yang benar (Gen 4.8). Kekhawatiran Anda terhadap `largeFormat.js` valid secara _naming_, namun secara _data logic_, sistem sudah menembak tabel yang benar.

**Titik Krusial untuk Ekspansi:**
Pastikan setiap kategori produk baru tetap mengikuti pola `logic_type` yang ada (AREA, LINEAR, MATRIX, TIERED, UNIT) di tabel `product_categories` karena `CalculatorEngine.js` sangat bergantung pada header tersebut.

---

_Laporan ini disusun oleh Antigravity AI - Status: Standby for next instruction._
