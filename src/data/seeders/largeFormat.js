export const largeFormatProducts = [
  // =========================================
  // KATEGORI 1: OUTDOOR PRINT (Logic: AREA)
  // =========================================
  {
    id: "PROD_SPANDUK_V2",
    categoryId: "CAT_OUTDOOR",
    name: "CETAK SPANDUK (Outdoor)",
    description: "Spanduk Flexi Outdoor (Hitungan Meter Persegi).",
    base_price: 18000,
    input_mode: "AREA",
    min_qty: 1,
    variants: [
      {
        label: "Flexi 280gr Standard",
        price: 18000,
        specs: "Outdoor Standard",
      },
      { label: "Flexi Korea 440gr", price: 45000, specs: "Outdoor Premium" },
      { label: "Flexi Backlite", price: 65000, specs: "Khusus Neonbox" },
      { label: "Banner Jerman", price: 85000, specs: "Premium High Res" },
    ],
    finishing_groups: [
      {
        id: "fin_outdoor",
        title: "Finishing (Free)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Mata Ayam (Cincin)", price: 0 },
          { label: "Slongsong (Kantong)", price: 0 },
          { label: "Lipat Pres", price: 0 },
          { label: "Tanpa Finishing", price: 0 },
        ],
      },
    ],
  },

  // ==================================================
  // KATEGORI 2: ROLL MEDIA & TEXTILE (Logic: LINEAR)
  // ==================================================
  {
    id: "PROD_KAIN_V2",
    categoryId: "CAT_ROLLS",
    name: "CETAK KAIN / TEXTILE",
    description: "Sublimasi Kain (Hitungan Meter Lari).",
    base_price: 65000,
    input_mode: "LINEAR",
    min_qty: 1,
    variants: [
      {
        label: "Kain Lokal (L: 90cm)",
        price: 55000,
        width: 0.9,
        specs: "Bahan Lokal Standard",
      },
      {
        label: "Kain Lokal (L: 120cm)",
        price: 70000,
        width: 1.2,
        specs: "Bahan Lokal Lebar",
      },
      {
        label: "Kain Import (L: 90cm)",
        price: 65000,
        width: 0.9,
        specs: "TC Import Premium",
      },
      {
        label: "Kain Import (L: 120cm)",
        price: 85000,
        width: 1.2,
        specs: "TC Import Premium",
      },
      {
        label: "Kain Import (L: 150cm)",
        price: 105000,
        width: 1.5,
        specs: "TC Import Premium",
      },
      {
        label: "Kain Import (L: 200cm)",
        price: 140000,
        width: 2.0,
        specs: "TC Import Jumbo",
      },
    ],
    finishing_groups: [
      {
        id: "fin_kain",
        title: "Finishing Jahit (Per Pcs/Meter)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Potong Pas (Free)", price: 0 },
          { label: "Jahit Keliling", price: 15000 },
          { label: "Tali + Jahit", price: 20000 },
          { label: "Slongsong", price: 10000 },
        ],
      },
    ],
  },
  {
    id: "PROD_STIKER_METER_V2",
    categoryId: "CAT_ROLLS",
    name: "CETAK STIKER (Meteran)",
    description: "Stiker Indoor/Outdoor (Hitungan Meter Lari).",
    base_price: 75000,
    input_mode: "LINEAR",
    min_qty: 1,
    variants: [
      {
        label: "Vinyl White (L: 100cm)",
        price: 75000,
        width: 1.0,
        specs: "Bahan Putih Standar",
      },
      {
        label: "Vinyl White (L: 120cm)",
        price: 90000,
        width: 1.2,
        specs: "Bahan Putih Lebar",
      },
      {
        label: "Vinyl White (L: 150cm)",
        price: 115000,
        width: 1.5,
        specs: "Bahan Putih Jumbo",
      },
      {
        label: "Transparan (L: 100cm)",
        price: 80000,
        width: 1.0,
        specs: "Tembus Pandang",
      },
      {
        label: "Transparan (L: 120cm)",
        price: 96000,
        width: 1.2,
        specs: "Tembus Pandang",
      },
      {
        label: "Transparan (L: 150cm)",
        price: 120000,
        width: 1.5,
        specs: "Tembus Pandang",
      },
      {
        label: "One Way (L: 100cm)",
        price: 85000,
        width: 1.0,
        specs: "Kaca Film",
      },
      {
        label: "One Way (L: 120cm)",
        price: 105000,
        width: 1.2,
        specs: "Kaca Film",
      },
      {
        label: "One Way (L: 150cm)",
        price: 130000,
        width: 1.5,
        specs: "Kaca Film",
      },
    ],
    finishing_groups: [
      {
        id: "fin_stiker_lam",
        title: "Laminasi (Per Meter Lari)",
        type: "radio",
        price_mode: "PER_METER",
        options: [
          { label: "Tanpa Laminasi", price: 0 },
          { label: "Laminasi Glossy", price: 15000 },
          { label: "Laminasi Doff", price: 15000 },
        ],
      },
    ],
  },
  {
    id: "PROD_DTF_V1",
    categoryId: "CAT_ROLLS",
    name: "CETAK DTF (Sablon Film)",
    description: "Direct Transfer Film (Hitungan Meter Lari).",
    base_price: 35000,
    input_mode: "LINEAR",
    min_qty: 1,
    variants: [
      {
        label: "PET Film (L: 60cm)",
        price: 35000,
        width: 0.6,
        specs: "Area Cetak 58cm",
      },
    ],
    finishing_groups: [
      {
        id: "fin_dtf",
        title: "Finishing",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Roll Utuh (Tanpa Potong)", price: 0 },
          { label: "Potong Per Logo (Manual)", price: 15000 },
        ],
      },
    ],
  },

  // ===============================================
  // KATEGORI 3: POSTER & INDOOR (Logic: MATRIX)
  // ===============================================

  // 1. POSTER INDOOR (STANDARD)
  {
    id: "PROD_POSTER_INDOOR",
    categoryId: "CAT_POSTER",
    name: "CETAK POSTER (Indoor)",
    description: "Cetak Poster Indoor Waterbase (Pcs).",
    base_price: 0,
    input_mode: "MATRIX",
    min_qty: 1,
    variants: [
      {
        label: "A2 (42 x 60 cm)",
        specs: "Ukuran Sedang",
        price_list: {
          "Albatros (Matte)": 25000,
          "Luster (Kulit Jeruk)": 30000,
          Photopaper: 35000,
        },
      },
      {
        label: "A1 (60 x 84 cm)",
        specs: "Ukuran Besar",
        price_list: {
          "Albatros (Matte)": 50000,
          "Luster (Kulit Jeruk)": 60000,
          Photopaper: 70000,
        },
      },
      {
        label: "A0 (84 x 118 cm)",
        specs: "Ukuran Jumbo",
        price_list: {
          "Albatros (Matte)": 95000,
          "Luster (Kulit Jeruk)": 110000,
          Photopaper: 130000,
        },
      },
    ],
    finishing_groups: [
      {
        id: "fin_poster",
        title: "Laminasi (Per Pcs)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Tanpa Laminasi", price: 0 },
          { label: "Laminasi Glossy", price: 10000 },
          { label: "Laminasi Doff", price: 10000 },
        ],
      },
    ],
  },

  // 2. POSTER UV (PREMIUM)
  {
    id: "PROD_POSTER_UV",
    categoryId: "CAT_POSTER",
    name: "CETAK POSTER (UV Print)",
    description: "Cetak Poster UV Premium / Timbul (Pcs).",
    base_price: 0,
    input_mode: "MATRIX",
    min_qty: 1,
    variants: [
      {
        label: "A2 (42 x 60 cm)",
        specs: "Ukuran Sedang",
        price_list: {
          "Albatros (Matte)": 35000,
          "Luster (Kulit Jeruk)": 45000,
          Photopaper: 50000,
        },
      },
      {
        label: "A1 (60 x 84 cm)",
        specs: "Ukuran Besar",
        price_list: {
          "Albatros (Matte)": 70000,
          "Luster (Kulit Jeruk)": 90000,
          Photopaper: 100000,
        },
      },
      {
        label: "A0 (84 x 118 cm)",
        specs: "Ukuran Jumbo",
        price_list: {
          "Albatros (Matte)": 135000,
          "Luster (Kulit Jeruk)": 175000,
          Photopaper: 195000,
        },
      },
    ],
    finishing_groups: [
      {
        id: "fin_poster",
        title: "Laminasi (Per Pcs)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Tanpa Laminasi", price: 0 },
          { label: "Laminasi Glossy", price: 10000 },
          { label: "Laminasi Doff", price: 10000 },
        ],
      },
    ],
  },
];
