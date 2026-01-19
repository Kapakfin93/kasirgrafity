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

import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { useProductStore } from "../stores/useProductStore";
import { calculatePriceByLogic } from "./transactionLogic";
// ✅ CORRECT IMPORT PATH (Ensure this file exists!)
import {
  buildItemDescription,
  extractFinishingNames,
} from "../core/descriptionBuilder";

const INITIAL_INPUT_STATE = {
  product: null,
  qty: 1,
  length: "",
  width: "",
  sizeKey: null,
  manualPrice: "",
  selectedFinishings: [],
};

const INITIAL_PAYMENT_STATE = {
  mode: "TUNAI",
  amountPaid: "",
  isLocked: false,
  showNotaPreview: false,
};

// ============================================
// PRIORITY SYSTEM CONFIGURATION
// ============================================
// ⚠️ KONFIGURASI BIAYA PRIORITAS (EDIT DI SINI) ⚠️
// Ubah nilai di bawah ini untuk mengatur harga dan durasi layanan prioritas
export const PRIORITY_CONFIG = {
  // --- Harga Layanan ---
  FEE_EXPRESS: 15000, // Biaya Layanan Express (Rp)
  FEE_URGENT: 30000, // Biaya Layanan Urgent (Rp)

  // --- Durasi Target Selesai ---
  HOURS_STANDARD: 24, // Standard: +24 jam
  HOURS_EXPRESS: 5, // Express: +5 jam (atau hari ini jam 17:00)
  HOURS_URGENT: 2, // Urgent: +2 jam

  // --- Pengaturan Lainnya ---
  EXPRESS_CUTOFF_HOUR: 17, // Express target jam berapa (24-hour format)
};
// ============================================

// Transaction Stage Enum
export const TRANSACTION_STAGES = {
  CART: "CART",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  POST_PAYMENT: "POST_PAYMENT",
};

