# 🧪 TESTING CHECKLIST - JOGLO POS V2.4

## ✅ SETUP COMPLETE

**Routing:**
- ✅ React Router installed
- ✅ App.jsx with routing
- ✅ MainLayout with navigation
- ✅ Role-based default routes

---

## 📋 TESTING FLOW

### **STEP 1: Basic Navigation Test**

#### **1.1. Login Flow**
```
Test Case: Owner Login
1. Buka aplikasi → Harus tampil EmployeeLogin
2. Klik card "Owner"
3. Masukkan PIN: 1234 (default)
4. Harus redirect ke /dashboard
5. Navigation sidebar harus tampil

Expected:
✓ Login berhasil
✓ Redirect ke dashboard
✓ Sidebar kiri tampil dengan menu:
  - 📊 Dashboard
  - 💰 Kasir
  - 📋 Order
  - 👥 Karyawan
  - ⏰ Absensi
✓ User info tampil (nama + role)
```

#### **1.2. Create First Employee**
```
Test Case: Add Cashier
1. Dari dashboard, klik menu "👥 Karyawan"
2. Klik "➕ Tambah Karyawan"
3. Isi form:
   - Nama: Test Kasir
   - Role: Kasir
   - Shift: Pagi
   - PIN: 9999
   - Konfirmasi PIN: 9999
4. Klik "✅ Tambah"

Expected:
✓ Modal tutup
✓ Karyawan muncul di table
✓ Status: 🟢 Aktif
✓ Row bisa di-edit/delete
```

```
Test Case: Add Production Staff
1. Klik "➕ Tambah Karyawan" lagi
2. Isi form:
   - Nama: Test Produksi
   - Role: Produksi
   - Shift: Malam
   - PIN: 8888
   - Konfirmasi PIN: 8888
3. Klik "✅ Tambah"

Expected:
✓ 2 karyawan sekarang di list
```

---

### **STEP 2: POS Transaction Flow**

#### **2.1. Create Transaction (Owner as Cashier)**
```
Test Case: Banner Order
1. Klik menu "💰 Kasir"
2. Pilih kategori "Banner / Spanduk"
3. Klik "Pilih Produk" → Pilih "Flexi 280gr Standard"
4. Isi ukuran:
   - Panjang: 2
   - Lebar: 3
   - Quantity: 1
5. Pilih finishing: Mata Ayam
6. Klik "TAMBAH KE NOTA"

Expected:
✓ Item muncul di receipt section (kanan)
✓ Harga: Rp 108.000 (2×3×18.000)
✓ Detail lengkap tampil
```

#### **2.2. Add More Items**
```
Test Case: Matrix Product
1. Pilih kategori "Poster (UV & Indoor)"
2. Pilih "UV - Albatros"
3. Pilih ukuran "A2"
4. Quantity: 5
5. Pilih finishing: Laminasi Doff/Glossy
6. Klik "TAMBAH KE NOTA"

Expected:
✓ 2 items sekarang di receipt
✓ Total: Rp 108.000 + Rp 240.000 = Rp 348.000
```

#### **2.3. Process Payment (Tunai)**
```
Test Case: Cash Payment
1. Di receipt section, pilih "TUNAI"
2. Input dibayar: 500000
3. Klik "PROSES PEMBAYARAN"

Expected:
✓ Transaction locked
✓ Kembalian calculate: Rp 152.000
✓ Tombol "CETAK NOTA" enabled
✓ Tombol "TRANSAKSI BARU" enabled
```

#### **2.4. Print Preview**
```
Test Case: Nota Preview
1. Klik "CETAK NOTA"

Expected:
✓ Modal preview muncul
✓ Tampil detail lengkap:
  - Header: JOGLO PRINTING
  - Items dengan detail
  - Total, Dibayar, Kembalian
  - Status: LUNAS - TUNAI
✓ Tombol "🖨️ PRINT NOTA"
✓ Tombol "TUTUP"
```

---

### **STEP 3: Order Tracking**

#### **3.1. Check Order Created**
```
Test Case: View in OrderBoard
1. Klik menu "📋 Order"

Expected:
✓ Order dari transaksi tadi muncul
✓ OrderCard tampil dengan:
  - ID + Transaction ID
  - 2 items (Banner + Poster)
  - Total: Rp 348.000
  - Status: PAID
  - Production status: PENDING
✓ Tombol "🔨 Mulai Kerjakan" ada
```

#### **3.2. Update Production Status**
```
Test Case: Start Production
1. Klik tombol "🔨 Mulai Kerjakan"
2. Konfirmasi

Expected:
✓ Status berubah: IN_PROGRESS
✓ assignedTo terisi dengan owner ID
✓ Tombol berubah jadi "✅ Tandai Selesai"
```

