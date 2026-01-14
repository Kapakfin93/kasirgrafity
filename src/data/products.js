const products = [
    // POSTER
    {
        id: 'POSTER_A2',
        category_id: 'POSTER',
        name: 'Poster A2',
        pricing_model: 'UNIT',
        base_price: 22000
    },
    {
        id: 'POSTER_A1',
        category_id: 'POSTER',
        name: 'Poster A1',
        pricing_model: 'UNIT',
        base_price: 32000
    },
    {
        id: 'POSTER_A0',
        category_id: 'POSTER',
        name: 'Poster A0',
        pricing_model: 'UNIT',
        base_price: 55000
    },

    // BANNER
    {
        id: 'BANNER_FLEXI_280',
        category_id: 'BANNER',
        name: 'Banner Flexi 280gr',
        pricing_model: 'AREA',
        base_price: 18000
    },

    // STIKER
    {
        id: 'STIKER_WHITE_100',
        category_id: 'STIKER',
        name: 'Stiker White 100cm',
        pricing_model: 'LINEAR',
        base_price: 28000
    },
    {
        id: 'STIKER_WHITE_120',
        category_id: 'STIKER',
        name: 'Stiker White 120cm',
        pricing_model: 'LINEAR',
        base_price: 48000
    },

    // --- NEW CATEGORY: DIGITAL A3+ (STICKER & LABEL) ---
    {
        id: 'STIKER_A3_VINYL',
        category_id: 'DIGITAL_A3',
        name: 'Stiker Vinyl White A3+ (Print & Cut)',
        pricing_model: 'ADVANCED',
        base_price: 15000, // Harga Ecer Tertinggi
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
        id: 'STIKER_A3_CHROMO',
        category_id: 'DIGITAL_A3',
        name: 'Stiker Chromo A3+ (Label Makanan)',
        pricing_model: 'ADVANCED',
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
    },

    // --- NEW CATEGORY: PRINT DOKUMEN & PROMOSI (KERTAS) ---
    {
        id: 'ART_CARTON_260',
        category_id: 'DOC_PROMO',
        name: 'Art Carton 260gr A3+ (Kartu Nama/Cover)',
        pricing_model: 'ADVANCED',
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
    },

    // --- NEW CATEGORY: APPAREL & TEXTILE (JERSEY & KAOS) ---
    {
        id: 'JERSEY_FUTSAL_SET',
        category_id: 'APPAREL',
        name: 'Jersey Futsal Full Printing (Setelan)',
        pricing_model: 'ADVANCED',
        base_price: 150000,
        advanced_features: {
            min_order: 1,
            wholesale_rules: [
                { min: 1, max: 5, price: 150000 },   // Level 1: Sampel
                { min: 6, max: 11, price: 120000 },  // Level 2: Tim Kecil
                { min: 12, max: 9999, price: 100000 } // Level 3: Tim Besar
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
                // CRITICAL: TEXT INPUT MULTIPLIER LOGIC
                {
                    title: "Data Pemain",
                    type: "text_input",
                    label: "List Nama Punggung & Nomor",
                    placeholder: "Contoh: ANDI (10), BUDI (7)...",
                    price_add: 15000, // WARNING: Must be calculated as (15000 * Qty)
                    required: false,
                    note: "Biaya sablon nama Rp 15.000 per setel"
                }
            ]
        }
    },
    {
        id: 'KAOS_CUSTOM_DTF',
        category_id: 'APPAREL',
        name: 'Kaos Cotton Combed 30s + Sablon DTF',
        pricing_model: 'ADVANCED',
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
                        { label: "Logo Kecil (10cm)", price: -10000 }, // Lebih murah
                        { label: "A4 (Standard)", price: 0 },
                        { label: "A3 (Block Besar)", price: 15000 }
                    ]
                }
            ]
        }
    },

    // --- NEW CATEGORY: DISPLAY SYSTEM (BANNER TERPISAH) ---
    {
        id: 'X_BANNER_STD',
        category_id: 'DISPLAY_SYSTEM',
        name: 'X-Banner 60x160 (Rangka Fiber + Flexi)',
        pricing_model: 'ADVANCED',
        base_price: 75000,
        advanced_features: {
            min_order: 1,
            wholesale_rules: null, // Flat Price
            finishing_groups: [] // Paket komplit
        }
    },
    {
        id: 'Y_BANNER_PRO',
        category_id: 'DISPLAY_SYSTEM',
        name: 'Y-Banner 60x160 (Rangka Besi + Albatros)',
        pricing_model: 'ADVANCED',
        base_price: 125000,
        advanced_features: {
            min_order: 1,
            wholesale_rules: null,
            finishing_groups: []
        }
    },
    {
        id: 'ROLL_UP_BANNER',
        category_id: 'DISPLAY_SYSTEM',
        name: 'Roll Up Banner 60x160 (Alumunium + Luster)',
        pricing_model: 'ADVANCED',
        base_price: 250000,
        advanced_features: {
            min_order: 1,
            wholesale_rules: null,
            finishing_groups: []
        }
    },

    // --- NEW CATEGORY: OFFICE & CALENDAR ---
    {
        id: 'NOTA_NCR_2PLY',
        category_id: 'OFFICE',
        name: 'Nota NCR 2 Rangkap (Min. 10 Buku)',
        pricing_model: 'ADVANCED',
        base_price: 25000, // Harga per buku level ecer
        advanced_features: {
            min_order: 10, // KUNCI MINIMUM ORDER
            wholesale_rules: [
                { min: 10, max: 20, price: 25000 },
                { min: 21, max: 40, price: 22000 },
                { min: 41, max: 9999, price: 20000 }
            ],
            finishing_groups: [
                {
                    title: "Opsi Tambahan",
                    type: "checkbox", // Boleh pilih lebih dari satu
                    options: [
                        { label: "Nominator (Nomor Urut)", price: 2000 }, // Per buku
                        { label: "Porporasi (Garis Sobek)", price: 1000 }
                    ]
                }
            ]
        }
    },
    {
        id: 'KALENDER_DINDING_STD',
        category_id: 'OFFICE',
        name: 'Kalender Dinding 32x48 cm (A3+)',
        pricing_model: 'ADVANCED',
        base_price: 15000,
        advanced_features: {
            min_order: 1,
            wholesale_rules: [
                { min: 1, max: 49, price: 15000 },
                { min: 50, max: 9999, price: 5000 } // Harga Partai
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
        id: 'KALENDER_DINDING_JUMBO',
        category_id: 'OFFICE',
        name: 'Kalender Dinding 44x64 cm (Jumbo)',
        pricing_model: 'ADVANCED',
        base_price: 25000,
        advanced_features: {
            min_order: 50, // Biasanya partai besar
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
    },

    // --- NEW CATEGORY: MERCHANDISE ---
    {
        id: 'LANYARD_2SISI',
        category_id: 'MERCHANDISE',
        name: 'Tali Lanyard Tissue (Print 2 Sisi)',
        pricing_model: 'ADVANCED',
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
        id: 'PIN_PENITI_58',
        category_id: 'MERCHANDISE',
        name: 'Pin Peniti 58mm',
        pricing_model: 'ADVANCED',
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
];

export default products;
