import { supabase } from "../../services/supabaseClient.js";
import db from "../db/schema.js";

// ============================================================================
// 1️⃣ STATIC DATA RESERVOIR (BASE STRUCTURE)
// Definisi dasar produk. Varian akan di-inject otomatis dari 'product_materials'
// ============================================================================
export const largeFormatProducts = [
  // --- DISPLAY SYSTEM (RELOCATION FROM MERCH) ---
  {
    id: "master_display_system",
    categoryId: "CAT_OUTDOOR", // Sudah kita pindahkan ke Outdoor
    name: "DISPLAY SYSTEM / STANDING",
    description: "X-Banner, Y-Banner, Roll Up (Hitungan Per Unit).",
    base_price: 75000,
    input_mode: "UNIT",
    min_qty: 1,
    // Kita gunakan Varian Statis dulu agar cepat muncul (tanpa perlu load dari DB)
    variants: [
      { label: "X-Banner", specs: "60x160 | Fiber Black", price: 75000 },
      { label: "Y-Banner", specs: "60x160 | Rangka Besi/Alu", price: 125000 },
      {
        label: "Roll Up Banner",
        specs: "60x160 | Aluminium Putar",
        price: 250000,
      },
      {
        label: "Roll Up Banner 80",
        specs: "80x200 | Aluminium Putar",
        price: 295000,
      },
    ],
    finishing_groups: [
      {
        id: "OPT_DISPLAY_MAT", // Kita pakai ID Standar Baru
        title: "Pilihan Bahan Visual",
        type: "radio",
        required: true,
        options: [
          { label: "Flexi 280gr (Standar)", price: 0 },
          { label: "Albatros + Laminasi (Premium)", price: 25000 },
        ],
      },
    ],
  },
  // --- OUTDOOR (AREA) ---
  {
    id: "PROD_SPANDUK_V2",
    categoryId: "CAT_OUTDOOR",
    name: "CETAK SPANDUK (Outdoor)",
    description: "Spanduk Flexi Outdoor (Hitungan Meter Persegi).",
    base_price: 18000,
    input_mode: "AREA",
    min_qty: 1,
    variants: [], // AKAN DIISI OTOMATIS DARI SUPABASE
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
  // --- ROLLS (LINEAR) ---
  {
    id: "PROD_KAIN_V2",
    categoryId: "CAT_ROLLS",
    name: "CETAK KAIN / TEXTILE",
    description: "Sublimasi Kain (Hitungan Meter Lari).",
    base_price: 65000,
    input_mode: "LINEAR",
    min_qty: 1,
    variants: [], // AKAN DIISI OTOMATIS DARI SUPABASE
    finishing_groups: [
      {
        id: "fin_kain",
        title: "Finishing Jahit (Per Pcs/Meter)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Potong Pas (Free)", price: 0 },
          { label: "Jahit Keliling", price: 15000 },
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
    variants: [], // AKAN DIISI OTOMATIS DARI SUPABASE
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
    variants: [], // AKAN DIISI OTOMATIS DARI SUPABASE
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
];

// ============================================================================
// 2️⃣ ADAPTER: FETCH VARIANTS FROM MATERIALS (NEW)
// Mengambil data real-time dari tabel 'product_materials'
// ============================================================================
async function adaptProductVariantsFromMaterials(productId) {
  const { data, error } = await supabase
    .from("product_materials")
    .select("id, label, price_per_unit, specs, display_order") // ✅ TAMBAH: id
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error)
    throw new Error(
      `Failed to fetch materials for ${productId}: ${error.message}`,
    );
  if (!data || data.length === 0)
    throw new Error(`No materials found for ${productId}`);

  return data.map((m) => ({
    id: m.id, // ✅ TAMBAH: Inject material ID
    label: m.label,
    price: m.price_per_unit,
    specs: m.specs || "",
  }));
}

// ============================================================================
// 3️⃣ ADAPTER: POSTER FROM VIEW (EXISTING)
// ============================================================================
async function fetchPosterProductsFromView() {
  const { data, error } = await supabase
    .from("v_products_legacy_poster")
    .select("*");

  if (error) throw error;
  return data;
}

function adaptPosterProductFromView(row) {
  return {
    id: row.id,
    categoryId: row.category_id, // Mapping Snake -> Camel
    name: row.name,
    description: row.description ?? "",
    base_price: row.base_price ?? 0,
    input_mode: row.input_mode ?? "MATRIX",
    calc_engine: row.calc_engine ?? "MATRIX_FIXED",
    variants: row.variants ?? [],
    finishing_groups: row.finishing_groups ?? [],
    is_active: 1,
    is_archived: 0,
    min_qty: row.min_qty ?? 1,
  };
}

// ============================================================================
// 4️⃣ MAIN EXECUTION (HYBRID SYNC ENGINE)
// ============================================================================
export async function runLargeFormatReconstruction() {
  console.log("🔄 LARGE FORMAT RECONSTRUCTION STARTED (Hybrid Mode)");

  try {
    // A. SYNC CATEGORIES (Wajib ada logic_type agar UI tidak loading terus)
    const categoriesToSync = [
      {
        id: "CAT_OUTDOOR",
        name: "Cetak Outdoor (Area)",
        description: "Spanduk, Banner",
        icon: "🏞️",
        display_order: 1,
        logic_type: "AREA",
      },
      {
        id: "CAT_ROLLS",
        name: "Cetak Roll (Linear)",
        description: "Kain, Stiker, DTF",
        icon: "📏",
        display_order: 2,
        logic_type: "LINEAR",
      },
      {
        id: "CAT_POSTER",
        name: "Poster & Media Cetak",
        description: "Poster A0-A2",
        icon: "🖼️",
        display_order: 3,
        logic_type: "MATRIX",
      },
      {
        id: "MERCH_APPAREL", // ID Kategori Lama (Kita pakai lagi)
        name: "Apparel & Merchandise",
        description: "Jersey, Kaos, Pin, Lanyard",
        icon: "👕", // Ikon Kaos
        display_order: 5,
        logic_type: "UNIT", // Wajib UNIT agar tidak error
      },
      {
        id: "STATIONERY_OFFICE",
        name: "STATIONERY / OFFICE",
        description: "Nota, Kalender, Map, dll",
        icon: "📄",
        display_order: 4,
        logic_type: "UNIT",
      },
    ];

    for (const cat of categoriesToSync) {
      // Backup ke Supabase
      await supabase
        .from("categories")
        .upsert(cat, { onConflict: "id", ignoreDuplicates: false });
      // Masuk ke Dexie (UI) - Pastikan is_active: 1
      await db.categories.put({ ...cat, is_active: 1 });
    }
    console.log("✅ Categories synced");

    // B. PHASE 1: STATIC PRODUCTS + DYNAMIC MATERIAL INJECTION
    console.log(
      "📦 Phase 1: Syncing Static Products with dynamic materials...",
    );

    const PRODUCTS_WITH_MATERIALS = [
      "PROD_SPANDUK_V2",
      "PROD_KAIN_V2",
      "PROD_STIKER_METER_V2",
      "PROD_DTF_V1",
    ];

    for (const product of largeFormatProducts) {
      // Clone agar aman
      let productToSave = { ...product };

      // Inject variants from Supabase product_materials
      if (PRODUCTS_WITH_MATERIALS.includes(product.id)) {
        try {
          const dynamicVariants = await adaptProductVariantsFromMaterials(
            product.id,
          );
          productToSave.variants = dynamicVariants;
          console.log(
            `   ✅ Loaded ${dynamicVariants.length} variants for ${product.id}`,
          );
        } catch (error) {
          console.error(
            `   ❌ Failed to load variants for ${product.id}:`,
            error.message,
          );
          throw error; // Fail hard agar ketahuan
        }
      }

      // Simpan ke Dexie
      await db.products.put({
        ...productToSave,
        is_active: 1,
        is_archived: 0,
      });
    }
    console.log(`   Synced static products.`);

    // C. PHASE 2: POSTER PRODUCTS (FROM VIEW)
    console.log("📦 Phase 2: Fetching Poster products from Supabase view...");
    const posterRows = await fetchPosterProductsFromView();

    if (posterRows && posterRows.length > 0) {
      for (const row of posterRows) {
        const adaptedProduct = adaptPosterProductFromView(row);
        await db.products.put(adaptedProduct);
      }
      console.log(`   Synced ${posterRows.length} poster products.`);
    }

    console.log("✅ SYNC COMPLETE. Refresh your browser!");
  } catch (error) {
    console.error("❌ SYNC ERROR:", error);
    throw error;
  }
}

// ============================================================================
// 5️⃣ WINDOW EXPOSURE
// ============================================================================
if (typeof window !== "undefined") {
  window.runLargeFormatReconstruction = runLargeFormatReconstruction;
  window.db = db; // Penting untuk inspeksi manual
  console.log("✅ window.runLargeFormatReconstruction() is ready");
}
