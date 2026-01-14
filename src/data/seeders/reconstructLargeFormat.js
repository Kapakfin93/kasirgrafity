/**
 * LARGE_FORMAT RECONSTRUCTION SEEDER
 * 
 * PURPOSE:
 * Replace all existing LARGE_FORMAT products with 4 Master Products
 * featuring complex variant structures and finishing groups
 * 
 * MASTER PRODUCTS:
 * 1. CETAK SPANDUK (AREA logic - PxL)
 * 2. CETAK KAIN (LINEAR logic - Per meter)
 * 3. CETAK STIKER (LINEAR logic - Meteran, Gen 2)
 * 4. CETAK POSTER (MATRIX logic - Fixed sizes)
 */

import db from '../db/schema.js';

const MASTER_PRODUCTS = [
    // 1. MASTER SPANDUK (Outdoor) - Logic: AREA (PxL)
    {
        id: "master_spanduk_outdoor",
        categoryId: "LARGE_FORMAT",
        name: "CETAK SPANDUK (Outdoor)",
        input_mode: "AREA", // Triggers Length x Width Input
        calc_engine: "SQUARE_METER",
        variants: [
            { label: "Flexi 280gr Standard", price: 18000 },
            { label: "Flexi Korea 440gr", price: 45000 },
            { label: "Flexi Backlite (Neonbox)", price: 65000 },
            { label: "Banner Jerman", price: 85000 }
        ],
        finishing_groups: [
            {
                id: "fin_ban_std",
                title: "Finishing",
                type: "radio",
                required: true,
                options: [
                    { label: "Mata Ayam (Cincin)", price: 0 },
                    { label: "Selongsong (Kantong)", price: 0 },
                    { label: "Lipat Pres (Polos)", price: 0 },
                    { label: "Tanpa Finishing", price: 0 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 2. MASTER KAIN (Textile) - Logic: LINEAR (Panjang Lari)
    {
        id: "master_kain_textile",
        categoryId: "LARGE_FORMAT",
        name: "CETAK KAIN / TEXTILE",
        input_mode: "LINEAR", // Triggers Length Input only
        calc_engine: "LINEAR_METER",
        variants: [
            { label: "Kain Lokal (L: 90cm)", price_per_meter: 35000 },
            { label: "Kain Lokal (L: 120cm)", price_per_meter: 45000 },
            { label: "Kain Impor (L: 90cm)", price_per_meter: 55000 },
            { label: "Kain Impor (L: 150cm)", price_per_meter: 90000 },
            { label: "Kain Impor (L: 200cm)", price_per_meter: 120000 },
            { label: "DTF (L: 60cm)", price_per_meter: 45000 }
        ],
        finishing_groups: [
            {
                id: "fin_tex_std",
                title: "Finishing",
                type: "radio",
                required: true,
                options: [
                    { label: "Potong Pas Gambar", price: 0 },
                    { label: "Jahit Keliling + Tali", price: 5000 }, // Per Pcs
                    { label: "Jahit Obras", price: 3000 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 3. MASTER STIKER (Meteran) - Logic: LINEAR (2-Step Selection)
    {
        id: "master_stiker_meteran",
        categoryId: "LARGE_FORMAT",
        name: "CETAK STIKER (Meteran)",
        input_mode: "LINEAR",
        calc_engine: "ROLLS", // Gen 2 Logic
        // NEW STRUCTURE: Nested Material → Width
        variants: [
            {
                label: "Stiker Vinyl White",
                options: [
                    { label: "100 cm", width_cm: 100, price_per_meter: 50000 },
                    { label: "120 cm", width_cm: 120, price_per_meter: 60000 },
                    { label: "150 cm", width_cm: 150, price_per_meter: 75000 }
                ]
            },
            {
                label: "Stiker Transparan",
                options: [
                    { label: "100 cm", width_cm: 100, price_per_meter: 55000 },
                    { label: "120 cm", width_cm: 120, price_per_meter: 65000 },
                    { label: "150 cm", width_cm: 150, price_per_meter: 80000 }
                ]
            },
            {
                label: "Stiker Ritrama",
                options: [
                    { label: "100 cm", width_cm: 100, price_per_meter: 60000 },
                    { label: "120 cm", width_cm: 120, price_per_meter: 75000 },
                    { label: "150 cm", width_cm: 150, price_per_meter: 90000 }
                ]
            }
        ],
        finishing_groups: [
            {
                id: "fin_stik_lam",
                title: "Laminasi (Per Meter)",
                type: "radio",
                required: false,
                options: [
                    { label: "Tanpa Laminasi", price: 0 },
                    { label: "Glossy", price: 15000 }, // Per meter
                    { label: "Doff", price: 15000 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 4. MASTER POSTER (Indoor/UV) - Logic: MATRIX (Fixed Size)
    {
        id: "master_poster_matrix",
        categoryId: "LARGE_FORMAT",
        name: "CETAK POSTER (Indoor & UV)",
        input_mode: "MATRIX", // Triggers Size Selector
        calc_engine: "MATRIX_FIXED",
        // Variants are MATERIALS with price_list per SIZE
        variants: [
            {
                label: "Indoor - Albatros",
                price_list: { A2: 22000, A1: 32000, A0: 55000 }
            },
            {
                label: "Indoor - Luster",
                price_list: { A2: 25000, A1: 45000, A0: 85000 }
            },
            {
                label: "Indoor - Photopaper",
                price_list: { A2: 28000, A1: 48000, A0: 90000 }
            },
            {
                label: "UV - Albatros",
                price_list: { A2: 40000, A1: 75000, A0: 140000 }
            },
            {
                label: "UV - Luster",
                price_list: { A2: 45000, A1: 85000, A0: 160000 }
            },
            {
                label: "UV - Photopaper",
                price_list: { A2: 50000, A1: 95000, A0: 180000 }
            }
        ],
        finishing_groups: [],
        is_active: 1,
        is_archived: 0
    }
];

export async function runLargeFormatReconstruction() {
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║  🏗️  LARGE_FORMAT RECONSTRUCTION                     ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    try {
        // STEP 1: Delete ALL existing LARGE_FORMAT products
        console.log("🗑️  STEP 1: Deleting old LARGE_FORMAT products...");

        const oldProducts = await db.products
            .where('categoryId')
            .equals('LARGE_FORMAT')
            .toArray();

        console.log(`   Found ${oldProducts.length} products to delete`);

        for (const product of oldProducts) {
            await db.products.delete(product.id);
            console.log(`   ❌ Deleted: ${product.name} (${product.id})`);
        }

        // EXPLICITLY DELETE THE OLD PILOT PRODUCT (if exists)
        try {
            await db.products.delete('stiker_meteran_gen2');
            console.log(`   🗑️  Deleted old pilot product: stiker_meteran_gen2`);
        } catch (err) {
            // Ignore if doesn't exist
        }

        console.log(`   ✅ Deleted ${oldProducts.length} old products\n`);

        // STEP 2: Seed 4 Master Products
        console.log("📦 STEP 2: Seeding Master Products...\n");

        for (const masterProduct of MASTER_PRODUCTS) {
            try {
                await db.products.add(masterProduct);
                console.log(`   ✅ Seeded: ${masterProduct.name}`);
                console.log(`      Input Mode: ${masterProduct.input_mode}`);
                console.log(`      Variants: ${masterProduct.variants.length}`);
                console.log(`      Finishing Groups: ${masterProduct.finishing_groups.length}`);
            } catch (err) {
                console.error(`   ❌ Failed to seed ${masterProduct.name}:`, err.message);
            }
        }

        console.log("\n╔════════════════════════════════════════════════════════╗");
        console.log("║  ✅ RECONSTRUCTION COMPLETE                           ║");
        console.log("╚════════════════════════════════════════════════════════╝\n");

        console.log("📊 SUMMARY:");
        console.log(`   🗑️  Old products deleted: ${oldProducts.length}`);
        console.log(`   ✅ New masters seeded: ${MASTER_PRODUCTS.length}`);
        console.log("\n💡 NEXT STEPS:");
        console.log("   1. Refresh the page");
        console.log("   2. Check LARGE_FORMAT category");
        console.log("   3. Test each Master Product modal\n");

        return {
            deleted: oldProducts.length,
            seeded: MASTER_PRODUCTS.length
        };

    } catch (error) {
        console.error("\n❌ RECONSTRUCTION FAILED:", error);
        console.error(error.stack);
        return { error: error.message };
    }
}

// Export for browser console
if (typeof window !== 'undefined') {
    window.runLargeFormatReconstruction = runLargeFormatReconstruction;
}
