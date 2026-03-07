# PRD: Laporan Konsumsi Bahan MMT (m² Harian)

## 1. Objective

Membuat laporan agregasi konsumsi bahan Banner/Spanduk (MMT) dalam satuan m² per hari, di-grouping berdasarkan jenis/gramasi bahan. Data bersumber dari `order_items` yang terhubung ke `orders` dengan status `DELIVERED`.

## 2. Approved Parameters

| Parameter                    | Value                                                             | Status         |
| ---------------------------- | ----------------------------------------------------------------- | -------------- |
| **Bleed Margin**             | +0.08m per sisi → `(length + 0.16) * (width + 0.16)`              | ✅ APPROVED    |
| **Status Filter**            | `production_status = 'DELIVERED'`                                 | ✅ APPROVED    |
| **NULL Handling**            | Exclude items where `specs_json` is NULL                          | ✅ APPROVED    |
| **Date Fallback**            | `COALESCE(completed_at, updated_at, created_at)`                  | ✅ APPROVED    |
| **Product Filter (Dynamic)** | Cek ke tabel `products` via JOIN: `p.category_id = 'CAT_OUTDOOR'` | ✅ **UPDATED** |

## 3. Data Shape (Verified)

#### A. Format Sejarah (Legacy - Feb 2026)

Source: `order_items.metadata->specs_json`

```json
{
  "area": 6,
  "width": 1,
  "length": 6,
  "variantLabel": "Flexi 280gr Standard"
}
```

#### B. Format Standar Final (Maret 2026+) [NEW STANDARD]

Source: `order_items.dimensions`

```json
{
  "type": "AREA",
  "inputs": {
    "length": 3.2,
    "width": 1.5,
    "area": 4.8,
    "material": "Flexi 280gr Standard"
  }
}
```

**Master Materials** (`product_materials` where `product_id = 'PROD_SPANDUK_V2'`):
| ID | Label |
|---|---|
| `MAT_SPANDUK_FLEXI_280` | Flexi 280gr Standard |
| `MAT_SPANDUK_FLEXI_340` | Flexi 340gr (Medium) |
| `MAT_SPANDUK_FLEXI_440` | Flexi Korea 440gr |
| `MAT_SPANDUK_BACKLITE` | Flexi Backlite |

## 4. Task Breakdown

### TASK 1: Backend — Supabase RPC Function

**File:** Migration via `apply_migration` MCP tool
**Function:** `get_mmt_daily_production(p_start_date date, p_end_date date)`

```sql
CREATE OR REPLACE FUNCTION public.get_mmt_daily_production(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  completion_date date,
  material_type   text,
  total_items     bigint,
  total_qty       numeric,
  total_sqm       numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(o.completed_at, o.updated_at, o.created_at)::date AS completion_date,
    COALESCE(
      oi.dimensions->'inputs'->>'material',
      oi.metadata->'specs_json'->>'variantLabel',
      'Tidak Diketahui'
    ) AS material_type,
    ... -- logic COALESCE on length & width
$$;
```

**Acceptance Criteria:**

- Callable via `supabase.rpc('get_mmt_daily_production', { p_start_date, p_end_date })`
- Returns rows grouped by `(date, material_type)`
- Excludes NULL specs data
- Bleed margin applied: +0.16m to each dimension

### TASK 2: Frontend — React Report Page

**File:** `src/modules/reports/MMTProductionReport.jsx` [NEW]

**Component Structure:**

```text
MMTProductionReport
├── Header (title + icon)
├── Date Range Picker (start_date, end_date — default: 7 hari terakhir)
├── Summary Cards (3x)
│   ├── Total m² (all materials combined)
│   ├── Total Items
│   └── Total Qty
├── Data Table
│   ├── Columns: Tanggal | Jenis Bahan | Items | Qty | Total m²
│   ├── Rows: from RPC data
│   └── Subtotal per material type
├── Loading & Empty States
└── Footer Grand Total
```

**Styling:** Inline styles + CSS classes consistent with `OwnerDashboard.jsx`:

- Dark mode gradient backgrounds
- Glassmorphism cards
- Color-coded material badges
- Responsive grid layout

**Data Flow:**

```javascript
const { data } = await supabase.rpc("get_mmt_daily_production", {
  p_start_date: startDate,
  p_end_date: endDate,
});
```

### TASK 3: Routing & Navigation

**Files Modified:**

`src/App.jsx`

```javascript
// [MODIFY]
import { MMTProductionReport } from "./modules/reports/MMTProductionReport";
...
{/* === ZONA OWNER (TERKUNCI PIN) === */}
<Route path="/reports/mmt-production" element={
  <ProtectedWithPIN><MMTProductionReport /></ProtectedWithPIN>
} />
```

`src/components/MainLayout.jsx`

```javascript
// [MODIFY]
// In navItems for isOwner:
{ path: "/reports/mmt-production", icon: "📊", label: "Lap. Produksi" },
// Ditempatkan setelah menu "Pengeluaran" dan sebelum "Produk".
```

## 5. Verification Plan

| Step                                         | Expected Result                          |
| -------------------------------------------- | ---------------------------------------- |
| 1. Run RPC via execute_sql                   | Returns grouped data with correct m²     |
| 2. Cross-check 2-3 items manual              | `m² = (len + 0.16) * (wid + 0.16) * qty` |
| 3. Open `/reports/mmt-production` in browser | Page renders with table                  |
| 4. Test date range changes                   | Data updates correctly                   |
| 5. Test empty range                          | Shows empty state                        |

## 6. Out of Scope

- Export ke CSV/Excel (future enhancement)
- Grafik visualisasi tren (future enhancement)
- Filter per operator/kasir
- Kategori Cetak selain `CAT_OUTDOOR` (Spanduk/Banner)
