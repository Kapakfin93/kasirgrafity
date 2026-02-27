# JOGLO PRINTING — Payload Contract v1.0

> Dibangun dari data nyata Supabase `batipgbnlfakwmbtdmdt` — 27 Feb 2026

## Prinsip Arsitektur

- **POS adalah Publisher** (sumber kebenaran harga & produk)
- **Web adalah Consumer** (read-only, render dari tabel `web_*`)
- **Supabase adalah Schema Relasional** — 5 tabel inti: `products`, `product_materials`, `product_price_matrix`, `product_price_tiers`, `finishing_options`
- **Dexie adalah JSON Blob Store** — data relasional di-flatten menjadi nested object saat sync (`variants[]`, `finishing_groups[]`, `price_list{}`)
- Contract ini menjadi jembatan format keduanya

---

## Struktur Kategori (Sumber: `categories`)

| ID                  | Nama                  | logic_type | display_order |
| ------------------- | --------------------- | ---------- | :-----------: |
| `CAT_OUTDOOR`       | Cetak Outdoor (Area)  | **AREA**   |       1       |
| `CAT_ROLLS`         | Cetak Roll (Linear)   | **LINEAR** |       2       |
| `CAT_POSTER`        | Poster & Media Cetak  | **MATRIX** |       3       |
| `STATIONERY_OFFICE` | Stationery / Office   | **UNIT**   |       4       |
| `MERCH_APPAREL`     | Apparel & Merchandise | **UNIT**   |       5       |
| `DIGITAL_A3_PRO`    | Digital A3+ Pro       | Mixed\*    |       —       |
| `CUSTOM_SERVICES`   | Custom & Services     | Mixed\*    |       —       |

> \* `DIGITAL_A3_PRO` dan `CUSTOM_SERVICES` berisi produk dengan beragam `calc_engine` (TIERED, BOOKLET, MATRIX, UNIT).

---

## Contract per Logic Type

### 1. AREA — Spanduk / Banner Outdoor

**Contoh produk:** `PROD_SPANDUK_V2` — "SPANDUK / BANNER (Outdoor)"
**calc_engine:** `AREA`

**Input yang diperlukan:**

- `length` (meter) — Panjang
- `width` (meter) — Lebar
- `material_id` — Pilihan bahan
- `finishing[]` — Opsional

**Kalkulasi:**

```
total = length × width × material.price_per_unit + finishing_total
```

**Data material (dari `product_materials`):**

| material_id             | Nama                 | price_per_unit | width |
| ----------------------- | -------------------- | :------------: | :---: |
| `MAT_SPANDUK_FLEXI_280` | Flexi 280gr Standard |  Rp 20.000/m²  |   —   |
| `MAT_SPANDUK_FLEXI_440` | Flexi Korea 440gr    |  Rp 45.000/m²  |   —   |
| `MAT_SPANDUK_BACKLITE`  | Flexi Backlite       |  Rp 65.000/m²  |   —   |

**Data finishing (dari `finishing_options`):**

| group_key         | Label               | price | Tipe  |
| ----------------- | ------------------- | :---: | :---: |
| `fin_outdoor_std` | Mata Ayam (Cincin)  |   0   | radio |
| `fin_outdoor_std` | Slongsong (Kantong) |   0   | radio |
| `fin_outdoor_std` | Lipat Pres          |   0   | radio |
| `fin_outdoor_std` | Lebihan Bahan       |   0   | radio |

**Contoh Dexie blob (setelah sync):**

```json
{
  "id": "PROD_SPANDUK_V2",
  "name": "SPANDUK / BANNER (Outdoor)",
  "categoryId": "CAT_OUTDOOR",
  "calc_engine": "AREA",
  "variants": [
    {
      "id": "MAT_SPANDUK_FLEXI_280",
      "label": "Flexi 280gr Standard",
      "price": 20000,
      "specs": "Ekonomis / Tipis"
    },
    {
      "id": "MAT_SPANDUK_FLEXI_440",
      "label": "Flexi Korea 440gr",
      "price": 45000,
      "specs": "Premium / Tebal"
    },
    {
      "id": "MAT_SPANDUK_BACKLITE",
      "label": "Flexi Backlite",
      "price": 65000,
      "specs": "Khusus Neonbox"
    }
  ],
  "finishing_groups": [
    {
      "id": "fin_outdoor_std",
      "title": "Finishing",
      "type": "radio",
      "options": [
        { "label": "Mata Ayam (Cincin)", "price": 0 },
        { "label": "Slongsong (Kantong)", "price": 0 }
      ]
    }
  ]
}
```

---

### 2. LINEAR — Stiker Meteran / DTF / Kain

