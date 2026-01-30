/**
 * STATIONERY_OFFICE RECONSTRUCTION (GEN 3.5 FINAL CLEAN)
 * Merged Adapter & Seeder Logic
 * STATUS: PURE DYNAMIC MODE (Except Nota NCR Hybrid)
 */

import { supabase } from "../../services/supabaseClient.js";
import db from "../db/schema.js";

// ============================================================================
// 1. ADAPTER LOGIC (Jembatan ke Supabase)
// ============================================================================

async function adaptStationeryVariantsFromMaterials(productId) {
  const { data, error } = await supabase
    .from("product_materials")
    .select("id, label, price_per_unit, specs, display_order")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error(`No materials found`);

  return data.map((m) => ({
    id: m.id,
    label: m.label,
    price: m.price_per_unit,
    specs: m.specs || "",
  }));
}

async function adaptFinishingsFromOptions(productId) {
  const { data, error } = await supabase
    .from("finishing_options")
    .select(
      "finishing_id, group_key, group_title, type, is_required, label, price, display_order",
    )
    .eq("product_id", productId)
    .order("group_key", { ascending: true })
    .order("display_order", { ascending: true });

  if (error || !data) return [];

  const grouped = {};
  for (const row of data) {
    if (!grouped[row.group_key]) {
      grouped[row.group_key] = {
        id: row.finishing_id,
        title: row.group_title,
        type: row.type,
        required: row.is_required,
        options: [],
      };
    }
    grouped[row.group_key].options.push({ label: row.label, price: row.price });
  }
  return Object.values(grouped);
}

// ============================================================================
// 2. MAIN SYNC FUNCTION (CORE LOGIC)
// ============================================================================

export async function runStationeryOfficeReconstruction() {
  console.log("📚 STATIONERY_OFFICE SYNC STARTED (Dynamic Mode)");

  try {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, category_id, input_mode, calc_engine")
      .eq("category_id", "STATIONERY_OFFICE")
      .eq("is_active", true);

    if (productsError || !products) return;

    for (const product of products) {
      let variants = [];

      // DETEKSI APAKAH INI NOTA (HYBRID)
      const isHybridNota = product.id.startsWith("master_nota_");

      // 1. Ambil Varian (Hanya jika BUKAN Nota)
      // Nota pakai data hardcode di seeder, jadi jangan ditimpa data kosong dari Supabase
      if (!isHybridNota) {
        try {
          variants = await adaptStationeryVariantsFromMaterials(product.id);
        } catch (e) {
          /* Silent fail if no materials found */
        }
      }

      // 2. Ambil Finishing (Semua Produk ambil dari Supabase)
      const finishingGroups = await adaptFinishingsFromOptions(product.id);

      // 3. Susun Data Update
      const productToSave = {
        id: product.id,
        categoryId: product.category_id,
        name: product.name,
        input_mode: product.input_mode,
        calc_engine: product.calc_engine,
        finishing_groups:
          finishingGroups.length > 0 ? finishingGroups : undefined,
        is_active: 1,
        is_archived: 0,
      };

      // 🛡️ GUARD CLAUSE PENTING:
      // Jika BUKAN Nota, kita update kolom variants dengan data Supabase.
      // Jika Nota, kita JANGAN update kolom variants (biarkan data lokal yang menang).
      if (!isHybridNota) {
        productToSave.variants = variants.length > 0 ? variants : undefined;
      }

      await db.products.update(product.id, productToSave);
      console.log(`   ✅ Synced ${product.name}`);
    }
    console.log("✅ STATIONERY SYNC COMPLETE");
  } catch (error) {
    console.error("❌ STATIONERY SYNC ERROR:", error);
  }
}

// ============================================================================
// 3. SEEDER DEFINITION (Struktur Dasar)
// PENTING: Variants DIKOSONGKAN [] agar tidak double dengan Supabase
// KECUALI NOTA (Isi Variants, Kosongkan Finishing)
// ============================================================================

