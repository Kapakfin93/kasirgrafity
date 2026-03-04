# Product Requirements Document (PRD) & Engineering Guide: Modul Pengeluaran (Expense)

**Dokumen ini adalah "Kitab Suci" rujukan wajib sebelum melakukan modifikasi pada fitur Pengeluaran di aplikasi Joglo POS.**

## 1. Ikhtisar (Overview)

Modul Pengeluaran (Expense) menaungi pencatatan, pelacakan, dan analitik aliran dana keluar. Modul ini melayani 2 fungsi utama yang terbelah jelas:

1. **Pengeluaran Operasional (Material, Transport, Utilitas, dll.)**
2. **Pengeluaran SDM / Gaji (Payroll, Kasbon, Absensi Konversi)**

Modul ini telah direfaktor dari arsitektur _Client-Side Monolith_ menjadi _Component-Based Architecture_ dengan beban analitik yang sepenuhnya diputar di sisi Server (Supabase RPC) guna mencegah _error_ pada mesin kasir lokal.

---

## 2. Arsitektur UI (Component Breakdown)

Layar `ExpensePage.jsx` bukan lagi _file_ raksasa. Ia hanya bertindak sebagai _Controller_ (pengatur _state_ pusat) yang mendistribusikan data ke komponen-komponen terisolasi di folder `src/components/expenses/`:

1. **`ExpensePage.jsx`**
   - Lokasi: `src/modules/expenses/ExpensePage.jsx`
   - Peran: Mengikat _state global_ (Zustand) dan menyediakan _layout kerangka_ dasar (Tab Switcher). JANGAN MENAMBAH LOGIKA RUMIT DI SINI.
2. **`ExpenseInputForm.jsx`**
   - Peran: Modal formulir utama untuk mencatat pengeluaran baru (baik operasional maupun kasbon/gaji).
3. **`OperationalTab.jsx`**
   - Peran: Menampilkan layar **Operasional**. Memiliki 2 sub-mode:
     - _Harian_: List nota pengeluaran hari ini/7 hari terakhir.
     - _Rekap Mingguan_: Matriks tabel yang ditarik dari fungsi Server (membagi pengeluaran per minggu/kategori).
4. **`HrMonitorTab.jsx`**
   - Peran: Matriks khusus yang melacak jam absensi dan kasbon karyawan yang ditumpuk per minggu. (Khusus Owner/Admin).
5. **`MatrixDetailModal.jsx`**
   - Peran: Modal _Drill-Down_. Saat _user_ mengeklik sel angka di tabel matriks (baik di Tab Operasional maupun HR), komponen ini akan muncul dengan melakukan _fetching_ (Lazy Load) isi detail nota di balik sel tersebut.

---

## 3. Manajemen State (Zustand)

Logika bisnis dan API _fetching_ diatur terpusat di `src/stores/useExpenseStore.js`.

**State Penting:**

- `expenses` & `operationalExpenses`: Daftar nota pengeluaran (berjalan di Client).
- `hrMatrixData`: Hasil olahan server untuk matriks kehadiran HR.
- `opMatrixData`: Hasil olahan server untuk matriks kategori operasional.
- `matrixDetailData`: Data detail saat user menembak/mengeklik sebuah sel di tabel matriks.

---

## 4. Server-Side Logic (Supabase RPC)

**PERINGATAN KERAS:** Jangan pernah memindahkan kembali logika penjumlahan matriks ini ke sisi _Client / Javascript lokal_! Selalu gunakan RPC.

Fungsi database (_Remote Procedure Call_) yang menopang modul ini:

1. `get_hr_matrix_summary(p_month, p_year)`
   - Tujuan: Membaca _table absences_ dan _expenses_, menghitung jam kerja mingguan dan total kasbon mingguan setiap karyawan.
2. `get_operational_matrix_summary(p_month, p_year)`
   - Tujuan: Membaca _table expenses_, membuang kategori gaji, lalu memecah sisanya ke dalam kategori cerdas (KONSUMSI, TRANSPORT, UTILITAS, ATK_BAHAN, LAIN_LAIN) per kelipatan 7 hari.
3. `get_matrix_detail_rows(p_category, p_month, p_year, p_week_bucket, p_employee_id)`
   - Tujuan: Menyajikan data rincian murni (jam masuk-pulang / detail harga nota pengeluaran) ketika sel matriks spesifik ditekan.

---

## 5. Prosedur Maintenance (Do's and Don'ts)

Bagi AI maupun Manusia yang akan memodifikasi area ini:

- ❌ **JANGAN** menambah logika komputasi rumit atau tabel panjang di `ExpensePage.jsx`. Tambahkan di komponen terpisah di `src/components/expenses/`.
- ❌ **JANGAN** mengedit format _Return Value_ JSON dari RPC Supabase tanpa mengecek sinkronisasi pemetaannya di dalam state `setSelectedDetail` (pada file komponen UI).
- ❌ **JANGAN** memanggil _API fetch_ langsung dari komponen UI. Gunakan _Action Functions_ yang ada di `useExpenseStore`.
- ✅ **SELALU** gunakan komponen formating mata uang terpusat `formatRupiah` dari `src/core/formatters.js`, bukan mengetik format `Intl.NumberFormat` secara manual di setiap komponen.
- ✅ Jika ada bug pada pemuatan (Loading State) atau modal tidak muncul, periksa ikatan `selectedDetail` state di `ExpensePage.jsx` sebelum mengurai tempat lain.

---

_Dokumen ini dibuat otomatis pada sesi restrukturisasi UI Expense Module._