```
Test Case: Mark Ready
1. Klik "✅ Tandai Selesai"
2. Konfirmasi

Expected:
✓ Status: READY
✓ completedAt terisi
✓ Tombol: "📦 Serahkan ke Customer"
```

---

### **STEP 4: Attendance System**

#### **4.1. Check-in (Employee)**
```
Test Case: Employee Check-in
1. Logout dari owner
2. Di login, pilih "Test Kasir"
3. PIN: 9999
4. Setelah login, klik menu "⏰ Absensi"
5. Pilih nama "Test Kasir"
6. PIN: 9999
7. Klik "🟢 CHECK IN"

Expected:
✓ Alert: "Check-in berhasil!"
✓ Status card berubah: 🟢 Sedang Kerja
✓ Tombol berubah: "🔴 CHECK OUT"
```

#### **4.2. Check-out**
```
Test Case: Employee Check-out
1. (Sama, pilih Test Kasir)
2. PIN: 9999
3. Klik "🔴 CHECK OUT"

Expected:
✓ Alert: "Check-out berhasil! Total kerja: X jam X menit"
✓ Status: ✅ Sudah Selesai
✓ Tidak bisa absen lagi hari ini
```

---

### **STEP 5: Dashboard Analytics**

#### **5.1. View Dashboard**
```
Test Case: Owner Dashboard
1. Login sebagai Owner
2. Auto redirect ke /dashboard

Expected:
✓ Stats cards tampil:
  - Total Penjualan: Rp 348.000
  - Uang Terkumpul: Rp 348.000
  - Pending: 0 (karena sudah READY)
  - Siap Diambil: 1
✓ Secondary stats:
  - Rata-rata order: Rp 348.000
  - Lunas: 1
  - Karyawan Aktif: 2
  - Hadir Hari Ini: 1 (Test Kasir yang absen)
✓ Recent Orders: Tampil order tadi
✓ Today Attendance: Tampil Test Kasir (✅ Selesai)
```

#### **5.2. Period Filter**
```
Test Case: Filter Period
1. Klik "7 Hari"

Expected:
✓ Same stats (karena cuma ada 1 order today)

2. Klik "Bulan Ini"

Expected:
✓ Same stats
```

---

## 🐛 POTENTIAL BUGS TO CHECK

### **Critical (Must Fix):**

1. **Date-fns locale import**
   - File: `utils/dateHelpers.js`
   - Check: `import { id as localeId } from 'date-fns/locale';`
   - Possible issue: Module not found
   - Fix: Install `date-fns` jika belum ada

2. **IndexedDB Initialization**
   - File: `data/db/schema.js`
   - Check: Database created on first run
   - Test: Clear browser IndexedDB, reload app

3. **Finishing Selection Sync**
   - File: All configurators with `useFinishingSelection`
   - Check: `useEffect` dependency warning
   - Possible issue: Infinite loop
   - Fix: Add proper dependencies

4. **Transaction Reset**
   - File: `hooks/useTransaction.js`
   - Test: After "TRANSAKSI BARU", semua field reset
   - Check: Receipt clear, input clear, payment reset

### **Medium (Should Fix):**

5. **Navigation Active State**
   - File: `components/MainLayout.jsx`
   - Check: Active link highlight works

6. **Permission Checks**
   - File: All protected components
   - Test: Cashier tidak bisa akses Employee List
   - Test: Production tidak bisa akses Dashboard

7. **Form Validation**
   - File: `modules/employees/EmployeeForm.jsx`
   - Test: PIN harus 4 digit
   - Test: Confirm PIN match

### **Low (Nice to Fix):**

8. **Mobile Responsive**
   - Test di width < 768px
   - Check: Sidebar collapse
   - Check: Tables scroll horizontal

9. **Empty States**
   - Test: Dashboard tanpa order
   - Test: OrderBoard tanpa order
   - Test: Attendance tanpa karyawan

---

## ✅ SUCCESS CRITERIA

**App is ready if:**
- [ ] Login flow works (Owner + Employee)
- [ ] Can create employee
- [ ] Can create POS transaction
- [ ] Order appears in OrderBoard
- [ ] Can update order status
- [ ] Can check-in/out attendance
- [ ] Dashboard shows correct stats
- [ ] Navigation between pages works
- [ ] Logout works
- [ ] Data persists after refresh

---

## 📝 BUG REPORT FORMAT

**If you find bugs, report like this:**

```
BUG: [Short description]

Steps to reproduce:
1. Do this
2. Then this
3. Error happens

Expected: [What should happen]
Actual: [What happens]

Error message (if any): [Console error]

Priority: Critical / Medium / Low
```

---

## 🚀 NEXT STEPS AFTER TESTING

1. **Fix all Critical bugs**
2. **Fix Medium bugs**
3. **Polish UI/UX**
4. **Prepare for deployment**

---

**Siap mulai testing?** 
Coba flow di atas satu per satu dan laporkan bug yang ketemu! 🧪
