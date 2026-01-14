/**
 * Pilot Seeder - Gen 2 Product Structure
 * Injects a test product with new pricing engine (ROLLS/LINEAR)
 */

import db from '../db/schema.js';

/**
 * Pilot Product: Stiker Vinyl Large Format (Meteran)
 * Demonstrates Gen 2 features:
 * - Variants (multiple width options)
 * - Material linking (inventory integration)
 * - Finishing groups (embedded options)
 * - Roll-based pricing (per meter calculation)
 */
const PILOT_PRODUCT = {
    id: "stiker_meteran_gen2",
    categoryId: "LARGE_FORMAT", // Will be mapped to existing category later
    name: "Stiker Vinyl Large Format (Meteran)",

    // Gen 2 Fields
    input_mode: "LINEAR",
    calc_engine: "ROLLS",

    // Quantity Controls
    min_qty: 1,
    step_qty: 0.5,

    // Variants with Material Linking
    variants: [
        {
            label: "L: 100cm",
            price_per_meter: 50000,
            linked_material_id: "MAT_VIN_100",
            width_cm: 100
        },
        {
            label: "L: 120cm",
            price_per_meter: 60000,
            linked_material_id: "MAT_VIN_120",
            width_cm: 120
        },
        {
            label: "L: 150cm",
            price_per_meter: 75000,
            linked_material_id: "MAT_VIN_150",
            width_cm: 150
        }
    ],

    // Finishing Groups (Embedded Logic)
    finishing_groups: [
        {
            id: "fg_lamination",
            title: "Laminasi (Per Meter)",
            type: "radio",
            required: false,
            options: [
                { label: "Tanpa Laminasi", price: 0 },
                { label: "Laminasi Glossy", price: 15000 },
                { label: "Laminasi Doff", price: 15000 }
            ]
        }
    ],

    // Status
    is_active: 1,
    is_archived: 0
};

/**
 * Seed Pilot Product
 * Adds Gen 2 test product to database (with duplicate check)
 */
export async function seedPilotProduct() {
    console.log('🌱 Starting Pilot Seeder (Gen 2)...');

    try {
        // Check if already exists
        const existing = await db.products.get('stiker_meteran_gen2');

        if (existing) {
            console.log('ℹ️ Pilot product already exists, skipping insertion');
            return {
                success: true,
                action: 'SKIPPED',
                product: existing
            };
        }

        // Insert pilot product
        await db.products.add(PILOT_PRODUCT);

        // Verify insertion
        const inserted = await db.products.get('stiker_meteran_gen2');

        console.log('✅ Pilot product seeded successfully:', inserted);
        console.log('📊 PILOT PRODUCT:', inserted);

        return {
            success: true,
            action: 'INSERTED',
            product: inserted
        };

    } catch (error) {
        console.error('❌ Pilot seeder failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Remove Pilot Product (for testing/cleanup)
 */
export async function removePilotProduct() {
    console.log('🧹 Removing pilot product...');

    try {
        await db.products.delete('stiker_meteran_gen2');
        console.log('✅ Pilot product removed');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to remove pilot product:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify Pilot Product
 * Retrieves and logs the pilot product for inspection
 */
export async function verifyPilotProduct() {
    console.log('🔍 Verifying pilot product...');

    try {
        const product = await db.products.get('stiker_meteran_gen2');

        if (!product) {
            console.warn('⚠️ Pilot product not found in database');
            return { success: false, found: false };
        }

        console.log('✅ PILOT PRODUCT VERIFICATION:');
        console.table({
            id: product.id,
            name: product.name,
            input_mode: product.input_mode,
            calc_engine: product.calc_engine,
            variants: product.variants?.length || 0,
            finishing_groups: product.finishing_groups?.length || 0
        });

        console.log('📦 Full Pilot Product Object:', product);

        return {
            success: true,
            found: true,
            product
        };

    } catch (error) {
        console.error('❌ Verification failed:', error);
        return { success: false, error: error.message };
    }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
    window.seedPilotProduct = seedPilotProduct;
    window.removePilotProduct = removePilotProduct;
    window.verifyPilotProduct = verifyPilotProduct;
}
