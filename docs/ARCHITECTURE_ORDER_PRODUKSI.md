# 📄 ARCHITECTURE: ORDER PRODUKSI & PAYMENT LOGIC

> [!IMPORTANT]
> **PROTOKOL WAJIB BACA (AI Agent Directive)**  
> Untuk Agen AI: **BACA SELURUH DOKUMEN INI** sebelum menyentuh atau memodifikasi file:
> - `OrderBoard.jsx`
> - `OrderCard.jsx`
> - `useOrderStore.js`
> - `ownerDecisionEngine.js`
> - `WANotificationModal.jsx`

---

## 1. KONSEP ARSITEKTUR UTAMA (The Core Rules)

### 🚀 Server-Side Filtering & Decoupled Counters
Sistem Order Board dirancang untuk menangani ribuan data secara efisien melalui dua jalur terpisah:
- **Data Lazy Loading:** `OrderBoard.jsx` menarik data kartu secara bertahap. Default status adalah `PENDING` dengan `limit(50)`. 
- **Decoupled Counters:** Angka pada tab filter (misal: "Siap (12)") ditarik melalui fungsi `fetchOrderCounts` secara independen menggunakan parameter `{ count: 'exact', head: true }`.
- **⚠️ Larangan Keras:** DILARANG mengubah *global state* `productionStatus` di Zustand menjadi `PENDING`. State global harus tetap `ALL` agar tidak merusak komponen lain. Injeksi filter hanya boleh dilakukan di level komponen saat memanggil API.

### ⛓️ Orthogonal Action Buttons
Logika Produksi dan Logika Pembayaran berjalan di atas rel yang **TERPISAH (Orthogonal)**:
- Tombol **Produksi** (SPK, Selesai, Serahkan) hanya mengurusi `production_status`.
- Tombol **Pembayaran** (Lunasi) hanya mengurusi `payment_status`.
- Aksi pelunasan (Settlement) **TIDAK BOLEH** mengubah status produksi secara otomatis. Keduanya harus dipicu oleh aksi user yang berbeda atau logika kondisional yang eksplisit di UI.

### 💬 WhatsApp Gateway Rules
Notifikasi WA diatur dengan aturan bisnis yang ketat:
- **Silent Update:** Pelunasan yang dilakukan di tengah proses produksi (status Pending/In Progress/Ready) dilakukan secara diam-diam tanpa memicu modal kirim pesan WA.
- **Final Settlement Alert:** Pelunasan untuk order yang sudah diterima pelanggan (Status `DELIVERED` - Hutang Tempo) **WAJIB** memicu `WANotificationModal` dengan template ucapan terima kasih pelunasan.

### 📦 Data Chunking (Anti-URI Too Long)
Setiap operasi yang melibatkan penarikan atau manipulasi banyak Order ID sekaligus (terutama di `ownerDecisionEngine.js`) **WAJIB** menggunakan metode chunking/batching.
- Batas maksimal ID dalam satu request adalah **50-70 ID**.
- Hal ini untuk mencegah error `HTTP 414 URI Too Long` pada REST API Supabase/PostgREST.

---

## 2. FORMAT LOG PERUBAHAN (MANDATORY EDIT PROTOCOL)

**Syarat Mutlak Owner:** Jika Anda (Developer/AI) melakukan modifikasi pada arsitektur di atas, Anda **WAJIB** menambahkan log ke tabel ini.

| Tanggal | Nama Dev/AI | Komponen Diubah | Alasan & Deskripsi Perubahan |
| :--- | :--- | :--- | :--- |
| 2026-03-13 | Antigravity AI | OrderBoard, OrderCard, ownerDecisionEngine | Initial Refactor: Server-side filtering, Orthogonal buttons, & URI Batching. |
| | | | |

---
*Dokumen ini bersifat permanen. Jangan dihapus tanpa koordinasi dengan Lead Developer/Owner.*