export function useTransaction() {
  // Get store data (DB-backed ONLY - NO FALLBACK)
  const {
    categories: storeCategories,
    initialize,
    isInitialized,
  } = useProductStore();

  // ONLY use store categories - no fallback to static data
  const categories = storeCategories;

  // TEMPORARY WORKSPACE STATE
  const [currentCategory, setCurrentCategory] = useState(categories[0] || null);
  const [configuratorInput, setConfiguratorInput] =
    useState(INITIAL_INPUT_STATE);
  const [tempItems, setTempItems] = useState([]); // Temporary cart items
  const [paymentState, setPaymentState] = useState(INITIAL_PAYMENT_STATE);
  const [transactionStage, setTransactionStage] = useState(
    TRANSACTION_STAGES.CART,
  );

  // Customer Snapshot State
  const [customerSnapshot, setCustomerSnapshot] = useState({
    name: "",
    whatsapp: "",
  });

  // Target Date State (for Priority System)
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 24); // Default: +24h
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  });

  // DISCOUNT STATE (with strict validation)
  const [discount, setDiscount] = useState(0);

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
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setCurrentCategory(cat);
      setConfiguratorInput(INITIAL_INPUT_STATE);
    }
  };

  // === CUSTOMER ACTIONS ===
  const updateCustomerSnapshot = (updates) => {
    setCustomerSnapshot((prev) => ({ ...prev, ...updates }));
  };

  const clearCustomerSnapshot = () => {
    setCustomerSnapshot({ name: "", whatsapp: "" });
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
    console.log("🔨 buildCartItem called with:", rawInput);

    const {
      product,
      qty,
      dimensions = {},
      finishings = [],
      manualPrice,
    } = rawInput;

    // 1. Validate product data (MUST exist)
    if (!product?.id || !product?.name) {
      throw new Error("CART ITEM REJECTED: Product data tidak valid");
    }

    // 2. Validate qty (MUST be > 0)
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      throw new Error(`CART ITEM REJECTED: Quantity harus > 0 (${qty})`);
    }

    // Strict Type Conversion for Global Use
    const safeQty = Number.parseInt(qty);

    // Detect pricingType: PRIORITIZE product.pricing_model (Gen 3.2), fallback to category
    const pricingType =
      product.pricing_model || currentCategory?.logic_type || "MANUAL";

    // ===== CALCULATE PRICE (using Unified Logic) =====
    let calculatedPrice = 0;
    let unitPrice = 0;

    try {
      const result = calculatePriceByLogic({
        mode: pricingType,
        product,
        qty: safeQty,
        dimensions,
        finishings,
        manualPrice,
      });

      calculatedPrice = result.subtotal;
      unitPrice = result.unitPrice;
    } catch (calcError) {
      throw new Error(
        `CART ITEM REJECTED: Error kalkulasi harga - ${calcError.message}`,
      );
    }

    // 5. Validate calculated price (MUST be > 0, NO zero-price items in final cart)
    if (typeof calculatedPrice !== "number" || Number.isNaN(calculatedPrice)) {
      throw new TypeError(
        `CART ITEM REJECTED: Harga hasil kalkulasi NaN (${product.name})`,
      );
    }

    if (calculatedPrice <= 0) {
      throw new Error(
        `CART ITEM REJECTED: Harga harus > 0 (${product.name}: Rp ${calculatedPrice})`,
      );
    }

    // ===== BUILD DESCRIPTION (using core builder) =====
    const finishingNames = extractFinishingNames(finishings);
    let description = "";

    try {
      description = buildItemDescription({
        productName: product.name,
        pricingType: pricingType,
        specs: dimensions,
        finishingNames: finishingNames,
      });
    } catch (descError) {
      throw new Error(
        `CART ITEM REJECTED: Error membuat deskripsi - ${descError.message}`,
      );
    }

    // 6. Validate description (MUST contain product name)
    if (!description?.includes(product.name)) {
      throw new Error(
        `CART ITEM REJECTED: Deskripsi tidak valid (${description})`,
      );
    }

    // 7. Validate calculated price (MUST be > 0 and not NaN)
    if (
      !calculatedPrice ||
      Number.isNaN(calculatedPrice) ||
      calculatedPrice <= 0
    ) {
      throw new Error(
        `CART ITEM REJECTED: Harga tidak valid (${calculatedPrice}). Periksa input dimensi/ukuran.`,
      );
    }

    if (!unitPrice || Number.isNaN(unitPrice) || unitPrice <= 0) {
      throw new Error(
        `CART ITEM REJECTED: Harga satuan tidak valid (${unitPrice})`,
      );
    }

    // ===== BUILD VALIDATED CART ITEM =====
    const cartItem = {
      id: uuid(),
      productId: product.id,
      categoryId: product.categoryId, // Data Enrichment: Inject Category ID for Reporting
      name: product.name,
      productName: product.name, // For ReceiptSection compatibility
      description: description,
      pricingType: pricingType,
      qty: safeQty,
      dimensions: dimensions,
      finishings: finishings.map((f) => ({
        id: f.id,
        name: f.name,
        price: f.price || 0,
      })),
      unitPrice: unitPrice,
      totalPrice: calculatedPrice,
      // === NOTES: Store for ALL pricing types (for SPK production) ===
      notes:
        rawInput.notes ||
        rawInput.selected_details?.notes ||
        dimensions.notes ||
        "",
      selected_details: rawInput.selected_details || null,
    };

    // ===== ADVANCED PRICING: Store additional metadata =====
    if (pricingType === "ADVANCED") {
      // Store financial breakdown for owner dashboard
      cartItem.meta = {
        revenue_print: rawInput.revenue_print || dimensions.revenue_print || 0,
        revenue_finish:
          rawInput.revenue_finish || dimensions.revenue_finish || 0,
        detail_options:
          rawInput.detail_options || dimensions.detail_options || null,
        notes: cartItem.notes, // Also store in meta for backward compat
      };

      console.log("📊 ADVANCED metadata stored:", {
        notes: cartItem.notes,
        revenue_breakdown: cartItem.meta,
      });
    }

    console.log("✅ Cart item built successfully:", cartItem);
    return cartItem;
  };
  // === CONFIGURATOR ACTIONS ===
  const updateConfiguratorInput = (updates) => {
    setConfiguratorInput((prev) => ({ ...prev, ...updates }));
  };

  // === PRICE CALCULATION (delegated to core) ===
  const _calculateCurrentPrice = () => {
    const {
      product,
      // qty, // Unused in destructuring because accessed via configuratorInput.qty directly in logic call
      length,
      width,
      sizeKey,
      manualPrice,
      selectedFinishings,
    } = configuratorInput;
    const logic_type = currentCategory?.logic_type;

    // Rule #3: FAIL-SAFE. Return 0, not NaN.
    if (!currentCategory) return { subtotal: 0, breakdown: "" };
    if (!product && logic_type !== "MANUAL")
      return { subtotal: 0, breakdown: "" };

    try {
      // UNIFIED PREVIEW LOGIC
      const result = calculatePriceByLogic({
        mode: logic_type,
        product,
        qty: configuratorInput.qty,
        dimensions: {
          length,
          width,
          sizeKey,
          material: configuratorInput.material, // Passed in context? Assuming yes or handled in logic
        },
        finishings: selectedFinishings,
        manualPrice,
      });
      return {
        subtotal: Math.floor(result.subtotal),
        breakdown: result.breakdown,
      };
    } catch (e) {
      console.error("Preview Error:", e);
      return { subtotal: 0, breakdown: "Error" };
    }
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
        if (
          preConfiguredItem.product &&
          typeof preConfiguredItem.product === "object"
        ) {
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
            // === FIX: Extract notes from BOTH top-level AND selected_details ===
            notes:
              preConfiguredItem.notes ||
              preConfiguredItem.selected_details?.notes ||
              "",
            selected_details: preConfiguredItem.selected_details || null,
            detail_options: preConfiguredItem.detail_options,
          };
        } else {
          // OLD: productId/productName structure from un-refactored configurators
          rawInput = {
            product: {
              id: preConfiguredItem.productId,
              name: preConfiguredItem.productName,
              price:
                preConfiguredItem.basePrice || preConfiguredItem.unitPrice || 0,
            },
            qty: preConfiguredItem.quantity || preConfiguredItem.qty || 1,
            dimensions:
              preConfiguredItem.specs || preConfiguredItem.dimensions || {},
            finishings: preConfiguredItem.finishings || [],
            manualPrice: preConfiguredItem.priceInput,
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
            sizeKey: configuratorInput.sizeKey,
          },
          finishings: configuratorInput.selectedFinishings || [],
          manualPrice: configuratorInput.manualPrice,
        };
      }

      console.log("Mapped rawInput for buildCartItem:", rawInput);

      // === CRITICAL: ALL ITEMS MUST GO THROUGH buildCartItem ===
      const validatedItem = buildCartItem(rawInput);

      // Add to cart
      setTempItems((prev) => [...prev, validatedItem]);
      setConfiguratorInput(INITIAL_INPUT_STATE);

      console.log("✅ Item added to cart");
    } catch (error) {
      console.error("❌ Add to Cart Failed:", error);
      alert(`GAGAL TAMBAH ITEM:\n${error.message}`);
    }
  };

  const removeItem = (id) => {
    setTempItems((prev) => prev.filter((item) => item.id !== id));
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
    setTempItems((prev) =>
      prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      ),
    );
  };

  const setPriorityExpress = () => {
    // Express: Today 17:00 or +5h (whichever is later), +15k fee
    const now = new Date();
    const today17 = new Date();
    today17.setHours(PRIORITY_CONFIG.EXPRESS_CUTOFF_HOUR, 0, 0, 0);
    const plus5h = new Date(
      now.getTime() + PRIORITY_CONFIG.HOURS_EXPRESS * 60 * 60 * 1000,
    );

    const targetTime = today17 > now ? today17 : plus5h;
    setTargetDate(targetTime.toISOString().slice(0, 16));

    // ANTI-STACKING: Remove ALL existing priority fees first
    setTempItems((prev) => {
      const cleaned = prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      );

      // Add Express fee
      return [
        ...cleaned,
        {
          id: "fee-express",
          productId: "SERVICE_EXPRESS",
          name: "Layanan Prioritas (Express)",
          productName: "Layanan Prioritas (Express)",
          description: "Percepatan produksi (selesai hari ini)",
          pricingType: "SERVICE",
          qty: 1,
          dimensions: {},
          finishings: [],
          unitPrice: PRIORITY_CONFIG.FEE_EXPRESS,
          totalPrice: PRIORITY_CONFIG.FEE_EXPRESS,
        },
      ];
    });
  };

  const setPriorityUrgent = () => {
    // Urgent: +2h, +30k fee
    const now = new Date();
    now.setHours(now.getHours() + PRIORITY_CONFIG.HOURS_URGENT);
    setTargetDate(now.toISOString().slice(0, 16));

    // ANTI-STACKING: Remove ALL existing priority fees first
    setTempItems((prev) => {
      const cleaned = prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      );

      // Add Urgent fee
      return [
        ...cleaned,
        {
          id: "fee-urgent",
          productId: "SERVICE_URGENT",
          name: "Layanan RUSH (Urgent)",
          productName: "Layanan RUSH (Urgent)",
          description: "Prioritas tertinggi (selesai 2 jam)",
          pricingType: "SERVICE",
          qty: 1,
          dimensions: {},
          finishings: [],
          unitPrice: PRIORITY_CONFIG.FEE_URGENT,
          totalPrice: PRIORITY_CONFIG.FEE_URGENT,
        },
      ];
    });
  };

  // === CALCULATION ===
  const calculateTotal = () => {
    // Standardized: Total uses 'totalPrice' field
    const subtotal = tempItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0,
    );

    // STRICT VALIDATION: Discount cannot exceed subtotal
    const safeDiscount = Math.min(discount, subtotal);
    const finalAmount = Math.max(0, subtotal - safeDiscount);

    return {
      subtotal,
      discount: safeDiscount,
      finalAmount,
    };
  };

  // === PAYMENT ACTIONS ===
  const updatePaymentState = (updates) => {
    setPaymentState((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Validate stage transition from CART to AWAITING_PAYMENT
   * Rule: Items with totalPrice === 0 block transition
   */
  const validateStageTransition = () => {
    // Check for zero-price items
    const zeroItems = tempItems.filter((item) => item.totalPrice === 0);
    if (zeroItems.length > 0) {
      const itemNames = zeroItems.map((i) => i.productName).join(", ");
      throw new Error(`Item dengan harga 0 tidak boleh diproses: ${itemNames}`);
    }

    // Check cart not empty
    if (tempItems.length === 0) {
      throw new Error("Keranjang kosong");
    }

    return true;
  };

  const confirmPayment = (isTempo = false) => {
    // SANITASI INPUT untuk Tempo mode
    // Jika isTempo aktif dan amountPaid kosong/invalid, paksa jadi 0
    let paid = Number.parseFloat(paymentState.amountPaid) || 0;

    // [SOP V2.0] TEMPO MODE BYPASS
    // Jika Tempo aktif, skip validasi pembayaran - langsung lock & proceed
    if (isTempo) {
      console.log("🎫 TEMPO MODE: Bypassing payment validation, paid =", paid);
      setPaymentState((prev) => ({
        ...prev,
        isLocked: true,
        amountPaid: paid,
      }));
      return true;
    }

    // VALIDASI NORMAL: Hanya blokir jika 0 atau minus (untuk non-Tempo)
    // DP (kurang dari total) HARUS LOLOS
    if (paymentState.mode === "TUNAI" && paid <= 0) {
      alert("Nominal pembayaran tidak valid!");
      return false;
    }

    // Lock the transaction
    setPaymentState((prev) => ({ ...prev, isLocked: true }));
    return true;
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

    // 0. Validate Customer Snapshot (MANDATORY)
    if (!customerSnapshot.name || customerSnapshot.name.trim() === "") {
      throw new Error("ORDER REJECTED: Nama customer wajib diisi");
    }

    // 0b. Validate Current User (for meta.createdBy)
    if (!currentUser?.name) {
      throw new Error(
        "ORDER REJECTED: CS/Kasir tidak terdeteksi. Silakan login kembali.",
      );
    }

    // 1. Check for empty cart
    if (!tempItems || tempItems.length === 0) {
      throw new Error("ORDER REJECTED: Tidak ada item dalam keranjang");
    }

    console.log(`Validating ${tempItems.length} items...`);

    // 2. Validate EVERY item (3 PILLARS OF VALIDATION)
    const validItems = tempItems.map((item, index) => {
      // Pillar A: IDENTITY (product_id)
      // If item comes from 'Quick Input' and has no DB ID, mark it clearly.
      // Use timestamp to ensure uniqueness for manual items in same batch if needed,
      // though map index is safer for collision in same ms.
      // User requested: 'MANUAL_INPUT_' + Date.now()
      const safeProductId =
        item.productId || item.id || "MANUAL_INPUT_" + Date.now() + "_" + index;

      // Pillar B: VALUE (price & subtotal)
      const safePrice = Number(item.unitPrice || item.price);
      const safeQty = Number(item.qty) || 1;

      if (Number.isNaN(safePrice))
        throw new Error(`Harga Error pada item #${index + 1}: ${item.name}`);
      if (Number.isNaN(safeQty) || safeQty <= 0)
        throw new Error(`Qty Error pada item #${index + 1}: ${item.name}`);

      // Pillar C: CONTEXT (metadata) - STRICT STRUCTURE
      // Structure to Enforce:
      // variant_label, specs_json, custom_dimensions, finishing_list, notes
      const safeMetadata = {
        original_name: item.name || item.productName,
        variant_label:
          item.dimensions?.selectedVariant?.label ||
          item.dimensions?.sizeKey ||
          "Standard",
        specs_json: {
          // Capture all dimension props as potential specs
          ...item.dimensions,
          // Explicitly keep printModeId and sheetsPerBook if they exist
          print_mode_id: item.dimensions?.printModeId,
          sheets_per_book: item.dimensions?.sheetsPerBook,
        },
        custom_dimensions:
          item.dimensions?.length && item.dimensions?.width
            ? { w: item.dimensions.width, h: item.dimensions.length } // user asked for w then h
            : null,
        finishing_list: item.finishings || [],
        notes: item.notes || item.note || "",

        // Keep legacy keys for backward compat if needed, but prioritize user request
        variant_selected:
          item.dimensions?.selectedVariant?.label ||
          item.dimensions?.sizeKey ||
          null,
        user_note: item.notes || item.note || "",
      };

      if (!safeProductId)
        throw new Error(`Item ke-${index + 1} kehilangan ID Produk.`);

      return {
        // Enforce internal standard keys for store consumption
        ...item,
        id: item.id || uuid(),
        productId: safeProductId,
        productName: item.name,
        qty: safeQty,
        price: safePrice,
        unitPrice: safePrice,
        totalPrice: safePrice * safeQty,

        // THE PACKAGED METADATA
        metadata: safeMetadata,
      };
    });

    console.log("✅ All items passed 3-Pillar Validation");

    // 3. Calculate totals with discount
    const subtotal = validItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const safeDiscount = Math.min(discount, subtotal);
    const finalAmount = Math.max(0, subtotal - safeDiscount);

    // Payment Logic
    const paidInput = Number.parseFloat(paymentState.amountPaid) || 0;
    const paid = isTempo ? 0 : paidInput;

    // Status Logic
    let paymentStatus = "UNPAID";
    if (paid >= finalAmount) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "DP";

    // 4. PREPARE HEADER (SNAKE_CASE STRICT MAPPING)
    // User Requirement:
    // customerPhone -> customer_phone
    // customerName -> customer_name
    // paymentMethod -> payment_method
    // grandTotal -> total_amount  <-- NOTE: User requested grandTotal maps to total_amount.
    //                            This implies total_amount is the FINAL BILL.
    //                            I will map finalAmount -> total_amount.
    // discount -> discount_amount
    // tax -> tax_amount

    // What about the sum of items? Usually that is 'subtotal'.
    // If Supabase has 'grand_total' column, I should potentially fill that too?
    // I will fill both to be safe, but prioritize the user's mapping.

    const orderPayload = {
      // --- HEADER ---
      customer_name: customerSnapshot.name.trim() || "Guest",
      customer_phone: customerSnapshot.whatsapp.trim() || "-",

      payment_method: paymentState.mode || "CASH",

      // FINANCIALS
      // User: "grandTotal -> total_amount"
      total_amount: finalAmount, // FINAL AMOUNT TO PAY

      // User: "discount -> discount_amount"
      discount_amount: safeDiscount,

      // User: "tax -> tax_amount"
      tax_amount: 0,

      // ADDITIONAL STANDARD FIELDS (Inferred from schema context)
      // I will store the sum of items in 'subtotal' if it exists, or 'original_amount'
      // To be safe I'll assume 'grand_total' might also exist or be an alias.
      // But strictly following "grandTotal -> total_amount":

      // Standard Supabase fields often used:
      paid_amount: paid,
      remaining_amount: Math.max(0, finalAmount - paid),
      payment_status: paymentStatus,

      status: "PENDING",
      production_status: "PENDING",
      is_tempo: isTempo,
      source: "OFFLINE",

      target_date: targetDate,
      created_at: new Date().toISOString(),

      received_by: currentUser.name,
      meta: {
        createdBy: currentUser.name,
        shift: "morning",
        temp_id: uuid(),
      },

      // ITEMS PAYLOAD
      items: validItems.map((item) => ({
        // User requested STRICT mapping for items:
        // order_id: orderData.id (handled in store/backend)
        // product_id: safeProductId
        // product_name: item.name
        // quantity: safeQty
        // price: safePrice
        // subtotal: safePrice * safeQty
        // metadata: safeMetadata

        product_id: item.productId,
        product_name: item.productName,
        quantity: item.qty,
        price: item.price,
        subtotal: item.totalPrice,
        metadata: item.metadata,
      })),
    };

    console.log("🚀 Payload Safeguard (SNAKE_CASE):", orderPayload);

    try {
      console.log("Calling createOrderFn...");
      const order = await createOrderFn(orderPayload);

      if (!order) {
        throw new Error("createOrderFn returned null/undefined");
      }

      console.log("✅ Transaction Saved Successfully:", order.id);
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
    setDiscount(0); // Reset discount
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
        const {
          product,
          qty = 1,
          dimensions = {},
          manualPrice,
          finishings = [],
        } = inputData;
        const safeQty = Number.parseInt(qty) || 1;

        // GEN 2: Mode Detection Hierarchy
        // 1. Use product.input_mode (Gen 2)
        // 2. Fallback to category logic_type
        // 3. Special handling: HYBRID → default to AREA for legacy products
        let mode = product?.input_mode;

        if (!mode) {
          const categoryType = currentCategory?.logic_type;
          if (categoryType === "HYBRID") {
            mode = "AREA"; // Default for legacy Flexi in HYBRID category
          } else {
            mode = categoryType || "MANUAL";
          }
        }

        console.log("💰 calculateItemPrice:", {
          product: product?.name,
          mode,
          categoryType: currentCategory?.logic_type,
          hasVariants: !!product?.variants,
          calcEngine: product?.calc_engine,
        });

        try {
          const result = calculatePriceByLogic({
            mode,
            product,
            qty: safeQty,
            dimensions: {
              ...dimensions,
              // Ensure legacy compatibility if needed
              length: dimensions.length,
              width: dimensions.width,
              sizeKey: dimensions.sizeKey || dimensions.selectedVariant?.label, // fallback
            },
            finishings,
            manualPrice,
          });
          console.log(`  🔢 ${mode}:`, { subtotal: result.subtotal });
          return { subtotal: result.subtotal };
        } catch (err) {
          console.error("❌ calculateItemPrice unified error:", err);
          return { subtotal: 0 };
        }
      } catch (err) {
        console.error("❌ calculateItemPrice error:", err);
        return { subtotal: 0 };
      }
    },

    // Temporary cart
    items: tempItems,
    addItemToCart,
    removeItem,
    clearCart,
    calculateTotal,

    // Discount management
    discount,
    setDiscount,

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