**Contoh produk:** `PROD_STIKER_METER_V2` — "STIKER METERAN (Indoor)", `PROD_DTF_V1` — "DTF METERAN (Siap Press)"
**calc_engine:** `LINEAR_METER`

**Input yang diperlukan:**

- `length` (meter) — Panjang
- `material_id` — Pilihan bahan (sudah ada fixed `width`)
- `finishing[]` — Opsional

**Kalkulasi:**

```
total = length × material.price_per_unit + finishing_total
```

> Width sudah fix per material (0.6m, 1.0m, 1.2m, 1.5m). User hanya input panjang.

**Data material (dari `product_materials`):**

| material_id | Nama              | price_per_unit | width |
| ----------- | ----------------- | :------------: | :---: |
| (uuid)      | PET Film 60cm     |  Rp 45.000/m   |  0.6  |
| (uuid)      | Vinyl White 100cm |  Rp 90.000/m   |  1.0  |
| (uuid)      | Vinyl White 120cm |  Rp 108.000/m  |  1.2  |
| (uuid)      | Transparan 100cm  |  Rp 90.000/m   |  1.0  |
| (uuid)      | One Way Vision    |  Rp 85.000/m   |  1.0  |
| (uuid)      | One Way 120       |  Rp 108.000/m  |  1.2  |
| (uuid)      | One Way 150       |  Rp 135.000/m  |  1.5  |
| (uuid)      | Vinyl White 150   |  Rp 135.000/m  |  1.5  |
| (uuid)      | Transparan 120    |  Rp 108.000/m  |  1.2  |
| (uuid)      | Transparan 150    |  Rp 135.000/m  |  1.5  |

**Finishing:** Laminasi Glossy (+15.000/m), Laminasi Doff (+15.000/m), Potong Manual (+15.000/job)

---

### 3. MATRIX — Poster UV

**Contoh produk:** `PROD_POSTER_UV` — "Poster UV"
**calc_engine:** `MATRIX`

**Input yang diperlukan:**

- `size_id` — Pilihan ukuran (A2/A1/A0)
- `material_id` — Pilihan bahan
- `qty` — Jumlah lembar
- `finishing[]` — Opsional

**Kalkulasi:**

```
unit_price = price_matrix[material_id][size_id]
total = qty × unit_price + finishing_total
```

**Sizes global (dari `product_sizes`):**

| size_id | label            |
| ------- | ---------------- |
| `A2`    | A2 (42 × 60 cm)  |
| `A1`    | A1 (60 × 84 cm)  |
| `A0`    | A0 (84 × 118 cm) |

**Price Matrix (dari `product_price_matrix`):**

| Material \ Size      |     A2 |      A1 |      A0 |
| -------------------- | -----: | ------: | ------: |
| Albatros (Matte)     | 35.000 |  65.000 | 120.000 |
| Canvas (Seni)        | 85.000 | 135.000 | 260.000 |
| Luster (Kulit Jeruk) | 40.000 |  60.000 | 130.000 |
| Photo Paper (Glossy) | 45.000 |  70.000 | 135.000 |

**Contoh Dexie blob (setelah sync):**

```json
{
  "id": "PROD_POSTER_UV",
  "variants": [
    {
      "id": "mat_uv_alb",
      "label": "Albatros (Matte)",
      "price_list": { "sz_a2": 35000, "sz_a1": 65000, "sz_a0": 120000 }
    },
    {
      "id": "mat_uv_pho",
      "label": "Photo Paper (Glossy)",
      "price_list": { "sz_a2": 45000, "sz_a1": 70000, "sz_a0": 135000 }
    }
  ]
}
```

---

### 4. TIERED — Produk dengan Harga Grosir

**Contoh produk:** `master_kartu_nama` — "KARTU NAMA (Per Box)"
**calc_engine:** `TIERED` | **base_price:** Rp 35.000

**Input yang diperlukan:**

- `qty` — Jumlah
- `variant_id` — Pilihan bahan (jika ada)
- `finishing[]` — Opsional

**Kalkulasi:**

```
effective_price = base_price - tier.value   (jika tier.type === "cut")
total = qty × effective_price + finishing_total
```

**Tiers (dari `product_price_tiers`):**

| min_qty | max_qty | value  | type | Harga efektif |
| :-----: | :-----: | :----: | :--: | :-----------: |
|    1    |    4    |   0    | cut  |   Rp 35.000   |
|    5    |    9    | 5.000  | cut  |   Rp 30.000   |
|   10    | 10.000  | 10.000 | cut  |   Rp 25.000   |

> **Penting:** `type: "cut"` berarti `value` adalah **potongan** dari `base_price`, bukan harga absolut.

---

### 5. UNIT — Merchandise / Stationery

**Contoh produk:**

