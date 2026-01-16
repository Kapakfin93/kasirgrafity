/**
 * REFACTORED LARGE FORMAT RECONSTRUCTION SEEDER
 *
 * PURPOSE:
 * Delete old LARGE_FORMAT category products and seed 5 new products
 * across 3 specialized categories:
 * - CAT_OUTDOOR (AREA mode)
 * - CAT_ROLLS (LINEAR mode)
 * - CAT_POSTER (MATRIX mode)
 */

import db from "../db/schema.js";
import { largeFormatProducts } from "./largeFormat.js";

export async function runLargeFormatReconstruction() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║  🏗️  LARGE FORMAT RECONSTRUCTION (3-CATEGORY SPLIT)         ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n"
  );

  try {
    // STEP 1: NUCLEAR CLEANUP - Delete ALL old LARGE_FORMAT products
    console.log("🗑️  STEP 1: Nuclear Cleanup (Old LARGE_FORMAT category)...");

    const oldProducts = await db.products
      .where("categoryId")
      .equals("LARGE_FORMAT")
      .toArray();

    console.log(`   Found ${oldProducts.length} old products to delete`);

    for (const product of oldProducts) {
      await db.products.delete(product.id);
      console.log(`   ❌ Deleted: ${product.name} (${product.id})`);
    }

    // Delete zombie master products left from previous seedings
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
    ];

    for (const zombieId of zombieIds) {
      try {
        await db.products.delete(zombieId);
        console.log(`   🧟 Deleted zombie: ${zombieId}`);
      } catch (err) {
        // Ignore if doesn't exist
      }
    }

    console.log(
      `   ✅ Cleanup complete: ${oldProducts.length} old products deleted\n`
    );

    // STEP 2: Seed 5 New Master Products across 3 categories
    console.log(
      "📦 STEP 2: Seeding 5 Master Products to 3 New Categories...\n"
    );

    let seededCount = 0;
    let outdoorCount = 0;
    let rollsCount = 0;
    let posterCount = 0;

    for (const product of largeFormatProducts) {
      try {
        await db.products.add(product);
        seededCount++;

        // Count by category
        if (product.categoryId === "CAT_OUTDOOR") outdoorCount++;
        else if (product.categoryId === "CAT_ROLLS") rollsCount++;
        else if (product.categoryId === "CAT_POSTER") posterCount++;

        console.log(`   ✅ Seeded: ${product.name}`);
        console.log(`      Category: ${product.categoryId}`);
        console.log(`      Mode: ${product.input_mode}`);
        console.log(
          `      Base Price: Rp ${product.base_price.toLocaleString()}`
        );
      } catch (err) {
        console.error(`   ❌ Failed to seed ${product.name}:`, err.message);
      }
    }

    console.log(
      "\n╔═══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║  ✅ RECONSTRUCTION COMPLETE (3-CATEGORY ARCHITECTURE)        ║"
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════╝\n"
    );

    console.log("📊 SUMMARY:");
    console.log(
      `   🗑️  Old LARGE_FORMAT products deleted: ${oldProducts.length}`
    );
    console.log(`   ✅ New products seeded: ${seededCount}`);
    console.log(`   📦 Distribution:`);
    console.log(`      🏔️  CAT_OUTDOOR (AREA): ${outdoorCount} products`);
    console.log(`      📏 CAT_ROLLS (LINEAR): ${rollsCount} products`);
    console.log(`      🖼️  CAT_POSTER (MATRIX): ${posterCount} products`);

    console.log("\n💡 NEXT STEPS:");
    console.log("   1. Refresh the page");
    console.log("   2. Verify 3 new categories appear in POS");
    console.log("   3. Test AREA mode (Spanduk - P×L inputs)");
    console.log("   4. Test LINEAR mode (Stiker, Kain, DTF - locked width)");
    console.log("   5. Test MATRIX mode (Poster - size selection)\n");

    return {
      deleted: oldProducts.length,
      seeded: seededCount,
      categories: {
        outdoor: outdoorCount,
        rolls: rollsCount,
        poster: posterCount,
      },
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