const OFFICE_PRODUCTS = [
  // ============================================================
  // PECAHAN NOTA NCR (4 CARD TERPISAH) - HYBRID MODE
  // ============================================================

  // 1. NOTA 1 PLY
  {
    id: "master_nota_1ply",
    categoryId: "STATIONERY_OFFICE",
    name: "CETAK NOTA 1 PLY (Putih)",
    input_mode: "MATRIX",
    calc_engine: "MATRIX_FIXED",
    base_price: 15000,
    variants: [
      {
        id: "var_nota_1ply_std",
        label: "NCR 1 Ply (Putih)",
        specs: "HVS Tanpa Rangkap",
        price_list: {
          FOLIO_1_4: 15000, // 1/4 Folio (10x16)
          FOLIO_1_3: 20000, // 1/3 Folio (10x21)
          FOLIO_1_2: 30000, // 1/2 Folio (16x21)
          FOLIO_1_1: 60000, // 1 Folio (21x33)
        },
      },
    ],
    finishing_groups: [], // Kosong (Ambil dari Supabase)
    is_active: 1,
    is_archived: 0,
  },

  // 2. NOTA 2 PLY
  {
    id: "master_nota_2ply",
    categoryId: "STATIONERY_OFFICE",
    name: "CETAK NOTA 2 PLY (Rangkap)",
    input_mode: "MATRIX",
    calc_engine: "MATRIX_FIXED",
    base_price: 25000,
    variants: [
      {
        id: "var_nota_2ply_std",
        label: "NCR 2 Ply (2 Warna)",
        specs: "Top Putih + Bot Merah/Kuning",
        price_list: {
          FOLIO_1_4: 25000, // 1/4 Folio (10x16)
          FOLIO_1_3: 33000, // 1/3 Folio (10x21)
          FOLIO_1_2: 50000, // 1/2 Folio (16x21)
          FOLIO_1_1: 100000, // 1 Folio (21x33)
        },
      },
    ],
    finishing_groups: [],
    is_active: 1,
    is_archived: 0,
  },

  // 3. NOTA 3 PLY
  {
    id: "master_nota_3ply",
    categoryId: "STATIONERY_OFFICE",
    name: "CETAK NOTA 3 PLY (Rangkap)",
    input_mode: "MATRIX",
    calc_engine: "MATRIX_FIXED",
    base_price: 37500,
    variants: [
      {
        id: "var_nota_3ply_std",
        label: "NCR 3 Ply (3 Warna)",
        specs: "Putih + Merah + Kuning",
        price_list: {
          FOLIO_1_4: 37500, // 1/4 Folio (10x16)
          FOLIO_1_3: 50000, // 1/3 Folio (10x21)
          FOLIO_1_2: 75000, // 1/2 Folio (16x21)
          FOLIO_1_1: 150000, // 1 Folio (21x33)
        },
      },
    ],
    finishing_groups: [],
    is_active: 1,
    is_archived: 0,
  },

  // 4. NOTA 4 PLY
  {
    id: "master_nota_4ply",
    categoryId: "STATIONERY_OFFICE",
    name: "CETAK NOTA 4 PLY (Rangkap)",
    input_mode: "MATRIX",
    calc_engine: "MATRIX_FIXED",
    base_price: 50000,
    variants: [
      {
        id: "var_nota_4ply_std",
        label: "NCR 4 Ply (4 Warna)",
        specs: "Lengkap (Wh/Red/Yel/Blu)",
        price_list: {
          FOLIO_1_4: 50000, // 1/4 Folio (10x16)
          FOLIO_1_3: 66000, // 1/3 Folio (10x21)
          FOLIO_1_2: 100000, // 1/2 Folio (16x21)
          FOLIO_1_1: 200000, // 1 Folio (21x33)
        },
      },
    ],
    finishing_groups: [],
    is_active: 1,
    is_archived: 0,
  },

  // ============================================================
  // DYNAMIC PRODUCTS (VARIAN KOSONG - AMBIL DARI SUPABASE)
  // ============================================================

  // 5. KALENDER MEJA (Dudukan)
  {
    id: "master_kalender_custom",
    categoryId: "STATIONERY_OFFICE",
    name: "KALENDER MEJA (Dudukan)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 25000,
    min_qty: 1,
    advanced_features: {
      wholesale_rules: [
        { min: 1, max: 49, price: 25000 },
        { min: 50, max: 99, price: 23000 },
        { min: 100, max: 1000, price: 21000 },
      ],
    },
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },

  // 6. KALENDER DINDING (Klem/Spiral)
  {
    id: "master_kalender_dinding",
    categoryId: "STATIONERY_OFFICE",
    name: "KALENDER DINDING (Klem/Spiral)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 5000,
    min_qty: 1,
    advanced_features: {
      wholesale_rules: [
        { min: 1, max: 49, price: 5000 },
        { min: 50, max: 99, price: 4500 },
        { min: 100, max: 1000, price: 4000 },
      ],
    },
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },

  // 7. MAP IJAZAH
  {
    id: "master_map_ijazah",
    categoryId: "STATIONERY_OFFICE",
    name: "MAP IJAZAH / RAPORT",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 15000,
    min_qty: 1,
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },

  // 8. BUKU YASIN
  {
    id: "master_buku_yasin",
    categoryId: "STATIONERY_OFFICE",
    name: "BUKU YASIN & TAHLIL",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 15000,
    min_qty: 30,
    advanced_features: {
      wholesale_rules: [
        { min: 30, max: 99, price: 15000 },
        { min: 100, max: 1000, price: 14000 },
      ],
    },
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },

  // 9. KOP SURAT
  {
    id: "master_kop_surat",
    categoryId: "STATIONERY_OFFICE",
    name: "CETAK KOP SURAT (Per Rim)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 150000,
    min_qty: 1,
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },

  // 10. STEMPEL FLASH
  {
    id: "master_stempel_flash",
    categoryId: "STATIONERY_OFFICE",
    name: "STEMPEL FLASH (Otomatis)",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 55000,
    min_qty: 1,
    variants: [],
    finishing_groups: [], // Ambil dari Supabase
    is_active: 1,
    is_archived: 0,
  },
];

// ============================================================================
// 4. EXPORTED FUNCTION (Pemicu Utama)
// ============================================================================

export async function runOfficeReconstruction() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  📚 STATIONERY RECONSTRUCTION (GEN 3.5 CLEAN)        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  try {
    // A. Seed Structure (Memasukkan Kerangka Hybrid Nota)
    console.log(`📦 Seeding Product Structure...`);
    for (const masterProduct of OFFICE_PRODUCTS) {
      await db.products.put(masterProduct);
    }

    // B. Trigger Dynamic Sync (Isi Data Supabase & Jaga Data Hybrid)
    console.log("🚀 Triggering Supabase Sync...");
    await runStationeryOfficeReconstruction();

    console.log("\n✅ OFFICE RECONSTRUCTION COMPLETE");
    return { success: true };
  } catch (error) {
    console.error("\n❌ FAILED:", error);
    return { error: error.message };
  }
}

// Global expose agar bisa dipanggil di main.jsx
if (typeof window !== "undefined") {
  window.runOfficeReconstruction = runOfficeReconstruction;
  console.log("✅ window.runOfficeReconstruction() ready");
}
