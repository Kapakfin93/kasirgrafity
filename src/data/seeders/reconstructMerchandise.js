import db from '../db/schema.js';

const MERCH_PRODUCTS = [
    // 1. MASTER JERSEY (The King)
    // Logic: Unit Variants (Material + Model) + Wholesale Tier
    {
        id: "master_jersey_printing",
        categoryId: "MERCH_APPAREL",
        name: "JERSEY FUTSAL / BOLA (Printing)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 150000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 11, price: 150000 }, // Harga Ecer (Mahal)
                { min: 12, max: 1000, price: 135000 } // Harga Tim (Diskon) - Logic will adjust based on variant delta
            ]
        },
        variants: [
            { label: "Milano - Setelan", specs: "Zigzag Tech | Baju + Celana", price: 150000 },
            { label: "Milano - Atasan", specs: "Zigzag Tech | Baju Saja", price: 95000 },
            { label: "Benzema - Setelan", specs: "Pori Halus | Baju + Celana", price: 140000 },
            { label: "Benzema - Atasan", specs: "Pori Halus | Baju Saja", price: 85000 }
        ],
        finishing_groups: [
            {
                id: "fin_jersey_opt", title: "Opsi Tambahan", type: "checkbox", required: false,
                options: [
                    { label: "Lengan Panjang", price: 10000 },
                    { label: "Size Jumbo (XXL/3XL)", price: 15000 },
                    { label: "Kerah Custom (V-Neck/Shanghai)", price: 5000 }
                ]
            }
        ],
        is_active: 1, is_archived: 0
    },

    // 2. MASTER KAOS CUSTOM (DTF)
    {
        id: "master_kaos_dtf",
        categoryId: "MERCH_APPAREL",
        name: "KAOS CUSTOM (Sablon DTF)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 85000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 11, price: 85000 },
                { min: 12, max: 1000, price: 75000 }
            ]
        },
        variants: [
            { label: "Logo Kecil", specs: "Area A6/A5 (Dada Kiri)", price: 65000 },
            { label: "Blok A4", specs: "Area A4 (Dada/Punggung)", price: 85000 },
            { label: "Blok A3", specs: "Area A3 (Jumbo)", price: 100000 },
            { label: "2 Sisi (A4+A4)", specs: "Depan & Belakang", price: 120000 }
        ],
        finishing_groups: [
            {
                id: "fin_kaos_mat", title: "Upgrade Bahan", type: "checkbox", required: false,
                options: [
                    { label: "Upgrade Cotton 24s (Tebal)", price: 5000 },
                    { label: "Lengan Panjang", price: 10000 }
                ]
            }
        ],
        is_active: 1, is_archived: 0
    },

    // 3. MASTER DISPLAY SYSTEM (Banner Stand)
    {
        id: "master_display_system",
        categoryId: "MERCH_APPAREL",
        name: "DISPLAY SYSTEM / STANDING",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 75000,
        min_qty: 1,
        variants: [
            { label: "X-Banner", specs: "60x160 | Fiber Black", price: 75000 },
            { label: "Y-Banner", specs: "60x160 | Rangka Besi/Alu", price: 125000 },
            { label: "Roll Up Banner", specs: "60x160 | Aluminium Putar", price: 250000 },
            { label: "Roll Up Banner 80", specs: "80x200 | Aluminium Putar", price: 295000 }
        ],
        finishing_groups: [
            {
                id: "fin_banner_mat", title: "Pilihan Bahan Visual", type: "radio", required: true,
                options: [
                    { label: "Flexi 280gr (Standar)", price: 0 },
                    { label: "Albatros + Laminasi (Premium)", price: 25000 }
                ]
            }
        ],
        is_active: 1, is_archived: 0
    },

    // 4. MASTER PIN & GANCI (Souvenir)
    {
        id: "master_pin_ganci",
        categoryId: "MERCH_APPAREL",
        name: "PIN & GANTUNGAN KUNCI",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 5000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 49, price: 5000 }, // Ecer
                { min: 50, max: 99, price: 4000 }, // Partai Kecil
                { min: 100, max: 1000, price: 3000 } // Partai Besar
            ]
        },
        variants: [
            { label: "Pin Peniti 44mm", specs: "Laminasi Glossy/Doff", price: 4000 },
            { label: "Pin Peniti 58mm", specs: "Laminasi Glossy/Doff", price: 5000 },
            { label: "Ganci 44mm", specs: "Gantungan Kunci Polos", price: 5000 },
            { label: "Ganci 58mm", specs: "Gantungan Kunci Polos", price: 6000 }
        ],
        is_active: 1, is_archived: 0
    },

    // 5. MASTER LANYARD & ID CARD
    {
        id: "master_lanyard_id",
        categoryId: "MERCH_APPAREL",
        name: "LANYARD & ID CARD",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 25000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 9, price: 25000 },
                { min: 10, max: 49, price: 20000 },
                { min: 50, max: 1000, price: 15000 }
            ]
        },
        variants: [
            { label: "PAKET FULLSET", specs: "Tali 2 Sisi + ID Card + Holder", price: 35000 },
            { label: "TALI LANYARD SAJA", specs: "Print 2 Sisi + Kait + Stopper", price: 25000 },
            { label: "CETAK ID CARD SAJA", specs: "PVC 0.76 Tebal (ATM)", price: 10000 }
        ],
        is_active: 1, is_archived: 0
    },

    // 6. MASTER NAME TAG (Resin)
    {
        id: "master_nametag",
        categoryId: "MERCH_APPAREL",
        name: "NAME TAG / NAMA DADA",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 25000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 10, price: 25000 },
                { min: 11, max: 1000, price: 20000 }
            ]
        },
        variants: [
            { label: "Kait Peniti", specs: "2x8 cm | Resin Cembung", price: 25000 },
            { label: "Kait Magnet", specs: "2x8 cm | Resin Cembung", price: 35000 }
        ],
        is_active: 1, is_archived: 0
    },

    // 7. MASTER MUG CUSTOM
    {
        id: "master_mug_custom",
        categoryId: "MERCH_APPAREL",
        name: "MUG KERAMIK CUSTOM",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 25000,
        min_qty: 1,
        advanced_features: {
            wholesale_rules: [
                { min: 1, max: 11, price: 25000 },
                { min: 12, max: 1000, price: 20000 }
            ]
        },
        variants: [
            { label: "Mug Standar Putih", specs: "SNI | Sublim Full Colour", price: 25000 }
        ],
        is_active: 1, is_archived: 0
    }
];

