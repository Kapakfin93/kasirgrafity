# TEXTILE CONFIGURATOR - SUPABASE INTEGRATION GUIDE

## Overview
TextileConfigurator menggunakan **custom logic** untuk handling produk Kain & DTF dengan variasi lebar dan perhitungan harga per meter.

---

## Data Structure

### **Transaction Item Output** (Supabase-Compatible)
```javascript
{
    productId: 'TEXTILE_IMPOR_150', // Unique ID logic
    productName: 'Kain Impor (L: 150cm)',
    categoryId: 'TEXTILE',
    
    // Configuration (JSONB)
    config: {
        jenisKain: 'Kain Impor',
        width: '150cm',
        widthCm: 150,
        panjang: 2.5,     // Decimal supported
        unit: 'meter'
    },
    
    // Pricing
    basePrice: 90000,    // Price per meter
    finishings: ['Jahit Keliling + Tali'],
    finishingCost: 12500, // (Rp 5.000 * 2.5m)
    subtotal: 237500,     // (90.000 * 2.5) + 12.500
    quantity: 2.5,        // Qty in meters
    
    // Display
    description: 'Kain Impor (L: 150cm) × 2.5m'
}
```

---

## Supabase Schema Recommendations

### **1. Products Table (Textile Variants)**
Untuk Textile, produk disimpan berdasarkan varian lebar.

```sql
-- Example records for TEXTILE variants
INSERT INTO products (id, category_id, name, logic_type, price) VALUES 
('TEXTILE_LOKAL_90', 'TEXTILE', 'Kain Lokal 90cm', 'CUSTOM', 35000),
('TEXTILE_LOKAL_120', 'TEXTILE', 'Kain Lokal 120cm', 'CUSTOM', 45000),
('TEXTILE_IMPOR_90', 'TEXTILE', 'Kain Impor 90cm', 'CUSTOM', 55000),
('TEXTILE_IMPOR_150', 'TEXTILE', 'Kain Impor 150cm', 'CUSTOM', 90000),
('TEXTILE_IMPOR_200', 'TEXTILE', 'Kain Impor 200cm', 'CUSTOM', 120000),
('TEXTILE_DTF_60', 'TEXTILE', 'DTF 60cm', 'CUSTOM', 45000);
```

### **2. Finishings Table**
Harga finishing textile biasanya **per meter lari**.

```sql
INSERT INTO finishings (id, category_id, name, price, description) VALUES
('TEXTILE_JAHIT_KELILING', 'TEXTILE', 'Jahit Keliling + Tali', 5000, 'Per meter lari'),
('TEXTILE_OBRAS', 'TEXTILE', 'Jahit Obras', 3000, 'Per meter lari');
```

---

## Logic Validation

### **Harga Finishing Per Meter**
Configurator otomatis mengalikan harga finishing dengan panjang kain.
Rumus: `Total Finishing = Harga Finishing × Panjang Kain`
*Contoh: Jahit Keliling (5.000) × 2.5 meter = Rp 12.500*

### **Validasi DTF**
Logic: `if (jenis === 'DTF') { disableFinishings() }`
Configurator otomatis menyembunyikan opsi finishing jika user memilih DTF, sesuai request.

---

## Testing Checklist

- [ ] Select Kain Lokal -> Show 90cm & 120cm
- [ ] Select Kain Impor -> Show 90cm, 150cm, & 200cm
- [ ] Select DTF -> Show 60cm only
- [ ] Input Decimal Length (e.g., 1.5m) -> Price calculation check
- [ ] Check Finishing availability (Available for Kain, Hidden for DTF)
- [ ] Verify Total Calculation = (Base × Length) + (Finishing × Length)

---

**Status: ✅ READY FOR SUPABASE**
