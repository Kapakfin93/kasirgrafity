# 📘 Blueprint: Laporan Produksi (Joglo POS Engine)

Blueprint ini mendefinisikan standar arsitektur untuk fitur laporan konsumsi bahan/item harian dengan dukungan _drill-down_ dan logika data hibrida (Legacy vs New Standard).

---

## 1. Backend Layer (Supabase RPC)

### A. Pola Kalkulasi Hybrid (COALESCE)

Gunakan fungsi RPC Postgres dengan `COALESCE` untuk menangani perubahan skema JSON tanpa memutus kompatibilitas data lama.

**Target Path:**

1.  **New Standard (March 2026+):** `dimensions -> 'inputs' ->> 'length'`
2.  **Legacy Fallback:** `metadata -> 'specs_json' ->> 'length'`

**Snippet Logic SQL:**

```sql
COALESCE(
  (dimensions->'inputs'->>'length')::numeric,
  (metadata->'specs_json'->>'length')::numeric,
  0
)
```

### B. Dynamic Filtering

Jangan melakukan _hardcode_ pada `product_id`. Gunakan `JOIN` ke tabel `products` atau filter berdasarkan `category_id` untuk skalabilitas.

---

## 2. Frontend Layer (React & Zustand)

### A. Lazy Loading Drill-Down

Untuk efisiensi memori, data detail (drill-down) tidak boleh dimuat bersamaan dengan laporan utama.

- Gunakan RPC terpisah: `get_production_details(date, filter_key)`.
- Panggil data _hanya_ saat baris tabel di-klik (`onClick`).
- Tampilkan _state loading_ transparan di dalam Modal.

### B. Komponen UI (Glassmorphism)

Ikuti design system Joglo:

- **Container:** Background `bg-slate-900/50` dengan `backdrop-blur-md`.
- **Contrast:** Gunakan warna cerah untuk angka total (misal: `text-cyan-400`).
- **Interactive:** Tambahkan hover effect `hover:bg-white/5` pada baris tabel yang bisa di-klik.

---

## 3. Security Layer (Role-Based Access)

### A. RoleProtectedRoute

Gunakan komponen guard yang memeriksa `currentUser.role` secara ketat.

- **Owner Only:** Halaman laporan produksi sensitif wajib dibungkus `RoleProtectedRoute` dengan `requiredRole="owner"`.
- **Redirect:** Otomatis arahkan Kasir/Admin kembali ke `/pos` jika mencoba mengakses URL secara manual.

---

## 4. Standar Output Data

- **Unit Konsistensi:** Semua input 'cm' di Frontend wajib disimpan sebagai 'meter' di kalkulasi RPC untuk laporan.
- **Visual Formatting:** Gunakan format `3.2m x 1.5m` untuk mempermudah pembacaan dimensi oleh manusia.
- **Round Consistency:** Pastikan angka pembulatan (ROUND) di laporan utama dan detail sama persis untuk menghindari selisih angka total.