export async function runMerchReconstruction() {
    console.log("☢️ MERCHANDISE NUCLEAR CLEANUP STARTING...");
    try {
        // STRATEGY: DELETE BY KEYWORDS (To catch zombie products with wrong CategoryIDs)
        const zombies = await db.products.filter(p => {
            const name = p.name.toLowerCase();
            const cat = p.categoryId || '';
            // Keywords of OLD products seen in screenshots
            const isZombie = name.includes('jersey') ||
                name.includes('banner') ||
                name.includes('pin') ||
                name.includes('ganci') ||
                name.includes('lanyard') ||
                name.includes('tali') ||
                name.includes('mug') ||
                name.includes('kaos') ||
                name.includes('standing') ||
                cat === 'MERCH_APPAREL';
            return isZombie;
        }).toArray();

        console.log(`Found ${zombies.length} items to vaporize.`);

        for (const p of zombies) {
            await db.products.delete(p.id);
            console.log(`🔥 Vaporized: ${p.name} (${p.categoryId})`);
        }

        // SEED NEW MASTERS
        console.log("🌱 Seeding 7 Master Products...");
        for (const mp of MERCH_PRODUCTS) {
            await db.products.put(mp);
            console.log(`✅ Seeded: ${mp.name}`);
        }
        console.log("✅ NUCLEAR CLEANUP & RECONSTRUCTION COMPLETE");
    } catch (err) {
        console.error("❌ FAILED:", err);
    }
}
