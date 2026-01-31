/**
 * LARGE FORMAT RECONSTRUCTION - 3-PILLAR INFRASTRUCTURE MIGRATION
 *
 * This script creates 3 new specialized categories and migrates products:
 * 1. CAT_OUTDOOR (AREA mode) - Spanduk, Banner
 * 2. CAT_ROLLS (LINEAR mode) - Textile, Stiker, DTF
 * 3. CAT_POSTER (MATRIX mode) - Poster
 */

import db from "../db/schema.js";
import { largeFormatProducts } from "./largeFormat.js";

export async function runLargeFormatReconstruction() {
  console.log(
    "%c🏗️ STARTING 3-PILLAR INFRASTRUCTURE MIGRATION...",
    "color: cyan; font-weight: bold;",
  );

  try {
    // --- STEP 1: DEFINE NEW CATEGORIES (The 3 Pillars) ---
    const newCategories = [
      {
        id: "CAT_OUTDOOR",
        name: "Outdoor Print",
        description: "Spanduk, Baliho & Banner",
        logic_type: "AREA",
        icon: "Mountain",
        color: "emerald",
        sort_order: 1,
        is_active: 1,
      },
      {
        id: "CAT_ROLLS",
        name: "Textile, Stiker & DTF",
        description: "Bahan Roll (Meter Lari)",
        logic_type: "LINEAR",
        icon: "Scroll",
        color: "cyan",
        sort_order: 2,
        is_active: 1,
      },
      {
        id: "CAT_POSTER",
        name: "Poster & Indoor",
        description: "Poster Kertas A0-A2",
        logic_type: "MATRIX",
        icon: "Image",
        color: "purple",
        sort_order: 3,
        is_active: 1,
      },
    ];

    console.log("📁 STEP 1: Establishing 3-Pillar Category Infrastructure...");

    // Upsert Categories (put will update if exists, insert if not)
    for (const cat of newCategories) {
      await db.categories.put(cat);
      console.log(`  ✅ [INFRA] Category Established: ${cat.name} (${cat.id})`);
    }

    // --- STEP 2: DEMOLISH OLD STRUCTURE ---
    console.log("\n💥 STEP 2: Demolishing Legacy Infrastructure...");

    // Remove the legacy 'LARGE_FORMAT' category
    try {
      await db.categories.delete("LARGE_FORMAT");
      console.log("  🗑️  [DEMOLITION] Legacy LARGE_FORMAT category removed.");
    } catch (err) {
      console.log(
        "  ℹ️  Legacy LARGE_FORMAT category not found (already removed).",
      );
    }

    // Remove all products linked to legacy category
    const deletedCount = await db.products
      .where("categoryId")
      .equals("LARGE_FORMAT")
      .delete();
    console.log(`  🗑️  [DEMOLITION] Removed ${deletedCount} legacy products.`);

    // Remove zombie products from previous failed migrations
    const zombieIds = [
      "master_spanduk_outdoor",
      "master_stiker_meteran",
      "master_kain_textile",
      "master_poster_area",
      "stiker_meteran_gen2",
      "LF_SPANDUK",
      "LF_POSTER",
      "LF_POSTER_FIX",
      "LF_STIKER_METER",
      "LF_KAIN",
      "PROD_SPANDUK_V2",
      "PROD_KAIN_V2",
      "PROD_STIKER_METER_V2",
      "PROD_DTF_V1",
      "PROD_POSTER_V2",
    ];

    let zombieCount = 0;
    for (const zombieId of zombieIds) {
      try {
        await db.products.delete(zombieId);
        zombieCount++;
      } catch (err) {
        // Ignore if doesn't exist
      }
    }
    console.log(
      `  🧟 [CLEANUP] Removed ${zombieCount} zombie products from failed migrations.`,
    );

    // --- STEP 3: SEED NEW PRODUCTS ---
    console.log("\n📦 STEP 3: Seeding New Products into 3-Pillar Structure...");

    // Ensure products map to the new Category IDs defined in STEP 1
    const validCats = ["CAT_OUTDOOR", "CAT_ROLLS", "CAT_POSTER"];
    let seededCount = 0;
    let skippedCount = 0;

    for (const product of largeFormatProducts) {
      // Safety check: Ensure the product belongs to one of our new categories
      if (!validCats.includes(product.categoryId)) {
        console.warn(
          `  ⚠️  [SKIP] Product ${product.name} has invalid CategoryID: ${product.categoryId}`,
        );
        skippedCount++;
        continue;
      }

      await db.products.put(product);
      console.log(`  ✅ [SEED] ${product.name} → ${product.categoryId}`);
      seededCount++;
    }

    console.log(`\n  📊 Seeding Summary:`);
    console.log(`     ✅ Successfully seeded: ${seededCount} products`);
    console.log(`     ⚠️  Skipped (invalid): ${skippedCount} products`);

    // --- STEP 4: VERIFICATION ---
    console.log("\n🔍 STEP 4: Verification...");

    const outdoorCount = await db.products
      .where("categoryId")
      .equals("CAT_OUTDOOR")
      .count();
    const rollsCount = await db.products
      .where("categoryId")
      .equals("CAT_ROLLS")
      .count();
    const posterCount = await db.products
      .where("categoryId")
      .equals("CAT_POSTER")
      .count();

    console.log(`  📊 Product Distribution:`);
    console.log(`     🏔️  CAT_OUTDOOR: ${outdoorCount} products`);
    console.log(`     📏 CAT_ROLLS: ${rollsCount} products`);
    console.log(`     🖼️  CAT_POSTER: ${posterCount} products`);

    console.log(
      "\n╔═══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  ✅ 3-PILLAR INFRASTRUCTURE MIGRATION COMPLETE!              ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════╝\n",
    );

    console.log("💡 NEXT STEPS:");
    console.log("   1. Refresh the page (F5)");
    console.log("   2. Navigate to POS page");
    console.log("   3. Verify 3 new category tabs appear");
    console.log("   4. Test LINEAR mode on Stiker/Kain/DTF (locked width)");
    console.log(
      "   5. Test MATRIX mode on Poster (size + material selection)\n",
    );

    return {
      success: true,
      categoriesCreated: newCategories.length,
      productsSeeded: seededCount,
      productsSkipped: skippedCount,
      distribution: {
        outdoor: outdoorCount,
        rolls: rollsCount,
        poster: posterCount,
      },
    };
  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export for browser console
if (typeof window !== "undefined") {
  window.runLargeFormatReconstruction = runLargeFormatReconstruction;
}
