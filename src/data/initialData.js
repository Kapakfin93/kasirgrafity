export const MASTER_DATA = {
    categories: [
        // 1. BANNER OUTDOOR (Logic: AREA)
        {
            id: "BANNER",
            name: "Banner / Spanduk",
            logic_type: "AREA",
            products: [
                { id: "b1", name: "Flexi 280gr Standard", price: 18000 },
                { id: "b3", name: "Flexi Korea 440gr", price: 45000 },
                { id: "b4", name: "Flexi Backlite (Neonbox)", price: 65000 },
                { id: "b5", name: "Banner Jerman", price: 85000 }
            ],
            finishings: [
                { id: "f_ban_1", name: "Mata Ayam", price: 0 },
                { id: "f_ban_2", name: "Selongsong", price: 0 },
                { id: "f_ban_3", name: "Lipat Pres", price: 0 }
            ]
        },

        // 2. POSTER (Logic: MATRIX) - Combined UV & Indoor
        {
            id: "POSTER",
            name: "Poster (UV & Indoor)",
            logic_type: "MATRIX",
            products: [
                // UV VARIANTS
                { id: "uv_alb", name: "UV - Albatros", prices: { A2: 40000, A1: 75000, A0: 140000 } },
                { id: "uv_lus", name: "UV - Luster", prices: { A2: 45000, A1: 85000, A0: 160000 } },
                { id: "uv_pho", name: "UV - Photopaper", prices: { A2: 50000, A1: 95000, A0: 180000 } },
                // INDOOR VARIANTS
                { id: "in_alb", name: "Indoor - Albatros", prices: { A2: 22000, A1: 32000, A0: 55000 } },
                { id: "in_lus", name: "Indoor - Luster", prices: { A2: 25000, A1: 45000, A0: 85000 } },
                { id: "in_pho", name: "Indoor - Photopaper", prices: { A2: 28000, A1: 48000, A0: 90000 } }
            ],
            finishings: [
                { id: "f_pos_1", name: "Laminasi Doff/Glossy (A0/A1/A2)", price: 8000 },
                { id: "f_pos_2", name: "Mounting Foam Board", price: 15000 },
                { id: "f_pos_3", name: "Frame Kayu", price: 25000 },
                { id: "f_pos_4", name: "Frame Aluminium", price: 35000 },
                { id: "f_pos_5", name: "Roll Tube (Indoor Only)", price: 3000 }
            ]
        },

        // 3. TEXTILE & DTF (Logic: LINEAR)
        {
            id: "TEXTILE",
            name: "Textile & DTF",
            logic_type: "LINEAR",
            products: [
                { id: "tx_loc_90", name: "Kain Lokal (L: 90cm)", price: 35000 },
                { id: "tx_loc_120", name: "Kain Lokal (L: 120cm)", price: 45000 },
                { id: "tx_imp_90", name: "Kain Impor (L: 90cm)", price: 55000 },
                { id: "tx_imp_150", name: "Kain Impor (L: 150cm)", price: 90000 },
                { id: "tx_imp_200", name: "Kain Impor (L: 200cm)", price: 120000 },
                { id: "dtf_60", name: "DTF (L: 60cm)", price: 45000 }
            ],
            finishings: [
                { id: "f_tex_1", name: "Potong Pas Gambar", price: 0 },
                { id: "f_tex_2", name: "Jahit Keliling + Tali", price: 5000 },
                { id: "f_tex_3", name: "Jahit Obras", price: 3000 }
            ]
        },

        // 4. DIGITAL A3+ (Logic: UNIT_SHEET)
        {
            id: "A3PLUS",
            name: "Digital A3+ Production",
            logic_type: "UNIT_SHEET",
            products: [
                { id: "a3_1", name: "HVS A3+ 100gr", price: 3000 },
                { id: "a3_2", name: "Art Paper 150gr", price: 5000 },
                { id: "a3_3", name: "Art Carton 260gr", price: 7500 },
                { id: "a3_4", name: "Sticker Chromo", price: 5000 },
                { id: "a3_5", name: "Sticker Vinyl White", price: 8500 },
                { id: "a3_6", name: "Sticker Transparan", price: 8500 }
            ],
            finishings: [
                { id: "f_a3_1", name: "Kiss Cut", price: 5000 },
                { id: "f_a3_2", name: "Die Cut", price: 8000 },
                { id: "f_a3_3", name: "Laminasi", price: 3000 },
                { id: "f_a3_4", name: "KOMBO: Kiss Cut + Lam", price: 8000 },
                { id: "f_a3_5", name: "KOMBO: Die Cut + Lam", price: 11000 }
            ]
        },

        // 5. MERCHANDISE (Logic: UNIT)
        {
            id: "MERCH",
            name: "Merchandise & Souvenir",
            logic_type: "UNIT",
            products: [
                { id: "m1", name: "Mug Keramik Custom", price: 25000 },
                { id: "m2", name: "Pin Peniti 58mm", price: 4000 },
                { id: "m3", name: "Lanyard Tissue (2 Sisi)", price: 15000 },
                { id: "m4", name: "Ganci Akrilik (2 Sisi)", price: 8000 }
            ],
            finishings: [
                { id: "f_m_1", name: "Box Eksklusif", price: 5000 },
                { id: "f_m_2", name: "Plastik + Pita", price: 2000 }
            ]
        },

        // 6. OFFICE & CALENDAR (Logic: UNIT)
        {
            id: "OFFICE",
            name: "Office & Calendar",
            logic_type: "UNIT",
            products: [
                { id: "o1", name: "Stempel Flash (Sedang)", price: 65000 },
                { id: "o2", name: "Stempel Flash (Besar)", price: 85000 },
                { id: "o3", name: "Stempel Flash (Kecil)", price: 35000 },
                { id: "o4", name: "Nota NCR 2 Ply (Buku)", price: 25000 },
                { id: "c1", name: "Kalender Duduk", price: 25000 },
                { id: "c2", name: "Kalender Dinding (6 Lbr)", price: 15000 }
            ],
            finishings: [
                { id: "f_o_1", name: "Nomorator (Nota)", price: 2000 },
                { id: "f_o_2", name: "Perforasi/Cacah", price: 0 },
                { id: "f_c_1", name: "Klem Seng / Kaleng", price: 2000 },
                { id: "f_c_2", name: "Spiral Hanger", price: 3500 }
            ]
        },

        // 7. CUSTOM (Logic: MANUAL)
        {
            id: "CUSTOM",
            name: "Custom / Jasa Lain",
            logic_type: "MANUAL",
            products: [
                { id: "cust_1", name: "Input Harga Manual", price: 0 },
                { id: "cust_2", name: "Biaya Desain", price: 0 },
                { id: "cust_3", name: "Ongkos Kirim", price: 0 }
            ],
            finishings: []
        }
    ]
};
