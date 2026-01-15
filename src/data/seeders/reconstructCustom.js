import db from '../db/schema.js';

const CUSTOM_PRODUCTS = [
    // 1. MASTER PRINT DOKUMEN (Hybrid: Print + Jilid Option)
    {
        id: "master_print_doc",
        categoryId: "CUSTOM_SERVICES",
        name: "PRINT DOKUMEN (A4/F4 HVS)",
        input_mode: "MATRIX", // Step 1: Size, Step 2: Color
        calc_engine: "MATRIX_FIXED",
        base_price: 500,
        min_qty: 1,
        variants: [
            {
                label: "Kertas A4 (HVS 75gr)",
                specs: "21 x 29.7 cm | Skripsi/Makalah",
                price_list: {
                    "Hitam Putih (Teks)": 500,
                    "Warna (Standar)": 1500,
                    "Warna (Full Gambar)": 3000
                }
            },
            {
                label: "Kertas F4 (HVS 75gr)",
                specs: "21 x 33 cm | Legal/Folio",
                price_list: {
                    "Hitam Putih (Teks)": 750,
                    "Warna (Standar)": 2000,
                    "Warna (Full Gambar)": 4000
                }
            }
        ],
        finishing_groups: [
            {
                id: "fin_doc_jilid", title: "Jilid Sekalian? (Finishing)", type: "checkbox", required: false,
                options: [
                    { label: "Staples Pojok / Tengah", price: 1000 },
                    { label: "Jilid Lakban (Tape)", price: 4000 },
                    { label: "Jilid Spiral Kawat (Ring)", price: 15000 },
                    { label: "Softcover (Laminasi)", price: 25000 },
                    { label: "Hardcover (Skripsi/Emas)", price: 45000 }
                ]
            }
        ],
        is_active: 1, is_archived: 0
    },

    // 2. MASTER JASA JILID & FINISHING (Service Only)
    // For customers bringing their own paper
    {
        id: "master_jasa_jilid",
        categoryId: "CUSTOM_SERVICES",
        name: "JASA JILID / FINISHING (Bawa Kertas)",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 5000,
        min_qty: 1,
        variants: [
            { label: "Jilid Lakban (Tape)", specs: "Cover Mika Bening + Buffalo", price: 5000 },
            { label: "Jilid Spiral Plastik", specs: "Ring Plastik + Cover", price: 10000 },
            { label: "Jilid Spiral Kawat", specs: "Ring Besi + Cover", price: 20000 },
            { label: "Softcover (Binding Lem)", specs: "Cover Full Color + Laminasi", price: 30000 },
            { label: "Hardcover (Skripsi)", specs: "Board Tebal + Tinta Emas", price: 50000 },
            { label: "Laminasi Dokumen (A4/F4)", specs: "Press Panas (Per Lembar)", price: 5000 }
        ],
        is_active: 1, is_archived: 0
    },

    // 3. MASTER JASA DESAIN
    {
        id: "master_jasa_desain",
        categoryId: "CUSTOM_SERVICES",
        name: "JASA DESAIN / SETTING",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 10000,
        min_qty: 1,
        variants: [
            { label: "Setting Ringan", specs: "Ganti Teks/Tgl/Warna", price: 10000 },
            { label: "Desain Standar", specs: "Layout Banner/Brosur/Stiker", price: 35000 },
            { label: "Desain Premium", specs: "Konsep Baru/Vector/Logo", price: 75000 },
            { label: "Redraw / Tracing", specs: "Gambar Ulang Logo Pecah", price: 50000 }
        ],
        is_active: 1, is_archived: 0
    },

    // 4. MASTER ONGKOS KIRIM
    {
        id: "master_ongkir",
        categoryId: "CUSTOM_SERVICES",
        name: "ONGKOS KIRIM / DELIVERY",
        input_mode: "UNIT", // User edits price or uses variants as proxy
        calc_engine: "TIERED",
        base_price: 10000,
        min_qty: 1,
        variants: [
            { label: "Flat Rate (Dekat)", specs: "Area Sekitar Toko", price: 10000 },
            { label: "Flat Rate (Kota)", specs: "Area Dalam Kota", price: 20000 },
            { label: "Ekspedisi / Custom", specs: "JNE/J&T/Gosend (Sesuaikan Harga)", price: 1000 } // Admin overrides total
        ],
        is_active: 1, is_archived: 0
    },

    // 5. MASTER INPUT MANUAL (Wildcard)
    {
        id: "master_input_manual",
        categoryId: "CUSTOM_SERVICES",
        name: "INPUT MANUAL / BARANG LAIN",
        input_mode: "UNIT",
        calc_engine: "TIERED",
        base_price: 1000,
        min_qty: 1,
        variants: [
            { label: "Item Custom (x1000)", specs: "Input Qty = Harga (Cth: 50rb = Qty 50)", price: 1000 },
            { label: "Bahan Mentah", specs: "Jual Kertas/Lakban/Bahan", price: 5000 }
        ],
        is_active: 1, is_archived: 0
    }
];

export async function runCustomReconstruction() {
    console.log("🛠️ CUSTOM SERVICES RECONSTRUCTION STARTING...");
    try {
        // STEP 1: CREATE CATEGORY IF NOT EXISTS
        const customCategory = {
            id: 'CUSTOM_SERVICES',
            name: 'Custom & Services',
            logic_type: 'MIXED',
            sort_order: 5,
            is_active: 1
        };

        const existingCategory = await db.categories.get('CUSTOM_SERVICES');
        if (!existingCategory) {
            await db.categories.add(customCategory);
            console.log('✅ Created CUSTOM_SERVICES category');
        } else {
            // Ensure it's active
            await db.categories.update('CUSTOM_SERVICES', { is_active: 1 });
            console.log('✅ Activated existing CUSTOM_SERVICES category');
        }

        // STEP 2: DELETE OLD PRODUCTS
        const zombies = await db.products.where('categoryId').equals('CUSTOM_SERVICES').toArray();
        for (const p of zombies) await db.products.delete(p.id);
        console.log(`🗑️ Deleted ${zombies.length} old Custom products.`);

        // STEP 3: SEED NEW PRODUCTS
        for (const mp of CUSTOM_PRODUCTS) {
            await db.products.put(mp);
            console.log(`✅ Seeded: ${mp.name}`);
        }
        console.log("✅ CUSTOM SERVICES RECONSTRUCTION COMPLETE");
    } catch (err) {
        console.error("❌ FAILED:", err);
    }
}