| ID                  | Nama                        | base_price | calc_engine | Kategori        |
| ------------------- | --------------------------- | :--------: | :---------: | --------------- |
| `master_topi`       | TOPI CUSTOM (Sablon/Bordir) |   35.000   |    UNIT     | MERCH_APPAREL   |
| `PROD_MERCH_PIN`    | PIN & GANTUNGAN KUNCI       |   3.500    |    UNIT     | MERCH_APPAREL   |
| `PROD_MERCH_IDCARD` | CETAK ID CARD (PVC)         |   5.000    |    UNIT     | MERCH_APPAREL   |
| `PROD_MERCH_MUG`    | MUG KERAMIK CUSTOM          |   16.000   |  TIERED\*   | MERCH_APPAREL   |
| `master_ongkir`     | ONGKOS KIRIM / DELIVERY     |   10.000   |  TIERED\*   | CUSTOM_SERVICES |

**Kalkulasi:**

```
total = qty × base_price   (UNIT)
total = qty × (base_price - tier.value)   (TIERED — lihat #4)
```

> \* Beberapa produk di MERCH/CUSTOM punya `calc_engine: TIERED` meski kategori-nya `UNIT`.

---

### 6. BOOKLET — Print Dokumen / Majalah

**Contoh produk:**

| ID                     | Nama                              | calc_engine | base_price |
| ---------------------- | --------------------------------- | :---------: | :--------: |
| `master_print_dokumen` | PRINT DOKUMEN / SKRIPSI (A4 & F4) |   BOOKLET   |     1      |
| `cetak_majalah_a4`     | CETAK MAJALAH / MODUL (A4)        |   BOOKLET   |     1      |

**Input yang diperlukan:**

- `variant_id` — Kertas (HVS 70gr, HVS 80gr, dll)
- `print_mode_id` — Mode cetak (1 sisi BW, bolak-balik BW, bolak-balik color)
- `qty` — Jumlah halaman/lembar
- `finishing[]` — Jilid, Cover, dll

**Kalkulasi:**

```
total = qty × (variant.price + print_mode.price) + finishing_total
```

> `base_price: 1` adalah placeholder — harga sebenarnya berasal dari `variants` dan `print_modes` yang disimpan sebagai JSON blob di Dexie.

---

## Peta Tabel Supabase → Dexie

| Supabase (relasional)   | Dexie (blob)                       | Keterangan                    |
| ----------------------- | ---------------------------------- | ----------------------------- |
| `products`              | `products`                         | 1:1 mapping inti              |
| `product_materials`     | `products.variants[]`              | Dijahit saat sync             |
| `product_sizes`         | Global reference                   | Hanya `id` + `label`          |
| `product_price_matrix`  | `products.variants[].price_list{}` | Dijahit per material          |
| `product_price_tiers`   | `products.price_tiers[]`           | Dijahit saat sync             |
| `finishing_options`     | `products.finishing_groups[]`      | Grouped by `group_key`        |
| `product_categories`    | `categories`                       | Nama tabel berbeda!           |
| `product_finishings`    | Junction table                     | Link produk↔finishing         |
| `categories` (Supabase) | `categories` (Dexie)               | Sync via `product_categories` |

> **Anomali:** Supabase punya 2 tabel kategori: `categories` (display) dan `product_categories` (sync target). Kode sync di `syncCategoriesFromCloud()` membaca dari `product_categories`, bukan `categories`.

---

## Web Publish Fields

Field yang diperlukan untuk Landing Page (dari `web_product_catalog` + `web_category_config`):

| Field               | Sumber                | Fungsi                          |
| ------------------- | --------------------- | ------------------------------- |
| `product_id`        | `web_product_catalog` | Link ke produk inti             |
| `name`              | `web_product_catalog` | Display name di web             |
| `category_id`       | `web_category_config` | Grouping di web                 |
| `web_form_type`     | `web_category_config` | `CALCULATOR`, `UNIT`, `MATRIX`  |
| `required_inputs[]` | `web_category_config` | `[length, width, material]` dll |
| `optional_inputs[]` | `web_category_config` | `[finishing, qty, notes]`       |
| `finishing_mode`    | `web_category_config` | `OPTIONAL`, `NONE`              |
| `display_config{}`  | `web_category_config` | Unit label, preview toggle      |
| `price_per_unit`    | `product_materials`   | Harga dasar per material        |
| `is_featured`       | `web_product_catalog` | Highlight di homepage           |
| `is_active`         | `web_product_catalog` | Visibilitas di web              |

**Harga "Mulai dari" (price_from):**

- AREA/LINEAR: `MIN(product_materials.price_per_unit)` dimana `product_id = X`
- MATRIX: `MIN(product_price_matrix.price)` dimana `product_id = X`
- TIERED: `base_price - MAX(product_price_tiers.value)` dimana `type = 'cut'`
- UNIT: `base_price`
