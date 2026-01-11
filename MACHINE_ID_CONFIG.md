# 🖥️ Konfigurasi MACHINE_ID untuk Multi-Computer Setup

## 📍 Lokasi File

**File yang harus diubah:** [`src/core/constants.js`](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/core/constants.js)

## ⚙️ Cara Konfigurasi

### Komputer 1 (Kasir Utama)
```javascript
// Di constants.js baris 9:
export const MACHINE_ID = 'A'; // ← Tetap 'A'
```

### Komputer 2 (Kasir Cadangan)
```javascript
// Di constants.js baris 9:
export const MACHINE_ID = 'B'; // ← Ubah menjadi 'B'
```

### Komputer 3, 4, 5 (jika ada)
```javascript
// Gunakan 'C', 'D', 'E'
export const MACHINE_ID = 'C'; // atau 'D', 'E'
```

## ⚠️ PENTING!

1. **Setiap komputer HARUS punya ID unik**
   - Komputer 1 → `'A'`
   - Komputer 2 → `'B'`
   - Komputer 3 → `'C'`
   - dst...

2. **Jangan gunakan ID yang sama di 2 komputer berbeda**
   - ❌ Komputer 1 = 'A' dan Komputer 2 = 'A' → **SALAH!**
   - ✅ Komputer 1 = 'A' dan Komputer 2 = 'B' → **BENAR!**

3. **Gunakan huruf kapital** (A, B, C, D, E)

## 🔢 Format Nomor Nota yang Dihasilkan

### Dengan MACHINE_ID:
```
JGL-{MACHINE_ID}-{YYYYMMDD}-{SEQUENCE}
```

### Contoh:
| Komputer | Tanggal | Nomor Nota |
|----------|---------|------------|
| A | 09/01/2026 | `JGL-A-20260109-0001` |
| A | 09/01/2026 | `JGL-A-20260109-0002` |
| B | 09/01/2026 | `JGL-B-20260109-0001` |
| C | 09/01/2026 | `JGL-C-20260109-0001` |
| A | 10/01/2026 | `JGL-A-20260110-0001` ← Reset ke 1 (hari baru) |

## ✅ Keuntungan Sistem Ini

1. **Tidak Ada Konflik Nomor Nota**
   - Setiap komputer punya sequence sendiri
   - Aman walau offline bersamaan

2. **Mudah Dilacak**
   - Tahu order dari komputer mana
   - A = Kasir Utama, B = Kasir Cadangan, etc.

3. **Reset Otomatis Setiap Hari**
   - Sequence mulai dari 0001 lagi setiap hari

## 🔧 Langkah Setup untuk Tim IT

1. **Clone/Copy aplikasi ke komputer baru**
2. **Buka file:** `src/core/constants.js`
3. **Cari baris:** `export const MACHINE_ID = 'A';`
4. **Ubah huruf sesuai komputer:**
   - Komputer 2 → ganti jadi `'B'`
   - Komputer 3 → ganti jadi `'C'`
   - dst...
5. **Save dan restart aplikasi** (`npm run dev`)

## 🧪 Cara Verifikasi

1. **Buat transaksi di Komputer A**
   - Cek nomor nota: harus `JGL-A-YYYYMMDD-####`

2. **Buat transaksi di Komputer B**
   - Cek nomor nota: harus `JGL-B-YYYYMMDD-####`

3. **Lihat dashboard/order list**
   - Semua nomor nota harus unik
   - Tidak ada duplikasi

## 📞 Support

Jika ada masalah dengan nomor nota:
1. Cek `constants.js` di setiap komputer
2. Pastikan MACHINE_ID berbeda di setiap komputer
3. Restart aplikasi setelah ubah MACHINE_ID

---

**Last Updated:** 09/01/2026  
**Version:** 1.0.0
