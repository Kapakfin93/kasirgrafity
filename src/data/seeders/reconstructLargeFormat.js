/**
 * LARGE_FORMAT RECONSTRUCTION SEEDER - SPLIT MODE
 *
 * PURPOSE:
 * Replace all existing LARGE_FORMAT products with 4 Master Products
 * Split into AREA mode (Banner) and LINEAR mode (Sticker/Textile)
 *
 * MASTER PRODUCTS:
 * 1. CETAK SPANDUK (Outdoor) - AREA mode (P x L, Free Finishing)
 * 2. CETAK STIKER (Meteran) - LINEAR mode (Length only, Paid Finishing)
 * 3. CETAK KAIN / TEXTILE - LINEAR mode (Length only, Paid Finishing)
 * 4. CETAK POSTER (Indoor & UV) - AREA mode (P x L, Free Finishing)
 */

import db from "../db/schema.js";

const MASTER_PRODUCTS = [
  // 1. MASTER SPANDUK (Outdoor) - AREA MODE
  {
    id: "master_spanduk_outdoor",
    categoryId: "LARGE_FORMAT",
    name: "CETAK SPANDUK (Outdoor)",
    description: "Spanduk Flexi untuk kebutuhan outdoor, tahan air dan panas.",
    base_price: 18000, // Price per m²
    input_mode: "AREA", // ✅ Length x Width inputs, Ceiling rounding
    min_qty: 1,
    variants: [
      {
        label: "Flexi 280gr Standard",
        price: 18000,
        specs: "Bahan standar spanduk",
      },
      {
        label: "Flexi Korea 440gr",
        price: 45000,
        specs: "Lebih tebal & halus",
      },
      {
        label: "Flexi Backlite (Neonbox)",
        price: 65000,
        specs: "Tembus cahaya",
      },
      { label: "Banner Jerman", price: 85000, specs: "Premium quality" },
    ],
    finishing_groups: [
      {
        id: "fin_spanduk",
        title: "Finishing (Free for Banner)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Mata Ayam (Cincin)", price: 0 }, // FREE for AREA
          { label: "Selongsong (Kantong)", price: 0 },
          { label: "Lipat Pres (Polos)", price: 0 },
          { label: "Tanpa Finishing", price: 0 },
        ],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 2. MASTER STIKER (Meteran) - LINEAR MODE
  {
    id: "master_stiker_meteran",
    categoryId: "LARGE_FORMAT",
    name: "CETAK STIKER (Meteran)",
    description: "Stiker vinyl / transparan (Meter Lari).",
    base_price: 75000, // Price per linear meter
    input_mode: "LINEAR", // ✅ Length only, Width is FIXED from variant
    min_qty: 1,
    variants: [
      {
        label: "Vinyl Ritrama (L: 100cm)",
        price: 75000,
        width: 1.0,
        specs: "Lebar bahan 100cm (fixed)",
      },
      {
        label: "Vinyl Ritrama (L: 120cm)",
        price: 90000,
        width: 1.2,
        specs: "Lebar bahan 120cm (fixed)",
      },
      {
        label: "Transparan (L: 100cm)",
        price: 80000,
        width: 1.0,
        specs: "Tembus pandang, lebar 100cm",
      },
      {
        label: "One Way Vision (L: 120cm)",
        price: 95000,
        width: 1.2,
        specs: "Kaca mobil, lebar 120cm",
      },
    ],
    finishing_groups: [
      {
        id: "fin_stiker_lam",
        title: "Laminasi (Per Meter Lari)",
        type: "radio",
        price_mode: "PER_METER", // Price multiplies by Length
        options: [
          { label: "Tanpa Laminasi", price: 0 },
          { label: "Laminasi Glossy", price: 15000 }, // PAID: 15k/m
          { label: "Laminasi Doff", price: 15000 },
        ],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 3. MASTER KAIN (Textile) - LINEAR MODE
  {
    id: "master_kain_textile",
    categoryId: "LARGE_FORMAT",
    name: "CETAK KAIN / TEXTILE",
    description: "Cetak kain untuk bendera, umbul-umbul, atau dekorasi.",
    base_price: 65000, // Price per linear meter
    input_mode: "LINEAR", // ✅ Length only, Width is FIXED from variant
    min_qty: 1,
    variants: [
      {
        label: "Kain TC Import (L: 90cm)",
        price: 65000,
        width: 0.9,
        specs: "Lebar bahan 90cm (fixed)",
      },
      {
        label: "Kain TC Import (L: 120cm)",
        price: 85000,
        width: 1.2,
        specs: "Lebar bahan 120cm (fixed)",
      },
      {
        label: "Satin (L: 100cm)",
        price: 75000,
        width: 1.0,
        specs: "Mengkilap, lebar 100cm",
      },
      {
        label: "Kain Parasut (L: 120cm)",
        price: 60000,
        width: 1.2,
        specs: "Tahan air ringan, lebar 120cm",
      },
    ],
    finishing_groups: [
      {
        id: "fin_kain_jahit",
        title: "Finishing Jahit (Per Meter Lari)",
        type: "radio",
        price_mode: "PER_METER", // Price multiplies by Length
        options: [
          { label: "Potong Pas (Free)", price: 0 },
          { label: "Jahit Keliling", price: 5000 }, // PAID: 5k/m
          { label: "Tali + Jahit", price: 7000 },
        ],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },

  // 4. MASTER POSTER (Indoor & UV) - AREA MODE
  {
    id: "master_poster_area",
    categoryId: "LARGE_FORMAT",
    name: "CETAK POSTER (Indoor & UV)",
    description: "Kertas poster lebar besar (Albatros/Luster).",
    base_price: 85000, // Price per m²
    input_mode: "AREA", // ✅ Length x Width inputs, Ceiling rounding
    min_qty: 1,
    variants: [
      {
        label: "Albatros (Matte)",
        price: 85000,
        specs: "Halus seperti kertas foto",
      },
      {
        label: "Luster (Kulit Jeruk)",
        price: 95000,
        specs: "Tekstur kasar premium",
      },
      {
        label: "Duratrans (Backlite Film)",
        price: 125000,
        specs: "Untuk Neonbox Indoor",
      },
    ],
    finishing_groups: [
      {
        id: "fin_poster",
        title: "Laminasi (Free for Poster)",
        type: "radio",
        price_mode: "FIXED",
        options: [
          { label: "Tanpa Laminasi", price: 0 },
          { label: "Laminasi Glossy", price: 0 }, // FREE for AREA mode
          { label: "Laminasi Doff", price: 0 },
        ],
      },
    ],
    is_active: 1,
    is_archived: 0,
  },
];

export async function runLargeFormatReconstruction() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  🏗️  LARGE_FORMAT RECONSTRUCTION (SPLIT MODE)        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  try {
    // STEP 1: Delete ALL existing LARGE_FORMAT products
    console.log("🗑️  STEP 1: Deleting old LARGE_FORMAT products...");

    const oldProducts = await db.products
      .where("categoryId")
      .equals("LARGE_FORMAT")
      .toArray();

    console.log(`   Found ${oldProducts.length} products to delete`);

    for (const product of oldProducts) {
      await db.products.delete(product.id);
      console.log(`   ❌ Deleted: ${product.name} (${product.id})`);
    }

    // EXPLICITLY DELETE THE OLD PILOT PRODUCT (if exists)
    try {
      await db.products.delete("stiker_meteran_gen2");
      console.log(`   🗑️  Deleted old pilot product: stiker_meteran_gen2`);
    } catch (err) {
      // Ignore if doesn't exist
    }

    console.log(`   ✅ Deleted ${oldProducts.length} old products\n`);

    // STEP 2: Seed 4 Master Products (SPLIT MODE)
    console.log("📦 STEP 2: Seeding Master Products (SPLIT MODE)...\n");

    for (const masterProduct of MASTER_PRODUCTS) {
      try {
        await db.products.add(masterProduct);
        console.log(`   ✅ Seeded: ${masterProduct.name}`);
        console.log(
          `      Input Mode: ${masterProduct.input_mode} ${
            masterProduct.input_mode === "LINEAR"
              ? "(Length Only, Fixed Width)"
              : "(Length x Width, Ceiling)"
          }`
        );
        console.log(
          `      Base Price: Rp ${masterProduct.base_price.toLocaleString()}/${
            masterProduct.input_mode === "LINEAR" ? "m" : "m²"
          }`
        );
        console.log(`      Variants: ${masterProduct.variants.length}`);
        console.log(
          `      Finishing: ${
            masterProduct.input_mode === "AREA" ? "FREE" : "PAID"
          }`
        );
      } catch (err) {
        console.error(
          `   ❌ Failed to seed ${masterProduct.name}:`,
          err.message
        );
      }
    }

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  ✅ RECONSTRUCTION COMPLETE (SPLIT MODE READY)        ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    console.log("📊 SUMMARY:");
    console.log(`   🗑️  Old products deleted: ${oldProducts.length}`);
    console.log(`   ✅ New masters seeded: ${MASTER_PRODUCTS.length}`);
    console.log(`   📐 AREA Mode (2): Spanduk, Poster (P×L, Free Finishing)`);
    console.log(
      `   📏 LINEAR Mode (2): Stiker, Kain (Length Only, Paid Finishing)`
    );
    console.log("\n💡 NEXT STEPS:");
    console.log("   1. Refresh the page");
    console.log("   2. Test Spanduk → Should show P×L inputs, FREE finishing");
    console.log(
      "   3. Test Stiker → Should show Length input, LOCKED width, PAID finishing"
    );
    console.log(
      "   4. Test ceiling rounding on AREA (1.5 x 1.5 = 2.25 → 3m²)\n"
    );

    return {
      deleted: oldProducts.length,
      seeded: MASTER_PRODUCTS.length,
      area: 2,
      linear: 2,
    };
  } catch (error) {
    console.error("\n❌ RECONSTRUCTION FAILED:", error);
    console.error(error.stack);
    return { error: error.message };
  }
}

// Export for browser console
if (typeof window !== "undefined") {
  window.runLargeFormatReconstruction = runLargeFormatReconstruction;
}
