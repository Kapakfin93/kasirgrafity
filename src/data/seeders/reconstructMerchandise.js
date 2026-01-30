/**
 * MERCHANDISE RECONSTRUCTION (GEN 4.1 FINAL MATCH)
 * Status: FULL DYNAMIC (Varian & Finishing dari Supabase)
 * Fix: ID disamakan persis dengan Database Existing (PROD_MERCH_...)
 */

import { supabase } from "../../services/supabaseClient.js";
import db from "../db/schema.js";

// ============================================================================
// 1️⃣ ADAPTER LOGIC (FETCH DARI SUPABASE)
// ============================================================================

// A. Ambil Varian (Bahan/Ukuran)
async function adaptProductVariantsFromMaterials(productId) {
  const { data, error } = await supabase
    .from("product_materials")
    .select("id, label, price_per_unit, specs, display_order")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) return [];
  if (!data) return [];

  return data.map((m) => ({
    id: m.id,
    label: m.label,
    price: m.price_per_unit,
    specs: m.specs || "",
  }));
}

// B. Ambil Finishing (Opsi Tambahan)
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
// 2️⃣ STATIC RESERVOIR (ID SESUAI FAKTA DATABASE)
// ============================================================================

const MERCH_PRODUCTS = [
  // A. JERSEY (ID: master_jersey_printing) - SUDAH BENAR
  {
    id: "master_jersey_printing",
    categoryId: "MERCH_APPAREL",
    name: "JERSEY FUTSAL / BOLA (Printing)",
    description: "Jersey Custom Printing.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 150000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // B. KAOS CUSTOM (ID: PROD_MERCH_KAOS) - FIX DARI IMAGE
  {
    id: "PROD_MERCH_KAOS",
    categoryId: "MERCH_APPAREL",
    name: "KAOS CUSTOM (Sablon DTF)",
    description: "Kaos Sablon DTF.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 85000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // C. LANYARD (ID: PROD_MERCH_LANYARD) - FIX DARI IMAGE
  {
    id: "PROD_MERCH_LANYARD",
    categoryId: "MERCH_APPAREL",
    name: "LANYARD TALI ID CARD",
    description: "Lanyard Printing Tissue/Polyester.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 25000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // D. PIN & GANTUNGAN (ID: PROD_MERCH_PIN) - FIX DARI IMAGE
  {
    id: "PROD_MERCH_PIN",
    categoryId: "MERCH_APPAREL",
    name: "PIN & GANTUNGAN KUNCI (Bulat)",
    description: "Pin Peniti / Ganci Buka Botol.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 5000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // E. ID CARD PVC (ID: PROD_MERCH_IDCARD) - FIX DARI IMAGE
  {
    id: "PROD_MERCH_IDCARD",
    categoryId: "MERCH_APPAREL",
    name: "CETAK ID CARD (PVC)",
    description: "ID Card bahan PVC ATM.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 10000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // F. MUG CUSTOM (ID: PROD_MERCH_MUG) - FIX DARI IMAGE
  {
    id: "PROD_MERCH_MUG",
    categoryId: "MERCH_APPAREL",
    name: "MUG KERAMIK CUSTOM",
    description: "Mug Keramik Standard SNI.",
    input_mode: "UNIT",
    calc_engine: "UNIT",
    base_price: 25000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },

  // G. GANTUNGAN KUNCI AKRILIK (ID: master_ganci_akrilik) - SUDAH BENAR (BARU)
  {
    id: "master_ganci_akrilik",
    categoryId: "MERCH_APPAREL",
    name: "GANTUNGAN KUNCI AKRILIK (Custom)",
    description: "Ganci Akrilik Potong sesuai Pola.",
    input_mode: "UNIT",
    calc_engine: "TIERED",
    base_price: 15000,
    min_qty: 1,
    variants: [],
    finishing_groups: [],
  },
];

// ============================================================================
// 3️⃣ MAIN EXECUTION
// ============================================================================

export async function runMerchReconstruction() {
  console.log("👕 MERCHANDISE RECONSTRUCTION STARTED (Fix Match ID)");

  try {
    // A. BERSIHKAN DATA LAMA
    console.log("🧹 Cleaning up old MERCH_APPAREL products...");
    const oldProducts = await db.products
      .where("categoryId")
      .equals("MERCH_APPAREL")
      .toArray();
    for (const p of oldProducts) {
      await db.products.delete(p.id);
    }

    // B. LOOP & SYNC
    for (const product of MERCH_PRODUCTS) {
      let productToSave = { ...product };

      // 1. Ambil Varian dari Supabase
      const variants = await adaptProductVariantsFromMaterials(product.id);
      productToSave.variants = variants;

      // 2. Ambil Finishing dari Supabase
      const finishings = await adaptFinishingsFromOptions(product.id);
      productToSave.finishing_groups =
        finishings.length > 0 ? finishings : undefined;

      // 3. Simpan ke Dexie Lokal
      await db.products.put({
        ...productToSave,
        is_active: 1,
        is_archived: 0,
      });

      console.log(
        `   ✅ Seeded: ${product.name} (ID: ${product.id}) -> Vars: ${variants.length}, Fin: ${finishings.length}`,
      );
    }

    console.log("✅ MERCHANDISE RECONSTRUCTION COMPLETE");
  } catch (error) {
    console.error("❌ MERCHANDISE RECONSTRUCTION ERROR:", error);
    throw error;
  }
}

// Global Expose
if (typeof window !== "undefined") {
  window.runMerchReconstruction = runMerchReconstruction;
  console.log("✅ window.runMerchReconstruction() ready");
}
