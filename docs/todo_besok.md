# JOGLO POS - PENDING TASKS & ROADMAP (content.md)

_Last Updated: 17 March 2026, 02:37 AM WIB_

## 1. OrderBoard: Micro-Optimizations (Sisa PR)

- [x] **Implementasi `React.memo` pada `OrderCard.jsx`:** Bungkus komponen untuk mencegah re-render kartu yang statusnya tidak berubah, menghemat RAM secara drastis.
- [x] **Debounce Search Bar:** Terapkan `useDebounce` (300ms) pada input pencarian teks di `OrderBoard.jsx` agar filter tidak tereksekusi berkali-kali dalam hitungan milidetik saat admin mengetik.
- [x] **Penyesuaian Idle Timeout (`useAutoLock.js`):** Evaluasi durasi 5 menit. Eksekusi opsi: Ubah menjadi 15/30 menit, ATAU nonaktifkan timer khusus saat berada di rute `/orders` (OrderBoard).
- [ ] **Mobile Testing:** Lakukan _stress test_ navigasi dan _Infinite Scroll_ langsung di HP Samsung A55.

## 2. Kasir (Workspace): Fitur "Topping" Tambahan (Jasa Desain)

- [x] **UI Shortcut Buttons:** Buat deretan tombol kecil (_Pills_) tepat di atas Subtotal (`[+ DESAIN PREMIUM]`, `[+ DESAIN STANDAR]`, `[+ SETTING RINGAN]`).
- [x] **Logic Makro (`addToCart`):** Menggunakan `addItemToCart` dengan payload dinamis dari `useProductStore` (Single Source of Truth).
- [x] **Dynamic Pricing (Refactor):** Harga ditarik otomatis dari database varian produk, menjamin nol Technical Debt.
- [x] **Keamanan Arsitektur:** Jasa desain terbaca sebagai produk standar di Supabase. Guard `isInitialized` ditambahkan pada `Workspace.jsx` untuk keamanan *race condition* pesanan web.

## 3. Macro-Architecture (Skala Lanjutan)

- [ ] **Offline-First Modul Kasir:** Terapkan arsitektur IndexedDB + Sync Engine (Tukang Pos) di halaman Kasir utama agar toko bisa terus menerima pesanan pelanggan meski internet putus total.
- [ ] **Dashboard Caching:** Optimasi _query_ grafik bulanan agar memuat lebih cepat.
