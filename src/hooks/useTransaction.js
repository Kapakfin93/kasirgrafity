/**
 * useTransaction Hook - REFACTORED
 * Temporary UI workspace for configuring items before adding to order
 * 
 * ARCHITECTURE:
 * - This hook manages TEMPORARY state only (during item configuration)
 * - Once payment confirmed → data moves to OrderStore (single source of truth)
 * - No business logic here - delegates to core calculators
 * - Master data loaded ONLY from useProductStore (DB-backed, NO FALLBACK)
 */

import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
// REMOVED: import { MASTER_DATA } from '../data/initialData'; // NO FALLBACK
import { useProductStore } from '../stores/useProductStore';
import {
    calculateAreaPrice,
    calculateLinearPrice,
    calculateMatrixPrice,
    calculateUnitSheetPrice,
    calculateUnitPrice,
    calculateManualPrice
} from '../core/calculators';
import { validateTransactionInput } from '../core/validators';
import { buildItemDescription, extractFinishingNames } from '../core/descriptionBuilder';

const INITIAL_INPUT_STATE = {
    product: null,
    qty: 1,
    length: '',
    width: '',
    sizeKey: null,
    manualPrice: '',
    selectedFinishings: []
};

const INITIAL_PAYMENT_STATE = {
    mode: 'TUNAI',
    amountPaid: '',
    isLocked: false,
    showNotaPreview: false
};

// ============================================
// PRIORITY SYSTEM CONFIGURATION
// ============================================
// ⚠️ KONFIGURASI BIAYA PRIORITAS (EDIT DI SINI) ⚠️
// Ubah nilai di bawah ini untuk mengatur harga dan durasi layanan prioritas
export const PRIORITY_CONFIG = {
    // --- Harga Layanan ---
    FEE_EXPRESS: 15000,           // Biaya Layanan Express (Rp)
    FEE_URGENT: 30000,            // Biaya Layanan Urgent (Rp)

    // --- Durasi Target Selesai ---
    HOURS_STANDARD: 24,           // Standard: +24 jam
    HOURS_EXPRESS: 5,             // Express: +5 jam (atau hari ini jam 17:00)
    HOURS_URGENT: 2,              // Urgent: +2 jam

    // --- Pengaturan Lainnya ---
    EXPRESS_CUTOFF_HOUR: 17       // Express target jam berapa (24-hour format)
};
// ============================================


// Transaction Stage Enum
export const TRANSACTION_STAGES = {
    CART: 'CART',
    AWAITING_PAYMENT: 'AWAITING_PAYMENT',
    POST_PAYMENT: 'POST_PAYMENT'
};

