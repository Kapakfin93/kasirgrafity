# POSTER CONFIGURATOR - SUPABASE INTEGRATION GUIDE

## Overview
PosterConfigurator menggunakan **custom logic** untuk handling Poster products dengan flow yang spesifik. Logic ini **Supabase-ready** dengan minor adjustments.

---

## Data Structure

### **Transaction Item Output** (Supabase-Compatible)
```javascript
{
    productId: 'POSTER',           // FK to products table
    productName: 'Poster',
    categoryId: 'POSTER',          // FK to categories table
    
    // Configuration
    size: 'A2',                    // Selected size
    sizeDimensions: '42 × 59 cm',  // Human readable
    printType: 'UV',               // or 'Indoor'
    material: 'Albatros UV',       // Selected material
    quantity: 5,                   // Number of sheets
    
    // Pricing
    basePrice: 40000,              // Price per sheet
    finishings: ['Laminasi Glossy'], // Array of finishing names
    finishingCost: 40000,          // Total finishing cost
    subtotal: 240000,              // Total (basePrice * qty) + finishingCost
    
    // Display
    description: 'Poster A2 (42 × 59 cm) - UV - Albatros UV'
}
```

---

## Supabase Schema Recommendations

### **1. Products Table**
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id),
    name TEXT NOT NULL,
    logic_type TEXT,  -- 'CUSTOM' for PosterConfigurator
    price_matrix JSONB, -- Store price matrix
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example record for POSTER
INSERT INTO products (id, category_id, name, logic_type, price_matrix) VALUES (
    'POSTER',
    'POSTER',
    'Poster',
    'CUSTOM',
    '{
        "indoor": {
            "albatros_indoor": {"A2": 25000, "A1": 50000, "A0": 100000},
            "luster_indoor": {"A2": 30000, "A1": 60000, "A0": 120000},
            "photopaper_indoor": {"A2": 35000, "A1": 70000, "A0": 140000}
        },
        "uv": {
            "albatros_uv": {"A2": 40000, "A1": 75000, "A0": 150000},
            "luster_uv": {"A2": 45000, "A1": 85000, "A0": 170000},
            "photopaper_uv": {"A2": 50000, "A1": 95000, "A0": 190000}
        }
    }'::jsonb
);
```

### **2. Finishings Table**
```sql
CREATE TABLE finishings (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id),
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example records
INSERT INTO finishings VALUES
('POSTER_LAMINASI_GLOSSY', 'POSTER', 'Laminasi Glossy', 8000, 'Lapisan glossy mengkilap'),
('POSTER_LAMINASI_DOFF', 'POSTER', 'Laminasi Doff', 8000, 'Lapisan doff anti silau');
```

### **3. Transaction Items Table**
```sql
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    product_id TEXT REFERENCES products(id),
    category_id TEXT REFERENCES categories(id),
    
    -- Configuration (JSONB for flexibility)
    config JSONB NOT NULL,
    
    -- Pricing
    base_price INTEGER NOT NULL,
    finishing_cost INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    
    -- Display
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example insert
INSERT INTO transaction_items (transaction_id, product_id, category_id, config, base_price, finishing_cost, subtotal, description, quantity)
VALUES (
    '...', 
    'POSTER',
    'POSTER',
    '{
        "size": "A2",
        "sizeDimensions": "42 × 59 cm",
        "printType": "UV",
        "material": "Albatros UV",
        "finishings": ["Laminasi Glossy"]
    }'::jsonb,
    40000,
    8000,
    48000,
    'Poster A2 (42 × 59 cm) - UV - Albatros UV',
    1
);
```

---

## Integration Steps

### **Phase 1: Keep Local Logic (Current)**
✅ PosterConfigurator works with hardcoded price matrix
✅ Finishings loaded from `data/finishings.js`
✅ No Supabase needed yet

### **Phase 2: Hybrid (Recommended)**
1. Keep PosterConfigurator logic
2. Load price_matrix from Supabase instead of hardcode
3. Load finishings from Supabase

**Code changes needed:**
```javascript
// In PosterConfigurator
const [priceMatrix, setPriceMatrix] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    async function loadData() {
        // Load price matrix from Supabase
        const { data: product } = await supabase
            .from('products')
            .select('price_matrix, finishings(id, name, price)')
            .eq('id', 'POSTER')
            .single();
        
        setPriceMatrix(product.price_matrix);
        setLoading(false);
    }
    loadData();
}, []);
```

### **Phase 3: Full Supabase (Future)**
Move all configurator logic to database with stored procedures/functions

---

## Current File Dependencies

```
PosterConfigurator.jsx
├── formatRupiah (core/formatters.js)
├── ActionBar (configurators/shared/ActionBar.jsx)
└── finishings (data/finishings.js) ← Will load from Supabase
    └── category_id: 'POSTER' filter
```

---

## Known Compatibility Issues: NONE ✅

The current implementation is **100% Supabase-ready** because:
- ✅ All data is in proper structure
- ✅ Transaction item format matches typical DB schema
- ✅ Easy to swap hardcoded data with Supabase queries
- ✅ No tight coupling to local-only features

---

## Testing Checklist Before Supabase

- [x] All sizes work (A2, A1, A0)
- [x] Indoor/UV switching works
- [x] Material selection works
- [x] Price calculation correct
- [x] Quantity controls work
- [x] Finishing toggle works
- [x] Finishing cost calculation correct
- [x] Transaction item format complete
- [x] No console errors
- [x] Responsive UI

---

**Status: ✅ PRODUCTION READY & SUPABASE COMPATIBLE**
