# OrderBoard Architecture Guidelines

## 1. In-Memory Filtering (0ms Performance)
**Rule**: NEVER use server-side pagination for filtering order status (Production or Payment).
- **Strategy**: Fat-Fetch (Relevance Limit). The store fetches all active/relevant orders into the laci RAM (`orders` state).
- **Benefit**: Instantaneous filtering and searching (0ms latency) without hitting the Supabase API on every toggle.
- **Limit**: Keep the fetch window reasonable (e.g., last 30 days or active production) to avoid memory overflow.

## 2. Modal Elevation (Single Source of Truth)
**Rule**: `OrderCard.jsx` must remain a **Dumb Component**.
- **Requirement**: No local state for modals or complex operational logic should live inside `OrderCard`.
- **Mechanism**: All operational actions (CCTV Audit, Print Nota, WA Notify, Cancel, Payment) must be triggered via the `onOpenModal` callback.
- **Centralization**: All modal components are rendered at the bottom of `OrderBoard.jsx`, controlled by the `activeModal` state.

## 3. Offline-First & Auto-Sync Resilience
**Rule**: Protect the system from "Phantom Retry Loops" during network instability.
- **Global Backoff**: If a TIMEOUT or Network Error occurs, the `OrderSyncService` must enter a global cooldown (10-15s) for ALL items in the queue to prevent server spam.
- **Ghost Sync Healing (Cross-Check)**: Use Supabase Realtime listeners to reconcile orders. If an event reveals that the server has already processed an order that is still in the local PENDING queue, the local item must be marked as SYNCED automatically.

## 4. UI Virtualization (Lazy Rendering)
**Rule**: Use lightweight lazy rendering for large datasets (300+ items).
- **Implementation**: Use `IntersectionObserver` to increment `visibleCount` as the user scrolls.
- **Order of Operations (CRITICAL)**:
    1. Apply ALL status filters.
    2. Apply Text Search (`localSearchQuery`).
    3. **LAST STEP**: Slice the array for rendering (`displayOrders.slice(0, visibleCount)`).
- **Reset Logic**: Any change in filters or search MUST reset `visibleCount` to 20 and force scroll the container to the top to avoid UI jumping.

## 5. State Management
- **Zustand (`useOrderStore`)**: The core engine for data fetching and sync status.
- **IndexedDB (`Dexie`)**: The persistent laci for offline-first capabilities.
- **Realtime**: Used NOT for the primary UI lift, but as a secondary "Healing" and "Reactive Counter" layer.

## 6. Future Roadmap & Pending PRs
Bagian ini berisi daftar optimasi lanjutan yang sudah disetujui secara arsitektural namun belum dieksekusi pada iterasi saat ini:

### A. Micro-Optimizations (Polesan UI/UX)
- **React.memo pada OrderCard**: Mengingat `OrderCard` kini murni Dumb Component, bungkus komponen ini dengan `React.memo()` agar browser tidak melakukan re-render pada kartu yang statusnya tidak berubah saat state global diperbarui. Ini akan menghemat RAM secara drastis.
- **Debounce Search Bar**: Terapkan `useDebounce` (sekitar 300ms) pada input pencarian teks. Ini untuk mencegah filter array tereksekusi berkali-kali dalam hitungan milidetik saat kasir sedang mengetik nama pelanggan.

### B. Macro-Architecture (Skala Modul Lain)
- **Offline-First Modul Kasir**: Menerapkan arsitektur Laci Lokal (IndexedDB) dan Tukang Pos (Sync Engine) yang sama dari Modul Pengeluaran/OrderBoard ke halaman Input Pesanan Baru (Halaman Kasir utama). Tujuannya agar toko tetap bisa menerima pesanan pelanggan meski internet mati total.
- **Dashboard Caching**: Optimasi query dan rendering pada halaman Laporan Keuangan agar tidak membebani server saat memuat grafik bulanan.