export function useTransaction() {
    // Get store data (DB-backed ONLY - NO FALLBACK)
    const { categories: storeCategories, initialize, isInitialized } = useProductStore();

    // ONLY use store categories - no fallback to static data
    const categories = storeCategories;

    // TEMPORARY WORKSPACE STATE
    const [currentCategory, setCurrentCategory] = useState(categories[0] || null);
    const [configuratorInput, setConfiguratorInput] = useState(INITIAL_INPUT_STATE);
    const [tempItems, setTempItems] = useState([]); // Temporary cart items
    const [paymentState, setPaymentState] = useState(INITIAL_PAYMENT_STATE);
    const [transactionStage, setTransactionStage] = useState(TRANSACTION_STAGES.CART);

    // Customer Snapshot State
    const [customerSnapshot, setCustomerSnapshot] = useState({
        name: '',
        whatsapp: ''
    });

    // Target Date State (for Priority System)
    const [targetDate, setTargetDate] = useState(() => {
        const now = new Date();
        now.setHours(now.getHours() + 24); // Default: +24h
        return now.toISOString().slice(0, 16); // Format for datetime-local input
    });

    // Initialize store on mount
    useEffect(() => {
        if (!isInitialized) {
            initialize().catch(console.error);
        }
    }, [isInitialized, initialize]);

    // Update currentCategory when store loads
    useEffect(() => {
        if (storeCategories.length > 0 && !currentCategory) {
            setCurrentCategory(storeCategories[0]);
        }
    }, [storeCategories, currentCategory]);

    // === CATEGORY ACTIONS ===
    const selectCategory = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        if (cat) {
            setCurrentCategory(cat);
            setConfiguratorInput(INITIAL_INPUT_STATE);
        }
    };

    // === CUSTOMER ACTIONS ===
    const updateCustomerSnapshot = (updates) => {
        setCustomerSnapshot(prev => ({ ...prev, ...updates }));
    };

    const clearCustomerSnapshot = () => {
        setCustomerSnapshot({ name: '', whatsapp: '' });
    };

    /**
     * buildCartItem - SINGLE GATEKEEPER FOR ALL ITEMS
     * STRICT CONTRACT ENFORCEMENT - NO FALLBACKS ALLOWED
     * 
     * This is the ONLY function that can create valid cart items.
     * ALL configurators MUST send raw data here.
     * 
     * @param {Object} rawInput - Raw data from configurator
     * @param {Object} rawInput.product - Product object from MASTER_DATA (REQUIRED)
     * @param {number} rawInput.qty - Quantity (REQUIRED, >= 1)
     * @param {Object} rawInput.dimensions - Dimensions based on pricingType
     * @param {Array} rawInput.finishings - Selected finishing objects
     * @param {number} rawInput.manualPrice - Manual price (only for MANUAL type)
     * @returns {Object} Validated CartItem
     * @throws {Error} If any required field is missing or invalid
     */
    // ===== STRICT CONTRACT BUILDER =====
    const buildCartItem = (rawInput) => {
        console.log('🔨 buildCartItem called with:', rawInput);

        const { product, qty, dimensions = {}, finishings = [], manualPrice } = rawInput;

        // Helper: Calculate total finishing cost from finishings array
        const calculateFinishingCost = (finishings) => {
            if (!finishings || finishings.length === 0) return 0;
            return finishings.reduce((total, f) => total + (f.price || 0), 0);
        };

        // 1. Validate product data (MUST exist)
        if (!product || !product.id || !product.name) {
            throw new Error('CART ITEM REJECTED: Product data tidak valid');
        }

        // 2. Validate qty (MUST be > 0)
        if (!qty || qty <= 0 || isNaN(qty)) {
            throw new Error(`CART ITEM REJECTED: Quantity harus > 0 (${qty})`);
        }

        // Strict Type Conversion for Global Use
        const safeQty = parseInt(qty);

        // Detect pricingType: PRIORITIZE product.pricing_model (Gen 3.2), fallback to category
        const pricingType = product.pricing_model || currentCategory?.logic_type || 'MANUAL';

        // ===== CALCULATE PRICE (using core calculators) =====
        let calculatedPrice = 0;
        let unitPrice = 0;

        try {
            switch (pricingType) {
                case 'AREA':
                    // 1. Strict Parsing & Validation
                    const areaBasePrice = parseFloat(product.price);
                    const areaLength = parseFloat(dimensions.length);
                    const areaWidth = parseFloat(dimensions.width);

                    if (isNaN(areaBasePrice)) throw new Error(`CART REJECTED: Harga produk tidak valid (${product.price})`);
                    if (isNaN(areaLength) || areaLength <= 0) throw new Error(`CART REJECTED: Panjang tidak valid (${dimensions.length})`);
                    if (isNaN(areaWidth) || areaWidth <= 0) throw new Error(`CART REJECTED: Lebar tidak valid (${dimensions.width})`);

                    // 2. Re-Calculate using Core Calculator (CORRECTED PARAMS)
                    const areaResult = calculateAreaPrice(
                        areaLength,
                        areaWidth,
                        areaBasePrice,
                        safeQty
                    );

                    if (!areaResult || isNaN(areaResult.subtotal)) {
                        throw new Error(`CALCULATION FAILED: Hasil perhitungan AREA invalid`);
                    }

                    // Add Finishing Cost
                    const areaFinishingCost = calculateFinishingCost(finishings);
                    calculatedPrice = areaResult.subtotal + (areaFinishingCost * safeQty);
                    unitPrice = (areaResult.subtotal / safeQty) + areaFinishingCost;
                    break;

                case 'LINEAR':
                    // 1. Strict Parsing & Validation
                    const linearBasePrice = parseFloat(product.price);
                    const linearLength = parseFloat(dimensions.length);

                    if (isNaN(linearBasePrice)) throw new Error(`CART REJECTED: Harga produk tidak valid (${product.price})`);
                    if (isNaN(linearLength) || linearLength <= 0) throw new Error(`CART REJECTED: Panjang tidak valid (${dimensions.length})`);

                    // 2. Re-Calculate using Core Calculator (CORRECTED PARAMS)
                    const linearResult = calculateLinearPrice(
                        linearLength,
                        linearBasePrice,
                        safeQty
                    );

                    if (!linearResult || isNaN(linearResult.subtotal)) {
                        throw new Error(`CALCULATION FAILED: Hasil perhitungan LINEAR invalid`);
                    }

                    // Add Finishing Cost
                    const linFinishingCost = calculateFinishingCost(finishings);
                    calculatedPrice = linearResult.subtotal + (linFinishingCost * safeQty);
                    unitPrice = (linearResult.subtotal / safeQty) + linFinishingCost;
                    break;

                case 'MATRIX':
                    // MATRIX pricing for Poster/Size-based products
                    // Data format: product.prices = { A2: 40000, A1: 75000, A0: 140000 }
                    const { sizeKey } = dimensions;

                    // Validate product has prices object
                    if (!product.prices || typeof product.prices !== 'object') {
                        throw new Error(`CART ITEM REJECTED: Product ${product.name} tidak memiliki data prices`);
                    }

                    // Validate sizeKey is selected
                    if (!sizeKey) {
                        throw new Error(`CART ITEM REJECTED: Ukuran (sizeKey) belum dipilih`);
                    }

                    // Get price for selected size
                    const priceForSize = product.prices[sizeKey];

                    if (!priceForSize || priceForSize <= 0) {
                        throw new Error(`CART ITEM REJECTED: Harga tidak ditemukan untuk ukuran ${sizeKey}`);
                    }

                    // Calculate with finishing cost
                    const matrixFinishingCost = calculateFinishingCost(finishings);
                    const matrixResult = calculateMatrixPrice(
                        sizeKey,           // 'A2', 'A1', etc
                        product.prices,    // { A2: 40000, A1: 75000, ... }
                        safeQty
                    );

                    calculatedPrice = matrixResult.subtotal + (matrixFinishingCost * safeQty);
                    unitPrice = priceForSize + matrixFinishingCost;
                    break;

                case 'UNIT':
                    // UNIT pricing for Merchandise/Office
                    const finishingCost = calculateFinishingCost(finishings);
                    const unitResult = calculateUnitPrice(
                        product.price || 0,  // basePrice
                        finishingCost,        // total finishing cost
                        safeQty
                    );

                    if (!unitResult.subtotal || unitResult.subtotal <= 0) {
                        throw new Error(`CART ITEM REJECTED: Harga tidak valid untuk ${product.name}`);
                    }

                    calculatedPrice = unitResult.subtotal;
                    unitPrice = unitResult.subtotal / safeQty; // Calculate unit price from total
                    break;

                case 'UNIT_SHEET':
                    // UNIT_SHEET pricing for A3+ products
                    const cuttingCost = dimensions?.cuttingCost || 0;
                    const sheetFinishingCost = calculateFinishingCost(finishings);

                    const sheetResult = calculateUnitSheetPrice(
                        product.price || 0,  // basePrice
                        cuttingCost,          // cutting cost
                        sheetFinishingCost,   // finishing cost
                        safeQty
                    );

                    if (!sheetResult.subtotal || sheetResult.subtotal <= 0) {
                        throw new Error(`CART ITEM REJECTED: Harga tidak valid untuk ${product.name}`);
                    }

                    calculatedPrice = sheetResult.subtotal;
                    unitPrice = sheetResult.subtotal / safeQty; // Calculate unit price from total
                    break;

                case 'MANUAL':
                    // Trust user input manualPrice
                    const inputManualPrice = parseFloat(manualPrice);
                    if (!inputManualPrice || inputManualPrice <= 0) {
                        throw new Error("Harga manual wajib diisi dan harus > 0");
                    }

                    const manualResult = calculateManualPrice(inputManualPrice, safeQty);
                    calculatedPrice = manualResult.subtotal;
                    unitPrice = inputManualPrice;
                    break;

                case 'ADVANCED':
                    // ADVANCED pricing model - Trust pre-calculated payload from AdvancedProductForm
                    // The form already calculated wholesale tiers + finishing costs

                    // Extract values from rawInput (these come from AdvancedProductForm's onSubmit)
                    const advancedTotal = rawInput.total_price || dimensions.total_price;
                    const advancedUnitPrice = rawInput.unit_price_final || dimensions.unit_price_final;

                    // Validate we have the required data
                    if (!advancedTotal || advancedTotal <= 0) {
                        throw new Error('CART ITEM REJECTED: Total price dari ADVANCED form tidak valid');
                    }

                    if (!advancedUnitPrice || advancedUnitPrice <= 0) {
                        throw new Error('CART ITEM REJECTED: Unit price dari ADVANCED form tidak valid');
                    }

                    // Trust the pre-calculated values
                    calculatedPrice = advancedTotal;
                    unitPrice = advancedUnitPrice;

                    console.log('✅ ADVANCED pricing: Using pre-calculated values', {
                        total: calculatedPrice,
                        unitPrice,
                        qty: safeQty
                    });
                    break;

                default:
                    throw new Error(`CART ITEM REJECTED: Pricing type tidak dikenali (${pricingType})`);
            }
        } catch (calcError) {
            throw new Error(`CART ITEM REJECTED: Error kalkulasi harga - ${calcError.message}`);
        }

        // 5. Validate calculated price (MUST be > 0, NO zero-price items in final cart)
        if (typeof calculatedPrice !== 'number' || isNaN(calculatedPrice)) {
            throw new Error(`CART ITEM REJECTED: Harga hasil kalkulasi NaN (${product.name})`);
        }

        if (calculatedPrice <= 0) {
            throw new Error(`CART ITEM REJECTED: Harga harus > 0 (${product.name}: Rp ${calculatedPrice})`);
        }

        // ===== BUILD DESCRIPTION (using core builder) =====
        const finishingNames = extractFinishingNames(finishings);
        let description = '';

        try {
            description = buildItemDescription({
                productName: product.name,
                pricingType: pricingType,
                specs: dimensions,
                finishingNames: finishingNames
            });
        } catch (descError) {
            throw new Error(`CART ITEM REJECTED: Error membuat deskripsi - ${descError.message}`);
        }

        // 6. Validate description (MUST contain product name)
        if (!description || !description.includes(product.name)) {
            throw new Error(`CART ITEM REJECTED: Deskripsi tidak valid (${description})`);
        }

        // 7. Validate calculated price (MUST be > 0 and not NaN)
        if (!calculatedPrice || isNaN(calculatedPrice) || calculatedPrice <= 0) {
            throw new Error(`CART ITEM REJECTED: Harga tidak valid (${calculatedPrice}). Periksa input dimensi/ukuran.`);
        }

        if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error(`CART ITEM REJECTED: Harga satuan tidak valid (${unitPrice})`);
        }

        // ===== BUILD VALIDATED CART ITEM =====
        const cartItem = {
            id: uuid(),
            productId: product.id,
            name: product.name,
            productName: product.name, // For ReceiptSection compatibility
            description: description,
            pricingType: pricingType,
            qty: safeQty,
            dimensions: dimensions,
            finishings: finishings.map(f => ({
                id: f.id,
                name: f.name,
                price: f.price || 0
            })),
            unitPrice: unitPrice,
            totalPrice: calculatedPrice
        };

        // ===== ADVANCED PRICING: Store additional metadata =====
        if (pricingType === 'ADVANCED') {
            // Store production notes (from AdvancedProductForm)
            cartItem.notes = rawInput.notes || dimensions.notes || '';

            // Store financial breakdown for owner dashboard
            cartItem.meta = {
                revenue_print: rawInput.revenue_print || dimensions.revenue_print || 0,
                revenue_finish: rawInput.revenue_finish || dimensions.revenue_finish || 0,
                detail_options: rawInput.detail_options || dimensions.detail_options || null
            };

            console.log('📊 ADVANCED metadata stored:', {
                notes: cartItem.notes,
                revenue_breakdown: cartItem.meta
            });
        }

        console.log("✅ Cart item built successfully:", cartItem);
        return cartItem;
    };
    // === CONFIGURATOR ACTIONS ===
    const updateConfiguratorInput = (updates) => {
        setConfiguratorInput(prev => ({ ...prev, ...updates }));
    };

    // === PRICE CALCULATION (delegated to core) ===
    const _calculateCurrentPrice = () => {
        const { product, qty, length, width, sizeKey, manualPrice, selectedFinishings } = configuratorInput;
        const logic_type = currentCategory?.logic_type;

        // Rule #3: FAIL-SAFE. Return 0, not NaN.
        if (!currentCategory) return { subtotal: 0, breakdown: '' };
        if (!product && logic_type !== 'MANUAL') return { subtotal: 0, breakdown: '' };

        // Calculate finishing cost
        const finishingCost = (selectedFinishings || []).reduce((sum, f) => sum + (f.price || 0), 0);

        let result = { subtotal: 0, breakdown: '' };

        try {
            // Delegate to core calculators
            switch (logic_type) {
                case 'AREA':
                    if (length && width && product?.price) {
                        result = calculateAreaPrice(parseFloat(length), parseFloat(width), product.price, qty);
                        result.subtotal += (finishingCost * qty);
                    }
                    break;

                case 'LINEAR':
                    if (length && product?.price) {
                        result = calculateLinearPrice(parseFloat(length), product.price, qty);
                        result.subtotal += (finishingCost * qty);
                    }
                    break;

                case 'MATRIX':
                    if (sizeKey && product?.prices) {
                        result = calculateMatrixPrice(sizeKey, product.prices, qty);
                        result.subtotal += (finishingCost * qty);
                    }
                    break;

                case 'UNIT_SHEET':
                    if (product?.price) {
                        result = calculateUnitSheetPrice(product.price, 0, finishingCost, qty);
                    }
                    break;

                case 'UNIT':
                    if (product?.price) {
                        result = calculateUnitPrice(product.price, finishingCost, qty);
                    }
                    break;

                case 'MANUAL':
                    const price = parseFloat(manualPrice) || 0;
                    result = calculateManualPrice(price, qty);
                    break;
            }
        } catch (e) {
            console.error("Calculation Error:", e);
            return { subtotal: 0, breakdown: 'Error' };
        }

        return {
            subtotal: isNaN(result.subtotal) ? 0 : Math.floor(result.subtotal),
            breakdown: result.breakdown
        };
    };

    // === CART ACTIONS ===
    /**
     * addItemToCart - ENFORCES ALL ITEMS GO THROUGH buildCartItem
     * 
     * Accepts EITHER:
     * 1. preConfiguredItem (from modern configurators like Poster/Textile)
     * 2. null (uses configuratorInput for legacy flow)
     * 
     * BOTH paths MUST call buildCartItem() - NO EXCEPTIONS
     */
    const addItemToCart = (preConfiguredItem = null) => {
        console.log("=== addItemToCart called ===");
        console.log("preConfiguredItem:", preConfiguredItem);

        try {
            let rawInput;

            if (preConfiguredItem) {
                // MODERN CONFIGURATOR PATH
                // IMPORTANT: Handle BOTH old and new structures

                // Check if it's NEW structure (has 'product' object directly)
                if (preConfiguredItem.product && typeof preConfiguredItem.product === 'object') {
                    // NEW: Direct product object from refactored configurators
                    rawInput = {
                        product: preConfiguredItem.product,
                        qty: preConfiguredItem.qty || 1,
                        dimensions: preConfiguredItem.dimensions || {},
                        finishings: preConfiguredItem.finishings || [],
                        manualPrice: preConfiguredItem.manualPrice,
                        // ADVANCED model properties (from AdvancedProductForm)
                        total_price: preConfiguredItem.total_price,
                        unit_price_final: preConfiguredItem.unit_price_final,
                        revenue_print: preConfiguredItem.revenue_print,
                        revenue_finish: preConfiguredItem.revenue_finish,
                        notes: preConfiguredItem.notes,
                        detail_options: preConfiguredItem.detail_options
                    };
                } else {
                    // OLD: productId/productName structure from un-refactored configurators
                    rawInput = {
                        product: {
                            id: preConfiguredItem.productId,
                            name: preConfiguredItem.productName,
                            price: preConfiguredItem.basePrice || preConfiguredItem.unitPrice || 0
                        },
                        qty: preConfiguredItem.quantity || preConfiguredItem.qty || 1,
                        dimensions: preConfiguredItem.specs || preConfiguredItem.dimensions || {},
                        finishings: preConfiguredItem.finishings || [],
                        manualPrice: preConfiguredItem.priceInput
                    };
                }
            } else {
                // LEGACY CONFIGURATOR PATH (uses configuratorInput)
                rawInput = {
                    product: configuratorInput.product,
                    qty: configuratorInput.qty,
                    dimensions: {
                        length: configuratorInput.length,
                        width: configuratorInput.width,
                        sizeKey: configuratorInput.sizeKey
                    },
                    finishings: configuratorInput.selectedFinishings || [],
                    manualPrice: configuratorInput.manualPrice
                };
            }

            console.log("Mapped rawInput for buildCartItem:", rawInput);

            // === CRITICAL: ALL ITEMS MUST GO THROUGH buildCartItem ===
            const validatedItem = buildCartItem(rawInput);

            // Add to cart
            setTempItems(prev => [...prev, validatedItem]);
            setConfiguratorInput(INITIAL_INPUT_STATE);

            console.log("✅ Item added to cart");

        } catch (error) {
            console.error("❌ Add to Cart Failed:", error);
            alert(`GAGAL TAMBAH ITEM:\n${error.message}`);
        }
    };

    const removeItem = (id) => {
        setTempItems(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => {
        setTempItems([]);
        setConfiguratorInput(INITIAL_INPUT_STATE);
    };

    // === PRIORITY SYSTEM (ANTI-STACKING FEE LOGIC) ===
    const setPriorityStandard = () => {
        // Standard: +24h, no fee
        const now = new Date();
        now.setHours(now.getHours() + PRIORITY_CONFIG.HOURS_STANDARD);
        setTargetDate(now.toISOString().slice(0, 16));

        // Remove any existing priority fees
        setTempItems(prev => prev.filter(item =>
            item.id !== 'fee-express' && item.id !== 'fee-urgent'
        ));
    };

    const setPriorityExpress = () => {
        // Express: Today 17:00 or +5h (whichever is later), +15k fee
        const now = new Date();
        const today17 = new Date();
        today17.setHours(PRIORITY_CONFIG.EXPRESS_CUTOFF_HOUR, 0, 0, 0);
        const plus5h = new Date(now.getTime() + PRIORITY_CONFIG.HOURS_EXPRESS * 60 * 60 * 1000);

        const targetTime = today17 > now ? today17 : plus5h;
        setTargetDate(targetTime.toISOString().slice(0, 16));

        // ANTI-STACKING: Remove ALL existing priority fees first
        setTempItems(prev => {
            const cleaned = prev.filter(item =>
                item.id !== 'fee-express' && item.id !== 'fee-urgent'
            );

            // Add Express fee
            return [...cleaned, {
                id: 'fee-express',
                productId: 'SERVICE_EXPRESS',
                name: 'Layanan Prioritas (Express)',
                productName: 'Layanan Prioritas (Express)',
                description: 'Percepatan produksi (selesai hari ini)',
                pricingType: 'SERVICE',
                qty: 1,
                dimensions: {},
                finishings: [],
                unitPrice: PRIORITY_CONFIG.FEE_EXPRESS,
                totalPrice: PRIORITY_CONFIG.FEE_EXPRESS
            }];
        });
    };

    const setPriorityUrgent = () => {
        // Urgent: +2h, +30k fee
        const now = new Date();
        now.setHours(now.getHours() + PRIORITY_CONFIG.HOURS_URGENT);
        setTargetDate(now.toISOString().slice(0, 16));

        // ANTI-STACKING: Remove ALL existing priority fees first
        setTempItems(prev => {
            const cleaned = prev.filter(item =>
                item.id !== 'fee-express' && item.id !== 'fee-urgent'
            );

            // Add Urgent fee
            return [...cleaned, {
                id: 'fee-urgent',
                productId: 'SERVICE_URGENT',
                name: 'Layanan RUSH (Urgent)',
                productName: 'Layanan RUSH (Urgent)',
                description: 'Prioritas tertinggi (selesai 2 jam)',
                pricingType: 'SERVICE',
                qty: 1,
                dimensions: {},
                finishings: [],
                unitPrice: PRIORITY_CONFIG.FEE_URGENT,
                totalPrice: PRIORITY_CONFIG.FEE_URGENT
            }];
        });
    };

    // === CALCULATION ===
    const calculateTotal = () => {
        // Standardized: Total uses 'totalPrice' field
        return tempItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    };

    // === PAYMENT ACTIONS ===
    const updatePaymentState = (updates) => {
        setPaymentState(prev => ({ ...prev, ...updates }));
    };

    /**
     * Validate stage transition from CART to AWAITING_PAYMENT
     * Rule: Items with totalPrice === 0 block transition
     */
    const validateStageTransition = () => {
        // Check for zero-price items
        const zeroItems = tempItems.filter(item => item.totalPrice === 0);
        if (zeroItems.length > 0) {
            const itemNames = zeroItems.map(i => i.productName).join(', ');
            throw new Error(`Item dengan harga 0 tidak boleh diproses: ${itemNames}`);
        }

        // Check cart not empty
        if (tempItems.length === 0) {
            throw new Error('Keranjang kosong');
        }

        return true;
    };

    const confirmPayment = (isTempo = false) => {
        const total = calculateTotal();

        // SANITASI INPUT untuk Tempo mode
        // Jika isTempo aktif dan amountPaid kosong/invalid, paksa jadi 0
        let paid = parseFloat(paymentState.amountPaid) || 0;

        // [SOP V2.0] TEMPO MODE BYPASS
        // Jika Tempo aktif, skip validasi pembayaran - langsung lock & proceed
        if (isTempo) {
            console.log('🎫 TEMPO MODE: Bypassing payment validation, paid =', paid);
            setPaymentState(prev => ({ ...prev, isLocked: true, amountPaid: paid }));
            return true;
        }

        // VALIDASI NORMAL: Hanya blokir jika 0 atau minus (untuk non-Tempo)
        // DP (kurang dari total) HARUS LOLOS
        if (paymentState.mode === 'TUNAI' && paid <= 0) {
            alert('Nominal pembayaran tidak valid!');
            return false;
        }

        // Lock the transaction
        setPaymentState(prev => ({ ...prev, isLocked: true }));
        return true;
    };

    /**
     * assertValidCartItem - Validate individual cart item
     * @throws {Error} If item violates contract
     */
    const assertValidCartItem = (item, index) => {
        if (!item.name || item.name.trim() === '') {
            throw new Error(`ORDER REJECTED: Item #${index + 1} tidak memiliki nama`);
        }

        if (!item.description || item.description.trim() === '') {
            throw new Error(`ORDER REJECTED: Item #${index + 1} "${item.name}" tidak memiliki deskripsi`);
        }

        if (typeof item.totalPrice !== 'number' || isNaN(item.totalPrice)) {
            throw new Error(`ORDER REJECTED: Item #${index + 1} "${item.name}" memiliki harga invalid (NaN)`);
        }

        if (item.totalPrice <= 0) {
            throw new Error(`ORDER REJECTED: Item #${index + 1} "${item.name}" memiliki harga ${item.totalPrice} (harus > 0)`);
        }
    };

    /**
     * finalizeOrder (Rule #1)
     * Collects and hands over data to useOrderStore.createOrder
     * Does NOT touch database directly.
     * 
     * STRICT VALIDATION: Block empty or invalid orders
     * 
     * @param {Function} createOrderFn - useOrderStore.createOrder
     * @param {Object} currentUser - Current logged-in user (for audit)
     * @param {boolean} isTempo - [SOP V2.0] TEMPO/VIP flag to bypass payment gate
     */
    const finalizeOrder = async (createOrderFn, currentUser, isTempo = false) => {
        console.log("=== finalizeOrder called ===");
        console.log("isTempo:", isTempo);

        // ===== CRITICAL VALIDATION: BLOCK INVALID ORDERS =====

        // 0. Validate Customer Snapshot (MANDATORY)
        if (!customerSnapshot.name || customerSnapshot.name.trim() === '') {
            throw new Error("ORDER REJECTED: Nama customer wajib diisi");
        }

        // 0b. Validate Current User (for meta.createdBy)
        if (!currentUser || !currentUser.name) {
            throw new Error("ORDER REJECTED: CS/Kasir tidak terdeteksi. Silakan login kembali.");
        }

        // 1. Check for empty cart
        if (!tempItems || tempItems.length === 0) {
            throw new Error("ORDER REJECTED: Tidak ada item dalam keranjang");
        }

        console.log(`Validating ${tempItems.length} items...`);

        // 2. Validate EVERY item
        try {
            tempItems.forEach((item, index) => {
                assertValidCartItem(item, index);
            });
            console.log("✅ All items passed validation");
        } catch (validationError) {
            console.error("❌ Item validation failed:", validationError);
            throw validationError; // Re-throw to stop order creation
        }

        // 3. Calculate totals
        const total = calculateTotal();
        const paid = parseFloat(paymentState.amountPaid) || 0;

        const orderData = {
            items: tempItems,
            totalAmount: total,

            // [ONLINE READY] Source tracking for future online orders
            source: 'OFFLINE',    // 'OFFLINE' = POS Kasir, 'ONLINE' = Web (future)
            file_via: null,       // null for OFFLINE, 'WA'/'EMAIL' for ONLINE (future)

            paidAmount: paid,
            paymentStatus: paid >= total ? 'PAID' : (paid > 0 ? 'DP' : 'UNPAID'),
            remainingAmount: Math.max(0, total - paid),

            // [SOP V2.0] TEMPO/VIP Flag - Bypass payment gate
            isTempo: isTempo,

            // [PRIORITY SYSTEM] Deadline
            targetDate: targetDate,

            // Customer Snapshot (immutable after creation)
            customerSnapshot: {
                name: customerSnapshot.name.trim(),
                whatsapp: customerSnapshot.whatsapp.trim()
            },

            // Metadata Log (Audit Trail)
            meta: {
                createdAt: new Date().toISOString(),
                createdBy: currentUser.name, // CS who created the order
                printedAt: null,
                printedBy: null
            },

            createdAt: new Date().toISOString(),
            notes: ''
        };

        console.log("Order data prepared:", orderData);

        try {
            console.log("Calling createOrderFn...");
            const order = await createOrderFn(orderData);
            console.log("createOrderFn returned:", order);
            console.log("Order ID:", order?.id);
            console.log("Order Number:", order?.orderNumber);

            if (!order) {
                throw new Error("createOrderFn returned null/undefined");
            }

            console.log("✅ Returning order:", order);
            return order;
        } catch (error) {
            console.error("❌ Order Finalization Failed:", error);
            throw error;
        }
    };

    // === RESET TRANSACTION ===
    const resetTransaction = () => {
        setTempItems([]);
        setConfiguratorInput(INITIAL_INPUT_STATE);
        setPaymentState(INITIAL_PAYMENT_STATE);
        setTransactionStage(TRANSACTION_STAGES.CART);
        clearCustomerSnapshot(); // Clear customer data for new transaction
    };

    // === RETURN API ===
    return {
        // Category (from store - NO FALLBACK)
        categories, // ALL categories for UI display
        currentCategory,
        selectCategory,

        // Configurator (temporary workspace)
        configuratorInput,
        updateConfiguratorInput,
        getCurrentPreview: _calculateCurrentPrice,


        // Stateless calculator for Modal (GEN 2 UPGRADED)
        calculateItemPrice: (inputData) => {
            try {
                const { product, qty = 1, dimensions = {}, manualPrice, finishings = [] } = inputData;
                const safeQty = parseInt(qty) || 1;

                // GEN 2: Mode Detection Hierarchy
                // 1. Use product.input_mode (Gen 2)
                // 2. Fallback to category logic_type
                // 3. Special handling: HYBRID → default to AREA for legacy products
                let mode = product?.input_mode;

                if (!mode) {
                    const categoryType = currentCategory?.logic_type;
                    if (categoryType === 'HYBRID') {
                        mode = 'AREA'; // Default for legacy Flexi in HYBRID category
                    } else {
                        mode = categoryType || 'MANUAL';
                    }
                }

                console.log('💰 calculateItemPrice:', {
                    product: product?.name,
                    mode,
                    categoryType: currentCategory?.logic_type,
                    hasVariants: !!product?.variants,
                    calcEngine: product?.calc_engine
                });

                // Helper: Calculate finishing cost
                const calculateFinishingCost = (fins, multiplier = 1) => {
                    if (!fins || fins.length === 0) return 0;
                    return fins.reduce((total, f) => total + ((f.price || 0) * multiplier), 0);
                };

                // Helper: Lookup tiered price from wholesale rules
                const getTieredPrice = (quantity, product) => {
                    if (!product?.calc_engine || product.calc_engine !== 'TIERED') return null;
                    if (!product?.advanced_features?.wholesale_rules) return null;

                    const tier = product.advanced_features.wholesale_rules.find(
                        rule => quantity >= rule.min && quantity <= rule.max
                    );

                    return tier?.price || product.base_price || product.price || 0;
                };

                let subtotal = 0;

                switch (mode) {
                    case 'LINEAR':
                        // GEN 2: LINEAR with Variants (Stiker Meteran)
                        if (product?.calc_engine === 'ROLLS' && dimensions.selectedVariant) {
                            const lengthVal = parseFloat(dimensions.length) || 0;
                            const variantPrice = dimensions.selectedVariant.price_per_meter || 0;

                            if (lengthVal > 0) {
                                let basePrice = lengthVal * variantPrice;

                                // Add finishing groups (per meter for LINEAR)
                                const finishingCost = calculateFinishingCost(finishings, lengthVal);

                                subtotal = (basePrice + finishingCost) * safeQty;

                                console.log('  📏 LINEAR Gen 2:', {
                                    length: lengthVal,
                                    variantPrice,
                                    basePrice,
                                    finishingCost,
                                    qty: safeQty,
                                    subtotal
                                });
                            }
                        }
                        // Legacy LINEAR (Textile)
                        else {
                            const linPrice = parseFloat(product?.price) || 0;
                            const linLen = parseFloat(dimensions.length) || 0;

                            if (linLen > 0) {
                                const linResult = calculateLinearPrice(linLen, linPrice, safeQty);
                                subtotal = (linResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);

                                console.log('  📏 LINEAR Legacy:', { linLen, linPrice, subtotal });
                            }
                        }
                        break;

                    case 'AREA':
                        // Legacy AREA (Flexi, Banner)
                        const areaPrice = parseFloat(product?.price) || 0;
                        const areaLen = parseFloat(dimensions.length) || 0;
                        const areaWid = parseFloat(dimensions.width) || 0;

                        if (areaLen > 0 && areaWid > 0) {
                            const areaResult = calculateAreaPrice(areaLen, areaWid, areaPrice, safeQty);
                            subtotal = (areaResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);

                            console.log('  📐 AREA:', { areaLen, areaWid, areaPrice, subtotal });
                        }
                        break;

                    case 'MATRIX':
                        // MATRIX (Poster sizes)
                        const sizeKey = dimensions.sizeKey;

                        if (sizeKey && product?.prices?.[sizeKey]) {
                            const matResult = calculateMatrixPrice(product.prices, sizeKey, safeQty);
                            subtotal = (matResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);

                            console.log('  📊 MATRIX:', { sizeKey, subtotal });
                        }
                        break;

                    case 'SHEET':
                    case 'TIERED':
                    case 'UNIT_SHEET':
                    case 'UNIT':
                        // GEN 2: TIERED Pricing (NCR Advanced, Kalender)
                        if (product?.calc_engine === 'TIERED') {
                            const tierPrice = getTieredPrice(safeQty, product);

                            if (tierPrice) {
                                subtotal = (tierPrice * safeQty) + (calculateFinishingCost(finishings) * safeQty);

                                console.log('  💎 TIERED:', {
                                    qty: safeQty,
                                    tierPrice,
                                    subtotal,
                                    rulesCount: product.advanced_features?.wholesale_rules?.length
                                });
                            }
                        }
                        // Legacy UNIT/SHEET (Simple pricing)
                        else {
                            const unitPrice = parseFloat(product?.price) || 0;

                            // Use appropriate calculator based on mode
                            if (mode === 'UNIT_SHEET') {
                                const sheetResult = calculateUnitSheetPrice(unitPrice, safeQty);
                                subtotal = (sheetResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);
                            } else {
                                const unitResult = calculateUnitPrice(unitPrice, safeQty);
                                subtotal = (unitResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);
                            }

                            console.log(`  🔢 ${mode}:`, { unitPrice, qty: safeQty, subtotal });
                        }
                        break;

                    case 'MANUAL':
                        // Manual pricing (Custom items)
                        const manPrice = parseFloat(manualPrice) || 0;
                        subtotal = manPrice * safeQty + (calculateFinishingCost(finishings) * safeQty);

                        console.log('  ✏️  MANUAL:', { manPrice, subtotal });
                        break;

                    case 'HYBRID':
                        // HYBRID should have been resolved to AREA/LINEAR in mode detection
                        // Fallback to AREA for safety
                        console.warn('⚠️  HYBRID not resolved - falling back to AREA');
                        const hybLen = parseFloat(dimensions.length) || 0;
                        const hybWid = parseFloat(dimensions.width) || 0;
                        const hybPrice = parseFloat(product?.price) || 0;

                        if (hybLen > 0 && hybWid > 0) {
                            const hybResult = calculateAreaPrice(hybLen, hybWid, hybPrice, safeQty);
                            subtotal = (hybResult?.subtotal || 0) + (calculateFinishingCost(finishings) * safeQty);
                        }
                        break;

                    default:
                        console.warn('⚠️  Unknown mode:', mode);
                        subtotal = 0;
                }

                return { subtotal };
            } catch (err) {
                console.error('❌ calculateItemPrice error:', err);
                return { subtotal: 0 };
            }
        },

        // Temporary cart
        items: tempItems,
        addItemToCart,
        removeItem,
        clearCart,
        calculateTotal,

        // Payment (temporary until confirmed)
        paymentState,
        updatePaymentState,
        confirmPayment,
        finalizeOrder,

        // Customer Snapshot
        customerSnapshot,
        updateCustomerSnapshot,
        clearCustomerSnapshot,

        // Priority System
        targetDate,
        setTargetDate,
        setPriorityStandard,
        setPriorityExpress,
        setPriorityUrgent,

        // Transaction Stage
        transactionStage,
        setTransactionStage,
        validateStageTransition,

        // Reset
        resetTransaction,
    };
}
