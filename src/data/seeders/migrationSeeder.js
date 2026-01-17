/**
 * Migration Seeder - The Great Consolidation
 * Reorganizes 13 legacy categories into 4 main pillars
 * Handles duplicate products and archives obsolete data
 */

import db from "../db/schema.js";
import { seedMasterData } from "../db/seedMasterData.js";

// === PHASE 2: NEW PILLAR CATEGORIES ===
// REFACTORED: Split Large Format into 3 specialized categories
const NEW_PILLARS = [
  {
    id: "CAT_OUTDOOR",
    name: "Outdoor Print",
    description: "Spanduk, Baliho & Banner",
    icon: "Mountain",
    color: "emerald",
    logic_type: "AREA",
    sort_order: 1,
    is_active: 1,
  },
  {
    id: "CAT_ROLLS",
    name: "Textile, Stiker & DTF",
    description: "Bahan Roll (Meter Lari)",
    icon: "Scroll",
    color: "cyan",
    logic_type: "LINEAR",
    sort_order: 2,
    is_active: 1,
  },
  {
    id: "CAT_POSTER",
    name: "POSTER UV & INDOOR", // UPDATED: User's preferred name
    description: "Poster Kertas A0-A2",
    icon: "Image",
    color: "purple",
    logic_type: "MATRIX",
    sort_order: 3,
    is_active: 1,
  },
  {
    id: "DIGITAL_A3_PRO",
    name: "Digital A3+ & Print Doc",
    logic_type: "SHEET",
    sort_order: 4,
    is_active: 1,
  },
  {
    id: "STATIONERY_OFFICE",
    name: "Office, Books & Calendars",
    logic_type: "TIERED",
    sort_order: 5,
    is_active: 1,
  },
  {
    id: "MERCH_APPAREL",
    name: "Merchandise & Apparel",
    logic_type: "UNIT",
    sort_order: 6,
    is_active: 1,
  },
  {
    id: "CUSTOM_SERVICES",
    name: "Custom & Services",
    description: "Item Manual & Jasa",
    icon: "Settings",
    color: "slate",
    logic_type: "MANUAL",
    sort_order: 7,
    is_active: 1,
  },
];

// === DUPLICATE PRODUCTS TO ARCHIVE (Legacy OFFICE Simple Versions) ===
const LEGACY_OFFICE_PRODUCTS = [
  "o1",
  "o2",
  "o3",
  "o4", // Stempel, Nota NCR (simple)
  "c1",
  "c2", // Kalender (simple)
];

/**
 * STEP A: Create New Pillar Categories
 */
async function createPillarCategories() {
  console.log("📁 STEP A: Creating/Updating Pillar Categories...");

  const results = [];

  for (const pillar of NEW_PILLARS) {
    try {
      // Check if already exists
      const existing = await db.categories.get(pillar.id);

      if (existing) {
        // UPDATE existing category with latest data from source
        await db.categories.update(pillar.id, {
          name: pillar.name, // ✅ UPDATE name (allows edits)
          description: pillar.description,
          icon: pillar.icon,
          color: pillar.color,
          logic_type: pillar.logic_type,
          sort_order: pillar.sort_order,
          is_active: pillar.is_active,
        });
        console.log(`  🔄 [${pillar.id}] Updated: ${pillar.name}`);
        results.push({ id: pillar.id, action: "UPDATED" });
      } else {
        await db.categories.add(pillar);
        console.log(`  ✅ [${pillar.id}] Created: ${pillar.name}`);
        results.push({ id: pillar.id, action: "CREATED" });
      }
    } catch (error) {
      console.error(`  ❌ [${pillar.id}] Failed:`, error.message);
      results.push({ id: pillar.id, action: "FAILED", error: error.message });
    }
  }

  return results;
}

/**
 * STEP B: Move & Transform Products (NAME-BASED MATCHING)
 * Uses category NAME instead of ID to handle UUID categories
 */
