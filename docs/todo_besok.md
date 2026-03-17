# JOGLO POS - PENDING TASKS & ROADMAP (content.md)

_Last Updated: 17 March 2026, 02:37 AM WIB_

## 1. OrderBoard: Micro-Optimizations (Sisa PR)

- [x] **Implementasi `React.memo` pada `OrderCard.jsx`:** Bungkus komponen untuk mencegah re-render kartu yang statusnya tidak berubah, menghemat RAM secara drastis.
- [x] **Debounce Search Bar:** Terapkan `useDebounce` (300ms) pada input pencarian teks di `OrderBoard.jsx` agar filter tidak tereksekusi berkali-kali dalam hitungan milidetik saat admin mengetik.
- [x] **Penyesuaian Idle Timeout (`useAutoLock.js`):** Evaluasi durasi 5 menit. Eksekusi opsi: Ubah menjadi 15/30 menit, ATAU nonaktifkan timer khusus saat berada di rute `/orders` (OrderBoard).
- [ ] **Mobile Testing:** Lakukan _stress test_ navigasi dan _Infinite Scroll_ langsung di HP Samsung A55.

## 2. Kasir (Workspace): Fitur "Topping" Tambahan (Jasa Desain)

- [ ] **UI Shortcut Buttons:** Buat deretan tombol kecil (_Pills_) tepat di atas Subtotal (misal: `[+ Jasa Desain Ringan]`, `[+ Jasa Desain Berat]`, `[+ Ongkir]`).
- [ ] **Logic Makro (`addToCart`):** Tombol TIDAK BOLEH membuat state _ongkos_ terpisah. Tombol berfungsi sebagai _shortcut_ yang langsung memicu fungsi `addToCart(ID_Produk_Desain)` agar masuk ke keranjang sebagai _item_ normal.
- [ ] **Prompt Harga Custom:** Jika harga desain fleksibel/belum tetap, munculkan _pop-up input_ harga kecil (`"Masukkan tarif desain: Rp [ ____ ]"`) sebelum _item_ dimasukkan ke keranjang.
- [ ] **Keamanan Arsitektur:** Pastikan nota dan Supabase tidak perlu diubah. Jasa desain tetap dibaca sebagai _item_ produk standar oleh _database_.

## 3. Macro-Architecture (Skala Lanjutan)

- [ ] **Offline-First Modul Kasir:** Terapkan arsitektur IndexedDB + Sync Engine (Tukang Pos) di halaman Kasir utama agar toko bisa terus menerima pesanan pelanggan meski internet putus total.
- [ ] **Dashboard Caching:** Optimasi _query_ grafik bulanan agar memuat lebih cepat.
