/**
 * STATIONERY_OFFICE RECONSTRUCTION SEEDER (GEN 3.2 FINAL)
 * 
 * FEATURES:
 * - Nota NCR: MATRIX logic (Ply → Size selection)
 * - All variants: Specs subtitles for better UX
 * - TIERED pricing on applicable products
 */

import db from '../db/schema.js';

const OFFICE_PRODUCTS = [
    // 1. MASTER NOTA / NCR (NOW MATRIX: Ply → Size)
    {
        id: "master_nota_ncr",
        categoryId: "STATIONERY_OFFICE",
        name: "CETAK NOTA / NCR (Custom)",
        input_mode: "MATRIX",
        calc_engine: "MATRIX_FIXED",
        base_price: 25000,
        variants: [
            {
                label: "NCR 1 Ply (Putih)",
                specs: "HVS Tanpa Rangkap",
                price_list: {
                    "1/4 Folio (10x16)": 15000,
                    "1/3 Folio (10x21)": 20000,
                    "1/2 Folio (16x21)": 30000,
                    "1 Folio (21x33)": 60000
                }
            },
            {
                label: "NCR 2 Ply (2 Warna)",
                specs: "Top Putih + Bot Merah/Kuning",
                price_list: {
                    "1/4 Folio (10x16)": 25000,
                    "1/3 Folio (10x21)": 33000,
                    "1/2 Folio (16x21)": 50000,
                    "1 Folio (21x33)": 100000
                }
            },
            {
                label: "NCR 3 Ply (3 Warna)",
                specs: "Putih + Merah + Kuning",
                price_list: {
                    "1/4 Folio (10x16)": 37500,
                    "1/3 Folio (10x21)": 50000,
                    "1/2 Folio (16x21)": 75000,
                    "1 Folio (21x33)": 150000
                }
            },
            {
                label: "NCR 4 Ply (4 Warna)",
                specs: "Lengkap (Wh/Red/Yel/Blu)",
                price_list: {
                    "1/4 Folio (10x16)": 50000,
                    "1/3 Folio (10x21)": 66000,
                    "1/2 Folio (16x21)": 100000,
                    "1 Folio (21x33)": 200000
                }
            }
        ],
        finishing_groups: [
            {
                id: "fin_nota_add",
                title: "Finishing Tambahan",
                type: "checkbox",
                required: false,
                options: [
                    { label: "Porporasi (Lubang Sobek)", price: 1000 },
                    { label: "Numerator (Nomor Urut)", price: 1500 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 2. MASTER KALENDER
    {
        id: "master_kalender_custom",
        categoryId: "STATIONERY_OFFICE",
        name: "CETAK KALENDER (Meja & Dinding)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 25000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 49, price: 25000 },
                { min: 50, max: 99, price: 23000 },
                { min: 100, max: 1000, price: 21000 }
            ]
        },
        variants: [
            { label: "Meja Standar", specs: "21x15 cm | 7 Lbr (Bolak Balik)", price: 25000 },
            { label: "Meja Premium", specs: "21x15 cm | 13 Lbr (1 Bulanan)", price: 35000 },
            { label: "Dinding Poster", specs: "32x48 cm (A3+) | 1 Lembar AC", price: 5000 },
            { label: "Dinding 6 Lbr", specs: "32x48 cm (A3+) | AP 150gr", price: 17500 },
            { label: "Dinding 12 Lbr", specs: "32x48 cm (A3+) | AP 150gr", price: 32000 }
        ],
        finishing_groups: [
            {
                id: "fin_kal_jilid",
                title: "Jilid / Gantungan (Wajib Pilih)",
                type: "radio",
                required: true,
                options: [
                    { label: "Mata Ayam (Cincin)", price: 0 },
                    { label: "Klem Seng (Kaleng)", price: 2500 },
                    { label: "Spiral Hanger (Kawat)", price: 6000 }
                ]
            },
            {
                id: "fin_kal_pack",
                title: "Packing",
                type: "checkbox",
                required: false,
                options: [
                    { label: "Plastik Satuan", price: 500 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 3. MASTER MAP IJAZAH
    {
        id: "master_map_ijazah",
        categoryId: "STATIONERY_OFFICE",
        name: "MAP IJAZAH / RAPORT",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 15000,
        min_qty: 1,
        variants: [
            { label: "Standard", specs: "ASE Tipis | Logo Hotprint", price: 15000 },
            { label: "Medium", specs: "ASE Tebal | Siku Emas", price: 22000 },
            { label: "Premium", specs: "Lapis Busa | Full Foil | Siku", price: 35000 }
        ],
        finishing_groups: [
            {
                id: "fin_map_plastik",
                title: "Isian Plastik Doff",
                type: "radio",
                required: true,
                options: [
                    { label: "Isi 2 Lembar (Bawaan)", price: 0 },
                    { label: "Isi 4 Lembar", price: 2000 },
                    { label: "Isi 6 Lembar", price: 4000 },
                    { label: "Isi 10 Lembar", price: 8000 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 4. MASTER BUKU YASIN
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
                { min: 100, max: 1000, price: 14000 }
            ]
        },
        variants: [
            { label: "Softcover 180", specs: "Isi HVS | Cover ArtCarton", price: 15000 },
            { label: "Softcover 280", specs: "Isi HVS | Cover ArtCarton", price: 22000 },
            { label: "Hardcover 180", specs: "Isi HVS | Cover RCP/Linen", price: 30000 },
            { label: "Hardcover 280", specs: "Isi HVS | Cover RCP/Linen", price: 45000 }
        ],
        finishing_groups: [
            {
                id: "fin_yasin_add",
                title: "Tambahan",
                type: "checkbox",
                required: false,
                options: [
                    { label: "Halaman Sambutan (Foto)", price: 1500 },
                    { label: "Plastik Bungkus", price: 500 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 5. MASTER KOP SURAT
    {
        id: "master_kop_surat",
        categoryId: "STATIONERY_OFFICE",
        name: "CETAK KOP SURAT (Per Rim)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 150000,
        min_qty: 1,
        variants: [
            { label: "HVS 70gr", specs: "Ekonomis (Tipis)", price: 150000 },
            { label: "HVS 80gr", specs: "Standard Premium", price: 185000 },
            { label: "HVS 100gr", specs: "Eksklusif (Tebal)", price: 220000 },
            { label: "Concorde", specs: "Bertekstur / Mewah", price: 300000 }
        ],
        finishing_groups: [
            {
                id: "fin_kop_size",
                title: "Ukuran Potong",
                type: "radio",
                required: true,
                options: [
                    { label: "A4 (Standard)", price: 0 },
                    { label: "F4 / Folio", price: 0 },
                    { label: "Quarto / Letter", price: 0 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    },

    // 6. MASTER STEMPEL FLASH
    {
        id: "master_stempel_flash",
        categoryId: "STATIONERY_OFFICE",
        name: "STEMPEL FLASH (Otomatis)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 55000,
        min_qty: 1,
        variants: [
            { label: "Ukuran Kecil", specs: "Bulat (17-23mm) / Persegi Kecil", price: 35000 },
            { label: "Ukuran Sedang", specs: "Bulat (25-40mm) / Persegi Std", price: 55000 },
            { label: "Ukuran Besar", specs: "Bulat (42-51mm) / Persegi Jumbo", price: 85000 }
        ],
        finishing_groups: [
            {
                id: "fin_stempel_add",
                title: "Extra",
                type: "checkbox",
                required: false,
                options: [
                    { label: "Tinta Refill (5ml)", price: 10000 }
                ]
            }
        ],
        is_active: 1,
        is_archived: 0
    }
];

export async function runOfficeReconstruction() {
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║  📚 STATIONERY_OFFICE RECONSTRUCTION (GEN 3.2 FINAL)  ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    try {
        const oldProducts = await db.products
            .where('categoryId')
            .equals('STATIONERY_OFFICE')
            .toArray();

        console.log(`🗑️  Deleting ${oldProducts.length} old products...`);
        for (const product of oldProducts) {
            await db.products.delete(product.id);
        }

        console.log("📦 Seeding Master Products...\n");
        for (const masterProduct of OFFICE_PRODUCTS) {
            await db.products.put(masterProduct);
            console.log(`   ✅ ${masterProduct.name}`);
            console.log(`      Mode: ${masterProduct.input_mode}`);
            console.log(`      Variants: ${masterProduct.variants?.length || 0} (with specs)`);
        }

        console.log("\n╔════════════════════════════════════════════════════════╗");
        console.log("║  ✅ OFFICE RECONSTRUCTION COMPLETE (GEN 3.2)          ║");
        console.log("╚════════════════════════════════════════════════════════╝\n");
        console.log("🎯 KEY FEATURES:");
        console.log("   • Nota NCR: MATRIX logic (Ply → Size)");
        console.log("   • All Products: Specs subtitles on variants");
        console.log("   • Kalender: Klem/Spiral finishing groups\n");

        return { deleted: oldProducts.length, seeded: OFFICE_PRODUCTS.length };
    } catch (error) {
        console.error("\n❌ FAILED:", error);
        return { error: error.message };
    }
}

if (typeof window !== 'undefined') {
    window.runOfficeReconstruction = runOfficeReconstruction;
}