async function migrateProducts() {
  console.log(
    "\n📦 STEP B: Migrating Products to New Categories (Smart Mapping)...",
  );

  const migrationStats = {
    LARGE_FORMAT: { moved: 0, products: [] },
    DIGITAL_A3_PRO: { moved: 0, products: [] },
    STATIONERY_OFFICE: { moved: 0, products: [] },
    MERCH_APPAREL: { moved: 0, products: [] },
    archived: { count: 0, products: [] },
    skipped: { count: 0, products: [] },
  };

  // STEP 1: Build category name → target mapping
  console.log("  🔍 Building category mapping...");
  const allCategories = await db.categories.toArray();
  const categoryMapping = new Map(); // UUID → Target Pillar ID

  for (const cat of allCategories) {
    let targetPillar = null;
    const name = cat.name.toLowerCase();

    // Name-based matching
    if (
      name.includes("banner") ||
      name.includes("spanduk") ||
      name.includes("poster") ||
      name.includes("textile") ||
      name.includes("dtf")
    ) {
      targetPillar = "LARGE_FORMAT";
    } else if (
      name.includes("a3") ||
      name.includes("digital") ||
      name.includes("promo") ||
      name.includes("dokumen") ||
      name.includes("stiker")
    ) {
      targetPillar = "DIGITAL_A3_PRO";
    } else if (
      name.includes("office") ||
      name.includes("calendar") ||
      name.includes("kalender") ||
      name.includes("nota") ||
      name.includes("ncr")
    ) {
      targetPillar = "STATIONERY_OFFICE";
    } else if (
      name.includes("merch") ||
      name.includes("apparel") ||
      name.includes("display") ||
      name.includes("jersey") ||
      name.includes("kaos")
    ) {
      targetPillar = "MERCH_APPAREL";
    }

    if (targetPillar) {
      categoryMapping.set(cat.id, targetPillar);
      console.log(
        `    📌 "${cat.name}" (${cat.id.substring(0, 8)}...) → ${targetPillar}`,
      );
    }
  }

  console.log(`  ✅ Mapped ${categoryMapping.size} legacy categories`);

  // STEP 2: Get all products
  const allProducts = await db.products.toArray();
  console.log(`  📊 Total Products in Database: ${allProducts.length}`);

  // STEP 3: Process each product
  for (const product of allProducts) {
    try {
      // Archive legacy OFFICE simple products (duplicates)
      if (LEGACY_OFFICE_PRODUCTS.includes(product.id)) {
        await db.products.update(product.id, {
          is_archived: 1,
          is_active: 0,
        });
        migrationStats.archived.count++;
        migrationStats.archived.products.push({
          id: product.id,
          name: product.name,
          reason: "Duplicate - Advanced version exists",
        });
        console.log(`  🗑️  [ARCHIVED] ${product.name} (${product.id})`);
        continue;
      }

      // Check if product's category needs migration
      const targetPillar = categoryMapping.get(product.categoryId);

      if (targetPillar) {
        // Migrate to new pillar
        await db.products.update(product.id, {
          categoryId: targetPillar,
          is_active: 1,
          is_archived: 0,
        });
        migrationStats[targetPillar].moved++;
        migrationStats[targetPillar].products.push({
          id: product.id,
          name: product.name,
          fromCategory: product.categoryId.substring(0, 8) + "...",
        });
        console.log(`  ✅ [MOVED] ${product.name} → ${targetPillar}`);
      } else if (product.categoryId === "CUSTOM") {
        // Keep CUSTOM as-is
        console.log(`  ⏭️  [SKIPPED] ${product.name} (CUSTOM category)`);
        migrationStats.skipped.count++;
      } else if (
        [
          "LARGE_FORMAT",
          "DIGITAL_A3_PRO",
          "STATIONERY_OFFICE",
          "MERCH_APPAREL",
        ].includes(product.categoryId)
      ) {
        // Already in a new pillar (e.g., pilot product)
        console.log(
          `  ✅ [ALREADY MIGRATED] ${product.name} (${product.categoryId})`,
        );
        migrationStats.skipped.count++;
      } else {
        // Orphaned product (unknown category)
        console.warn(
          `  ⚠️  [ORPHAN] ${product.name} (categoryId: ${product.categoryId})`,
        );
        migrationStats.skipped.count++;
      }
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${product.name}:`, error.message);
    }
  }

  // Summary
  console.log("\n  📊 Migration Summary:");
  console.log(
    `    LARGE_FORMAT: ${migrationStats.LARGE_FORMAT.moved} products`,
  );
  console.log(
    `    DIGITAL_A3_PRO: ${migrationStats.DIGITAL_A3_PRO.moved} products`,
  );
  console.log(
    `    STATIONERY_OFFICE: ${migrationStats.STATIONERY_OFFICE.moved} products`,
  );
  console.log(
    `    MERCH_APPAREL: ${migrationStats.MERCH_APPAREL.moved} products`,
  );
  console.log(`    Archived: ${migrationStats.archived.count} products`);
  console.log(`    Skipped: ${migrationStats.skipped.count} products`);

  return migrationStats;
}

/**
 * STEP C: Archive Legacy Categories (KILL ALL STRANGERS)
 * Archives ANY category that is NOT in the safe list of 4 new pillars
 */
async function archiveOldCategories() {
  console.log(
    "\n🗄️  STEP C: Archiving Legacy Categories (Kill All Strangers)...",
  );

  const SAFE_IDS = [
    // NEW PILLAR CATEGORIES (Must match NEW_PILLARS array)
    "CAT_OUTDOOR",
    "CAT_ROLLS",
    "CAT_POSTER",
    "DIGITAL_A3_PRO",
    "STATIONERY_OFFICE",
    "MERCH_APPAREL",
    "CUSTOM_SERVICES",
    // LEGACY IDs (for backward compatibility)
    "LARGE_FORMAT",
  ];
  const archiveResults = [];

  // Get ALL categories
  const allCategories = await db.categories.toArray();
  console.log(`  📊 Total categories found: ${allCategories.length}`);

  for (const category of allCategories) {
    try {
      // Kill all strangers (not in safe list)
      if (!SAFE_IDS.includes(category.id)) {
        await db.categories.update(category.id, {
          is_active: 0,
          sort_order: 999, // Push to bottom
        });
        console.log(
          `  🗑️  [CLEANUP] Archived: ${category.name} (ID: ${category.id})`,
        );
        archiveResults.push({
          id: category.id,
          name: category.name,
          action: "ARCHIVED",
        });
      } else {
        console.log(`  ✅ [SAFE] Keeping: ${category.name} (${category.id})`);
        archiveResults.push({
          id: category.id,
          name: category.name,
          action: "KEPT",
        });
      }
    } catch (error) {
      console.error(`  ❌ Failed to process ${category.name}:`, error.message);
      archiveResults.push({
        id: category.id,
        name: category.name,
        action: "FAILED",
        error: error.message,
      });
    }
  }

  return archiveResults;
}

/**
 * VERIFICATION: Display Migration Results
 */
async function verifyMigration() {
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("📊 MIGRATION VERIFICATION REPORT");
  console.log("═══════════════════════════════════════════════════════\n");

  // 1. Active Products per New Category
  console.log("1️⃣  ACTIVE PRODUCTS PER NEW CATEGORY:");
  console.log("─────────────────────────────────────────────────────────");

  for (const pillar of NEW_PILLARS) {
    const count = await db.products
      .where("categoryId")
      .equals(pillar.id)
      .and((p) => p.is_active === 1 && (!p.is_archived || p.is_archived === 0))
      .count();

    console.log(`  📦 ${pillar.name.padEnd(40)} → ${count} products`);
  }

  // 2. Archived Products
  console.log("\n2️⃣  ARCHIVED PRODUCTS (Duplicates Removed):");
  console.log("─────────────────────────────────────────────────────────");

  const archivedProducts = await db.products
    .filter((p) => p.is_archived === 1)
    .toArray();

  if (archivedProducts.length === 0) {
    console.log("  ℹ️  No products archived");
  } else {
    archivedProducts.forEach((p) => {
      console.log(`  🗑️  ${p.name} (${p.id})`);
    });
  }

  // 3. Archived Categories
  console.log("\n3️⃣  ARCHIVED CATEGORIES:");
  console.log("─────────────────────────────────────────────────────────");

  const archivedCategories = await db.categories
    .filter((c) => c.is_active === 0)
    .toArray();

  archivedCategories.forEach((c) => {
    console.log(`  🗄️  ${c.name} (${c.id})`);
  });

  // 4. Active Categories
  console.log("\n4️⃣  ACTIVE CATEGORIES (Should be 4 new pillars):");
  console.log("─────────────────────────────────────────────────────────");

  const activeCategories = await db.categories
    .filter((c) => c.is_active === 1)
    .toArray();

  activeCategories
    .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
    .forEach((c) => {
      console.log(`  ✅ [${c.id}] ${c.name} (Type: ${c.logic_type})`);
    });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ VERIFICATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════\n");
}

/**
 * MAIN MIGRATION RUNNER
 */
export async function runMigration() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                                                       ║");
  console.log("║       🚀 THE GREAT MIGRATION - PHASE 2 🚀            ║");
  console.log("║       Category Consolidation & Cleanup               ║");
  console.log("║                                                       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log("\n");

  const startTime = performance.now();

  try {
    // STEP 0: Seed initial data if database is empty
    const categoryCount = await db.categories.count();
    if (categoryCount === 0) {
      console.log(
        "📦 STEP 0: Database empty - seeding initial data from MASTER_DATA...",
      );
      await seedMasterData();
      console.log("  ✅ Initial data seeded\n");
    } else {
      console.log(
        `📦 STEP 0: Database has ${categoryCount} categories - skipping initial seed\n`,
      );
    }

    // STEP A: Create New Categories
    const pillarResults = await createPillarCategories();

    // STEP B: Migrate Products
    const migrationStats = await migrateProducts();

    // STEP C: Archive Old Categories
    const archiveResults = await archiveOldCategories();

    // VERIFICATION
    await verifyMigration();

    const duration = Math.round(performance.now() - startTime);

    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log("\n🎉 MIGRATION COMPLETE!\n");

    return {
      success: true,
      duration,
      pillarResults,
      migrationStats,
      archiveResults,
    };
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:", error);
    console.error(error.stack);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ROLLBACK: Restore Original State (Use with caution!)
 */
export async function rollbackMigration() {
  console.log("⚠️  ROLLBACK STARTED...");

  try {
    // Re-activate all categories
    const allCategories = await db.categories.toArray();
    for (const cat of allCategories) {
      await db.categories.update(cat.id, { is_active: 1 });
    }

    // Un-archive all products
    const allProducts = await db.products.toArray();
    for (const prod of allProducts) {
      await db.products.update(prod.id, {
        is_archived: 0,
        is_active: 1,
      });
    }

    console.log("✅ Rollback complete - all data restored");
    return { success: true };
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    return { success: false, error: error.message };
  }
}

// Export for browser console usage
if (typeof window !== "undefined") {
  window.runMigration = runMigration;
  window.rollbackMigration = rollbackMigration;
}
