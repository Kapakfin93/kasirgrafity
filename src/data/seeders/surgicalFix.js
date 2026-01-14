/**
 * SURGICAL FIX SCRIPT - Data Cleanup & Product Restoration
 * 
 * PURPOSE:
 * 1. Restore accidentally archived products (Kalender, Stempel)
 * 2. Move misplaced products to correct categories
 * 3. Assign input_mode to legacy products for proper rendering
 * 
 * USAGE:
 * Copy-paste this entire script into Browser Console (F12) and run
 */

import db from '../db/schema.js';

export async function runSurgicalFix() {
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║  🔧 SURGICAL FIX - Phase 3C Data Cleanup             ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    const stats = {
        restored: [],
        moved: [],
        inputModeAssigned: [],
        errors: []
    };

    try {
        // ═══════════════════════════════════════════════════════
        // STEP 1: RESTORE MISSING ITEMS (UN-ARCHIVE)
        // ═══════════════════════════════════════════════════════
        console.log("📦 STEP 1: Restoring Archived Products...\n");

        const allProducts = await db.products.toArray();

        // Find archived Kalender & Stempel
        const toRestore = allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const isTarget = (
                name.includes('kalender') ||
                name.includes('calendar') ||
                name.includes('stempel') ||
                name.includes('stamp')
            );
            const isArchived = p.is_archived === 1 || p.is_active === 0;
            return isTarget && isArchived;
        });

        console.log(`   Found ${toRestore.length} products to restore:`);

        for (const product of toRestore) {
            try {
                await db.products.update(product.id, {
                    is_archived: 0,
                    is_active: 1,
                    categoryId: 'STATIONERY_OFFICE',
                    input_mode: 'UNIT'
                });

                console.log(`   ✅ Restored: ${product.name} (${product.id})`);
                stats.restored.push(product.name);
            } catch (err) {
                console.error(`   ❌ Failed to restore ${product.name}:`, err.message);
                stats.errors.push({ product: product.name, error: err.message });
            }
        }

        // ═══════════════════════════════════════════════════════
        // STEP 2: MOVE MISPLACED ITEMS
        // ═══════════════════════════════════════════════════════
        console.log("\n📦 STEP 2: Moving Misplaced Products...\n");

        const misplaced = allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const isApparel = name.includes('jersey') || name.includes('kaos') ||
                name.includes('shirt') || name.includes('polo');
            const isDisplay = name.includes('x-banner') || name.includes('y-banner') ||
                name.includes('roll up') || name.includes('standing');
            const inWrongCategory = p.categoryId === 'LARGE_FORMAT';
            return (isApparel || isDisplay) && inWrongCategory;
        });

        console.log(`   Found ${misplaced.length} products to move:`);

        for (const product of misplaced) {
            try {
                await db.products.update(product.id, {
                    categoryId: 'MERCH_APPAREL',
                    input_mode: 'UNIT'
                });

                console.log(`   ✅ Moved: ${product.name} → MERCH_APPAREL`);
                stats.moved.push(product.name);
            } catch (err) {
                console.error(`   ❌ Failed to move ${product.name}:`, err.message);
                stats.errors.push({ product: product.name, error: err.message });
            }
        }

        // ═══════════════════════════════════════════════════════
        // STEP 3: ASSIGN INPUT MODES TO LEGACY PRODUCTS
        // ═══════════════════════════════════════════════════════
        console.log("\n📦 STEP 3: Assigning input_mode to Legacy Products...\n");

        // Get fresh data
        const currentProducts = await db.products.toArray();
        const activeProducts = currentProducts.filter(p =>
            p.is_active !== 0 && p.is_archived !== 1
        );

        let assignCount = 0;

        // 3A. LARGE_FORMAT Products
        const largeFormatProducts = activeProducts.filter(p => p.categoryId === 'LARGE_FORMAT');

        for (const product of largeFormatProducts) {
            // Skip if already has input_mode
            if (product.input_mode) continue;

            const name = product.name.toLowerCase();
            let newInputMode = null;

            // AREA products (Banner, Flexi, Spanduk)
            if (name.includes('flexi') || name.includes('banner') ||
                name.includes('spanduk') || name.includes('jerman') ||
                name.includes('backlite') || name.includes('albatros')) {
                newInputMode = 'AREA';
            }
            // LINEAR products (Textile, Kain)
            else if (name.includes('textile') || name.includes('kain') ||
                name.includes('dtf')) {
                newInputMode = 'LINEAR';
            }

            if (newInputMode) {
                try {
                    await db.products.update(product.id, { input_mode: newInputMode });
                    console.log(`   ✅ ${product.name} → input_mode: ${newInputMode}`);
                    stats.inputModeAssigned.push(`${product.name} (${newInputMode})`);
                    assignCount++;
                } catch (err) {
                    console.error(`   ❌ Failed to assign mode to ${product.name}`);
                    stats.errors.push({ product: product.name, error: err.message });
                }
            }
        }

        // 3B. DIGITAL_A3_PRO Products
        const digitalProducts = activeProducts.filter(p => p.categoryId === 'DIGITAL_A3_PRO');

        for (const product of digitalProducts) {
            if (product.input_mode) continue;

            try {
                await db.products.update(product.id, { input_mode: 'SHEET' });
                console.log(`   ✅ ${product.name} → input_mode: SHEET`);
                stats.inputModeAssigned.push(`${product.name} (SHEET)`);
                assignCount++;
            } catch (err) {
                console.error(`   ❌ Failed to assign mode to ${product.name}`);
                stats.errors.push({ product: product.name, error: err.message });
            }
        }

        // 3C. MERCH_APPAREL Products
        const merchProducts = activeProducts.filter(p => p.categoryId === 'MERCH_APPAREL');

        for (const product of merchProducts) {
            if (product.input_mode) continue;

            try {
                await db.products.update(product.id, { input_mode: 'UNIT' });
                console.log(`   ✅ ${product.name} → input_mode: UNIT`);
                stats.inputModeAssigned.push(`${product.name} (UNIT)`);
                assignCount++;
            } catch (err) {
                console.error(`   ❌ Failed to assign mode to ${product.name}`);
                stats.errors.push({ product: product.name, error: err.message });
            }
        }

        // 3D. STATIONERY_OFFICE Products (excluding Gen 2 with calc_engine)
        const stationeryProducts = activeProducts.filter(p => p.categoryId === 'STATIONERY_OFFICE');

        for (const product of stationeryProducts) {
            if (product.input_mode) continue;

            // Skip Gen 2 products with calc_engine
            if (product.calc_engine) continue;

            try {
                await db.products.update(product.id, { input_mode: 'UNIT' });
                console.log(`   ✅ ${product.name} → input_mode: UNIT`);
                stats.inputModeAssigned.push(`${product.name} (UNIT)`);
                assignCount++;
            } catch (err) {
                console.error(`   ❌ Failed to assign mode to ${product.name}`);
                stats.errors.push({ product: product.name, error: err.message });
            }
        }

        // ═══════════════════════════════════════════════════════
        // FINAL REPORT
        // ═══════════════════════════════════════════════════════
        console.log("\n╔════════════════════════════════════════════════════════╗");
        console.log("║  ✅ SURGICAL FIX COMPLETE                             ║");
        console.log("╚════════════════════════════════════════════════════════╝\n");

        console.log("📊 SUMMARY:");
        console.log(`   ✅ Restored: ${stats.restored.length} products`);
        if (stats.restored.length > 0) {
            stats.restored.forEach(name => console.log(`      • ${name}`));
        }

        console.log(`\n   ✅ Moved: ${stats.moved.length} products`);
        if (stats.moved.length > 0) {
            stats.moved.forEach(name => console.log(`      • ${name}`));
        }

        console.log(`\n   ✅ Assigned input_mode: ${stats.inputModeAssigned.length} products`);
        if (stats.inputModeAssigned.length > 10) {
            console.log(`      (Too many to list - ${stats.inputModeAssigned.length} total)`);
        } else if (stats.inputModeAssigned.length > 0) {
            stats.inputModeAssigned.forEach(item => console.log(`      • ${item}`));
        }

        if (stats.errors.length > 0) {
            console.log(`\n   ❌ Errors: ${stats.errors.length}`);
            stats.errors.forEach(err => console.log(`      • ${err.product}: ${err.error}`));
        }

        console.log("\n💡 NEXT STEPS:");
        console.log("   1. Refresh the page (F5)");
        console.log("   2. Check STATIONERY category - should see Kalender/Stempel");
        console.log("   3. Check LARGE_FORMAT - Jersey/X-Banner should be gone");
        console.log("   4. Check MERCH_APPAREL - Jersey/X-Banner should appear");
        console.log("\n");

        return Promise.resolve(stats);

    } catch (error) {
        console.error("\n❌ CRITICAL ERROR:", error);
        console.error(error.stack);
        return Promise.reject({ error: error.message, stats });
    }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
    window.runSurgicalFix = runSurgicalFix;
}
