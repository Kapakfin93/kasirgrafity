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
        },

        // --- NEW CATEGORIES: ADVANCED PRICING MODEL ---

        // 8. DIGITAL A3+ ADVANCED (Logic: ADVANCED)
        {
            id: "DIGITAL_A3",
            name: "Digital A3+ Advanced (Sticker & Label)",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "STIKER_A3_VINYL",
                    name: "Stiker Vinyl White A3+ (Print & Cut)",
                    base_price: 15000,
                    advanced_features: {
                        min_order: 5,
                        wholesale_rules: [
                            { min: 5, max: 49, price: 15000 },
                            { min: 50, max: 9999, price: 12000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Tipe Potong (Cutting)",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Tanpa Potong", price: 0 },
                                    { label: "Kiss Cut (+Jasa)", price: 3000, min_qty: 5 },
                                    { label: "Die Cut (+Jasa Mahal)", price: 5000, min_qty: 10 }
                                ]
                            },
                            {
                                title: "Laminasi (Pelapis)",
                                type: "radio",
                                required: false,
                                options: [
                                    { label: "Tanpa Laminasi", price: 0 },
                                    { label: "Glossy (Kilap)", price: 3000 },
                                    { label: "Doff (Matte)", price: 3000 }
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "STIKER_A3_CHROMO",
                    name: "Stiker Chromo A3+ (Label Makanan)",
                    base_price: 10000,
                    advanced_features: {
                        min_order: 5,
                        wholesale_rules: [
                            { min: 5, max: 99, price: 10000 },
                            { min: 100, max: 9999, price: 7500 }
                        ],
                        finishing_groups: [
                            {
                                title: "Tipe Potong",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Tanpa Potong", price: 0 },
                                    { label: "Kiss Cut", price: 2000, min_qty: 5 },
                                    { label: "Die Cut", price: 4000, min_qty: 10 }
                                ]
                            },
                            {
                                title: "Laminasi",
                                type: "radio",
                                required: false,
                                options: [
                                    { label: "Tanpa Laminasi", price: 0 },
                                    { label: "Glossy/Doff", price: 2500 }
                                ]
                            }
                        ]
                    }
                }
            ],
            finishings: []
        },

        // 9. PRINT DOKUMEN & PROMOSI (Logic: ADVANCED)
        {
            id: "DOC_PROMO",
            name: "Print Dokumen & Promosi",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "ART_CARTON_260",
                    name: "Art Carton 260gr A3+ (Kartu Nama/Cover)",
                    base_price: 7500,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: [
                            { min: 1, max: 50, price: 7500 },
                            { min: 51, max: 9999, price: 5000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Finishing",
                                type: "radio",
                                required: false,
                                options: [
                                    { label: "Tanpa Finishing", price: 0 },
                                    { label: "Potong Kotak", price: 2000 },
                                    { label: "Lipat/Creasing", price: 1000 }
                                ]
                            },
                            {
                                title: "Laminasi",
                                type: "radio",
                                required: false,
                                options: [
                                    { label: "Glossy/Doff 1 Sisi", price: 3000 },
                                    { label: "Glossy/Doff 2 Sisi", price: 5000 }
                                ]
                            }
                        ]
                    }
                }
            ],
            finishings: []
        },

        // 10. APPAREL & TEXTILE (Logic: ADVANCED)
        {
            id: "APPAREL",
            name: "Apparel & Textile (Jersey & Kaos)",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "JERSEY_FUTSAL_SET",
                    name: "Jersey Futsal Full Printing (Setelan)",
                    base_price: 150000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: [
                            { min: 1, max: 5, price: 150000 },
                            { min: 6, max: 11, price: 120000 },
                            { min: 12, max: 9999, price: 100000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Jenis Bahan",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Drifit Milano (Zigzag/Premium)", price: 0 },
                                    { label: "Drifit Benzema (Pori/Standard)", price: 0 }
                                ]
                            },
                            {
                                title: "Data Pemain",
                                type: "text_input",
                                label: "List Nama Punggung & Nomor",
                                placeholder: "Contoh: ANDI (10), BUDI (7)...",
                                price_add: 15000,
                                required: false,
                                note: "Biaya sablon nama Rp 15.000 per setel"
                            }
                        ]
                    }
                },
                {
                    id: "KAOS_CUSTOM_DTF",
                    name: "Kaos Cotton Combed 30s + Sablon DTF",
                    base_price: 85000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: [
                            { min: 1, max: 11, price: 85000 },
                            { min: 12, max: 9999, price: 75000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Ukuran Sablon",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Logo Kecil (10cm)", price: -10000 },
                                    { label: "A4 (Standard)", price: 0 },
                                    { label: "A3 (Block Besar)", price: 15000 }
                                ]
                            }
                        ]
                    }
                }
            ],
            finishings: []
        },

        // 11. DISPLAY SYSTEM (Logic: ADVANCED)
        {
            id: "DISPLAY_SYSTEM",
            name: "Display System (Banner Terpisah)",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "X_BANNER_STD",
                    name: "X-Banner 60x160 (Rangka Fiber + Flexi)",
                    base_price: 75000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: null,
                        finishing_groups: []
                    }
                },
                {
                    id: "Y_BANNER_PRO",
                    name: "Y-Banner 60x160 (Rangka Besi + Albatros)",
                    base_price: 125000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: null,
                        finishing_groups: []
                    }
                },
                {
                    id: "ROLL_UP_BANNER",
                    name: "Roll Up Banner 60x160 (Alumunium + Luster)",
                    base_price: 250000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: null,
                        finishing_groups: []
                    }
                }
            ],
            finishings: []
        },

        // 12. OFFICE & CALENDAR ADVANCED (Logic: ADVANCED)
        {
            id: "OFFICE_ADV",
            name: "Office & Calendar Advanced",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "NOTA_NCR_2PLY",
                    name: "Nota NCR 2 Rangkap (Min. 10 Buku)",
                    base_price: 25000,
                    advanced_features: {
                        min_order: 10,
                        wholesale_rules: [
                            { min: 10, max: 20, price: 25000 },
                            { min: 21, max: 40, price: 22000 },
                            { min: 41, max: 9999, price: 20000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Opsi Tambahan",
                                type: "checkbox",
                                options: [
                                    { label: "Nominator (Nomor Urut)", price: 2000 },
                                    { label: "Porporasi (Garis Sobek)", price: 1000 }
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "KALENDER_DINDING_STD",
                    name: "Kalender Dinding 32x48 cm (A3+)",
                    base_price: 15000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: [
                            { min: 1, max: 49, price: 15000 },
                            { min: 50, max: 9999, price: 5000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Jilid",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Klem Seng (Kaleng)", price: 2000 },
                                    { label: "Spiral Hanger", price: 5000 }
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "KALENDER_DINDING_JUMBO",
                    name: "Kalender Dinding 44x64 cm (Jumbo)",
                    base_price: 25000,
                    advanced_features: {
                        min_order: 50,
                        wholesale_rules: [
                            { min: 50, max: 9999, price: 15000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Jilid",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Klem Seng", price: 3000 },
                                    { label: "Spiral Hanger", price: 7000 }
                                ]
                            }
                        ]
                    }
                }
            ],
            finishings: []
        },

        // 13. MERCHANDISE ADVANCED (Logic: ADVANCED)
        {
            id: "MERCHANDISE",
            name: "Merchandise Advanced",
            logic_type: "ADVANCED",
            products: [
                {
                    id: "LANYARD_2SISI",
                    name: "Tali Lanyard Tissue (Print 2 Sisi)",
                    base_price: 25000,
                    advanced_features: {
                        min_order: 1,
                        wholesale_rules: [
                            { min: 1, max: 9, price: 25000 },
                            { min: 10, max: 49, price: 15000 },
                            { min: 50, max: 9999, price: 12000 }
                        ],
                        finishing_groups: [
                            {
                                title: "Aksesoris",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Kait Standar", price: 0 },
                                    { label: "Kait + Stopper", price: 3000 }
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "PIN_PENITI_58",
                    name: "Pin Peniti 58mm",
                    base_price: 5000,
                    advanced_features: {
                        min_order: 10,
                        wholesale_rules: [
                            { min: 10, max: 50, price: 5000 },
                            { min: 51, max: 9999, price: 3500 }
                        ],
                        finishing_groups: [
                            {
                                title: "Laminasi",
                                type: "radio",
                                required: true,
                                options: [
                                    { label: "Glossy (Kilap)", price: 0 },
                                    { label: "Doff (Matte)", price: 0 }
                                ]
                            }
                        ]
                    }
                }
            ],
            finishings: []
        }
    ]
};
