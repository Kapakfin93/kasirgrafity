import db from "../db/schema.js";

const A3_PRODUCTS = [
  // 1. MASTER STIKER A3+ (The Rolls)
  // Logic: Unit (Material) + Finishing (Cut/Lam)
  {
    id: "master_stiker_a3",
    categoryId: "DIGITAL_A3_PRO",
    name: "STIKER A3+ CUSTOM (Print & Cut)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 15000, // Dummy base
    min_qty: 1,
    advanced_features: {
      wholesale_rules: [
        { min: 1, max: 10, price: 15000 }, // Ecer
        { min: 11, max: 49, price: 12500 }, // UMKM
        { min: 50, max: 1000, price: 10000 }, // Partai
      ],
    },
    variants: [
      { label: "Stiker Chromo", specs: "Label Makanan (Kertas)", price: 10000 },
      {
        label: "Stiker Vinyl White",
        specs: "Tahan Air / Frozen",
        price: 15000,
      },
      {
        label: "Stiker Transparan",
        specs: "Bening / Tembus Pandang",
        price: 15000,
      },
      {
        label: "Stiker Hologram",
        specs: "Efek Pelangi (Premium)",
        price: 25000,
      },
    ],
    finishing_groups: [
      {
        id: "fin_stiker_cut",
        title: "Pola Potong (Cutting)",
        type: "radio",
        required: true,
        options: [
          { label: "Tanpa Potong (Lembaran)", price: 0 },
          { label: "Kiss Cut (Setengah Putus)", price: 5000 },
          { label: "Die Cut (Putus Bentuk)", price: 10000 },
        ],
      },
      {
        id: "fin_stiker_lam",
        title: "Laminasi",
        type: "checkbox",
        required: false,
        options: [{ label: "Laminasi Glossy / Doff", price: 3000 }],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 2. MASTER CETAK POD A3+ (The Papers)
  // Logic: MATRIX (Paper x Side) -> To allow custom pricing for 2-Sided Wholesale
  {
    id: "master_cetak_pod",
    categoryId: "DIGITAL_A3_PRO",
    name: "CETAK POD A3+ (Lembaran)",
    input_mode: "MATRIX", // Step 1: Paper, Step 2: Side
    calc_engine: "MATRIX_FIXED",
    base_price: 5000,
    min_qty: 1,
    variants: [
      {
        label: "Art Paper 150gr",
        specs: "Brosur / Flyer / Majalah",
        price_list: {
          "1 Sisi (Muka 1)": 5000,
          "2 Sisi (Bolak-Balik)": 9000, // Custom Price (Not x2)
        },
      },
      {
        label: "Art Carton 260gr",
        specs: "Poster / Cover Menu / Kartu",
        price_list: {
          "1 Sisi (Muka 1)": 7500,
          "2 Sisi (Bolak-Balik)": 13000,
        },
      },
      {
        label: "HVS 100gr",
        specs: "Teks / Bagan / Kop",
        price_list: {
          "1 Sisi (Muka 1)": 3000,
          "2 Sisi (Bolak-Balik)": 5000,
        },
      },
      {
        label: "BC Tik / Manila",
        specs: "Sertifikat Standar (Doff)",
        price_list: {
          "1 Sisi (Muka 1)": 6000,
          "2 Sisi (Bolak-Balik)": 10000,
        },
      },
      {
        label: "Jasmine (Glitter)",
        specs: "Sertifikat Mewah / Undangan",
        price_list: {
          "1 Sisi (Muka 1)": 10000,
          "2 Sisi (Bolak-Balik)": 18000,
        },
      },
    ],
    finishing_groups: [
      {
        id: "fin_pod_lam",
        title: "Laminasi (A3)",
        type: "checkbox",
        required: false,
        options: [{ label: "Laminasi Glossy / Doff", price: 3000 }],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 3. MASTER PRINT DOKUMEN (The Booklet)
  // Logic: BOOKLET (Material x Print Mode x Sheets/Book) + PER_JOB Finishing
  // NEW SCHEMA: Additive Pricing (Paper + Ink, no multiplier)
  {
    id: "master_print_dokumen",
    categoryId: "DIGITAL_A3_PRO",
    name: "PRINT DOKUMEN (A4/F4 HVS)",
    input_mode: "BOOKLET", // Special mode for booklet calculation
    calc_engine: "BOOKLET",
    base_price: 0, // Not used in new schema
    min_qty: 1, // Minimum 1 book

    // STEP 1: Material variants (PAPER price per sheet)
    variants: [
      { label: "HVS 70gr", price: 200, specs: "Putih Standar" },
      { label: "HVS 80gr", price: 250, specs: "Putih Tebal" },
      { label: "Bookpaper 72gr", price: 300, specs: "Krem Novel" },
      { label: "Art Paper 120gr", price: 500, specs: "Glossy" },
    ],

    // STEP 2: Print modes (INK/CLICK price per sheet, NO MULTIPLIER)
    print_modes: [
      {
        id: "single_sided",
        label: "1 Sisi (Hitam Putih)",
        price: 300, // Rp 300 per sheet for ink
        description: "Teks Hitam Standard",
      },
      {
        id: "duplex_bw",
        label: "Bolak-Balik (Hitam Putih)",
        price: 500, // Rp 500 per sheet for duplex ink
        description: "Hemat (Rp 250/muka)",
      },
      {
        id: "duplex_color",
        label: "Bolak-Balik (Full Color)",
        price: 1500, // Rp 1500 per sheet for color duplex
        description: "Warna Tajam",
      },
    ],

    // STEP 3: Finishing (PER BOOK, not per sheet!)
    finishing_groups: [
      {
        id: "fin_binding",
        title: "Jilid / Binding",
        type: "radio",
        price_mode: "PER_JOB", // CRITICAL: Once per book
        required: false,
        options: [
          { label: "Tanpa Jilid", price: 0 },
          { label: "Staples Pojok", price: 2000 },
          { label: "Jilid Lakban", price: 3000 },
          { label: "Softcover", price: 15000 },
        ],
      },
      {
        id: "fin_cover",
        title: "Cover Depan",
        type: "radio",
        price_mode: "PER_JOB",
        required: false,
        options: [
          { label: "Tanpa Cover", price: 0 },
          { label: "Mika Bening", price: 3000 },
        ],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 4. MASTER KARTU NAMA (The Box)
  // Logic: Unit (Side) + Tiered
  {
    id: "master_kartu_nama",
    categoryId: "DIGITAL_A3_PRO",
    name: "KARTU NAMA (Per Box)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 35000,
    min_qty: 1,
    advanced_features: {
      wholesale_rules: [
        { min: 1, max: 4, price: 35000 },
        { min: 5, max: 9, price: 30000 },
        { min: 10, max: 1000, price: 25000 },
      ],
    },
    variants: [
      { label: "Cetak 1 Sisi", specs: "Art Carton 260gr + Box", price: 35000 },
      { label: "Cetak 2 Sisi", specs: "Art Carton 260gr + Box", price: 55000 },
    ],
    finishing_groups: [
      {
        id: "fin_kn_lam",
        title: "Finishing",
        type: "checkbox",
        required: false,
        options: [{ label: "Laminasi 2 Sisi (Matte/Gloss)", price: 20000 }],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },
];

export async function runA3Reconstruction() {
  console.log("🖨️ DIGITAL A3+ RECONSTRUCTION STARTING...");
  try {
    // ✅ HARDCODED Category ID (Case-sensitive, exact match)
    const REAL_CAT_ID = "DIGITAL_A3_PRO";
    console.log(`✅ Using hardcoded category ID: ${REAL_CAT_ID}`);

    // Verify category exists
    const categoryExists = await db.categories.get(REAL_CAT_ID);
    if (!categoryExists) {
      console.error(
        `❌ FATAL: Category '${REAL_CAT_ID}' tidak ditemukan di database!`,
      );
      console.error(
        "   Pastikan migration seeder sudah run dan kategori sudah dibuat.",
      );
      return;
    }

    // Update all products with HARDCODED category ID
    const productsWithRealId = A3_PRODUCTS.map((p) => ({
      ...p,
      categoryId: REAL_CAT_ID, // ✅ Hardcoded, reliable!
    }));

    // STRATEGY: NUCLEAR CLEANUP by Category ID + Keywords
    const zombies = await db.products
      .filter((p) => {
        const name = p.name.toLowerCase();
        const cat = p.categoryId || "";
        const isZombie =
          cat === REAL_CAT_ID ||
          cat === "DIGITAL_A3_PRO" || // Legacy fallback
          name.includes("stiker a3") ||
          name.includes("kartu nama") ||
          name.includes("brosur") ||
          name.includes("art paper") ||
          name.includes("art carton") ||
          name.includes("hvs a3") ||
          name.includes("print dokumen") ||
          name.includes("cetak pod");
        return isZombie;
      })
      .toArray();

    for (const p of zombies) {
      await db.products.delete(p.id);
      console.log(`🔥 Vaporized: ${p.name}`);
    }

    // CRITICAL FIX: Force delete PRINT DOKUMEN by ID to ensure clean slate
    try {
      await db.products.delete("master_print_dokumen");
      console.log("🔥 Force deleted: master_print_dokumen (if existed)");
    } catch (e) {
      // Ignore if doesn't exist
    }

    // SEED NEW MASTERS (with hardcoded category ID)
    for (const mp of productsWithRealId) {
      await db.products.put(mp);
      console.log(`✅ Seeded: ${mp.name} → Category: ${REAL_CAT_ID}`);

      // VERIFICATION: Log print_modes for PRINT DOKUMEN
      if (mp.id === "master_print_dokumen") {
        console.log("🔍 PRINT DOKUMEN verification:", {
          categoryId: mp.categoryId,
          inputMode: mp.input_mode,
          hasPrintModes: !!mp.print_modes,
          printModesCount: mp.print_modes?.length || 0,
          modes: mp.print_modes?.map((m) => `${m.label} (Rp ${m.price})`),
        });
      }
    }
    console.log("✅ A3+ RECONSTRUCTION COMPLETE");
  } catch (err) {
    console.error("❌ FAILED:", err);
  }
}
