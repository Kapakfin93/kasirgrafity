/**
 * useTransaction Hook - FIXED VERSION
 * * Perbaikan:
 * 1. Mengembalikan fungsi updateConfiguratorInput yang hilang.
 * 2. Mengembalikan fungsi _calculateCurrentPrice yang hilang.
 * 3. Mengembalikan logika calculateItemPrice yang lengkap.
 * 4. Tetap menyertakan fitur Auto-Save Customer ke Supabase.
 */

import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { useProductStore } from "../stores/useProductStore";
import { calculatePriceByLogic } from "./transactionLogic";
import { supabase } from "../services/supabaseClient";
import { useCustomerStore } from "../stores/useCustomerStore";

// Helper imports
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
export const PRIORITY_CONFIG = {
  FEE_EXPRESS: 15000,
  FEE_URGENT: 30000,
  HOURS_STANDARD: 24,
  HOURS_EXPRESS: 5,
  HOURS_URGENT: 2,
  EXPRESS_CUTOFF_HOUR: 17,
};
// ============================================

export const TRANSACTION_STAGES = {
  CART: "CART",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  POST_PAYMENT: "POST_PAYMENT",
};

export function useTransaction() {
  // 1. STORE ACCESS
  const {
    categories: storeCategories,
    initialize,
    isInitialized,
  } = useProductStore();
  const { addCustomerToCache } = useCustomerStore();
  const categories = storeCategories;

  // 2. LOCAL STATE
  const [currentCategory, setCurrentCategory] = useState(categories[0] || null);
  const [configuratorInput, setConfiguratorInput] =
    useState(INITIAL_INPUT_STATE);
  const [tempItems, setTempItems] = useState([]);
  const [paymentState, setPaymentState] = useState(INITIAL_PAYMENT_STATE);
  const [transactionStage, setTransactionStage] = useState(
    TRANSACTION_STAGES.CART,
  );

  // Customer Snapshot (Form UI)
  const [customerSnapshot, setCustomerSnapshot] = useState({
    name: "",
    whatsapp: "",
    phone: "",
    address: "",
  });

  // Target Date & Discount
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    return now.toISOString().slice(0, 16);
  });
  const [discount, setDiscount] = useState(0);

  // 3. INITIALIZATION EFFECTS
  useEffect(() => {
    if (!isInitialized) {
      initialize().catch(console.error);
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (storeCategories.length > 0 && !currentCategory) {
      setCurrentCategory(storeCategories[0]);
    }
  }, [storeCategories, currentCategory]);

  // === HELPER FUNCTIONS (YANG TADI HILANG) ===
  const updateConfiguratorInput = (updates) => {
    setConfiguratorInput((prev) => ({ ...prev, ...updates }));
  };

  const updateCustomerSnapshot = (updates) => {
    setCustomerSnapshot((prev) => ({ ...prev, ...updates }));
  };

  const clearCustomerSnapshot = () => {
    setCustomerSnapshot({ name: "", whatsapp: "", phone: "", address: "" });
  };

  const selectCategory = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setCurrentCategory(cat);
      setConfiguratorInput(INITIAL_INPUT_STATE);
    }
  };

  // ===== PRICE CALCULATOR (YANG TADI HILANG) =====
  const _calculateCurrentPrice = () => {
    const { product, length, width, sizeKey, manualPrice, selectedFinishings } =
      configuratorInput;
    const logic_type = currentCategory?.logic_type;

    if (!currentCategory) return { subtotal: 0, breakdown: "" };
    if (!product && logic_type !== "MANUAL")
      return { subtotal: 0, breakdown: "" };

    try {
      const result = calculatePriceByLogic({
        mode: logic_type,
        product,
        qty: configuratorInput.qty,
        dimensions: { length, width, sizeKey },
        finishings: selectedFinishings,
        manualPrice,
      });
      return {
        subtotal: Math.floor(result.subtotal),
        breakdown: result.breakdown,
      };
    } catch (e) {
      return { subtotal: 0, breakdown: "Error" };
    }
  };

  // ===== BUILD CART ITEM (PRICE SNAPSHOT RECEIVER - FASE 2) =====
  const buildCartItem = (rawInput) => {
    const {
      product,
      qty,
      dimensions = {},
      finishings = [],
      manualPrice,
      finalTotal,
      pricingSnapshot,
    } = rawInput;

    if (!product?.id)
      throw new Error("CART ITEM REJECTED: Product data tidak valid");
    if (!qty || qty <= 0)
      throw new Error(`CART ITEM REJECTED: Quantity harus > 0`);

    const safeQty = Number.parseInt(qty);
    const pricingType =
      product.pricing_model || currentCategory?.logic_type || "MANUAL";

    // FASE 2: Accept finalTotal from UI (single source of truth)
    let totalPrice = 0;
    let unitPrice = 0;

    if (finalTotal && finalTotal > 0) {
      // NEW CONTRACT: Trust UI calculation
      totalPrice = finalTotal;
      unitPrice = Math.round(finalTotal / safeQty);
    } else if (rawInput.totalPrice && rawInput.totalPrice > 0) {
      // BACKWARD COMPATIBILITY: Legacy products (temporary)
      totalPrice = rawInput.totalPrice;
      unitPrice = rawInput.unitPrice || Math.round(totalPrice / safeQty);
    } else {
      // FALLBACK: Recalculate only if absolutely necessary (legacy flow)
      console.warn(
        "⚠️ buildCartItem: No finalTotal provided, recalculating...",
      );
      try {
        const result = calculatePriceByLogic({
          mode: pricingType,
          product,
          qty: safeQty,
          dimensions,
          finishings,
          manualPrice,
        });
        totalPrice = result.subtotal;
        unitPrice = result.unitPrice;
      } catch (calcError) {
        throw new Error(`Error kalkulasi harga - ${calcError.message}`);
      }
    }

    if (totalPrice <= 0)
      throw new Error("CART ITEM REJECTED: Final price invalid or zero");

    // Description Builder
    const finishingNames = extractFinishingNames(finishings);
    const description = buildItemDescription({
      productName: product.name,
      pricingType,
      specs: dimensions,
      finishingNames,
    });

    const cartItem = {
      id: uuid(),
      productId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      productName: product.name,
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
      totalPrice: totalPrice,
      notes:
        rawInput.notes ||
        rawInput.selected_details?.notes ||
        dimensions.notes ||
        "",
      selected_details: rawInput.selected_details || null,
      // FASE 2: Store pricing snapshot from UI (no modification)
      pricingSnapshot: pricingSnapshot || null,
      // NOTA REVISION: Variant info for human-readable invoice
      variantLabel: dimensions.variantLabel || rawInput.variantLabel || null,
      variantDesc: dimensions.variantDesc || rawInput.variantDesc || null,
    };

    if (pricingType === "ADVANCED") {
      cartItem.meta = {
        revenue_print: rawInput.revenue_print || dimensions.revenue_print || 0,
        revenue_finish:
          rawInput.revenue_finish || dimensions.revenue_finish || 0,
        detail_options:
          rawInput.detail_options || dimensions.detail_options || null,
        notes: cartItem.notes,
      };
    }

    return cartItem;
  };

  // === ADD TO CART ===
  const addItemToCart = (preConfiguredItem = null) => {
    try {
      let rawInput;
      if (preConfiguredItem) {
        if (
          preConfiguredItem.product &&
          typeof preConfiguredItem.product === "object"
        ) {
          // NEW Structure
          rawInput = {
            product: preConfiguredItem.product,
            qty: preConfiguredItem.qty || 1,
            dimensions: preConfiguredItem.dimensions || {},
            finishings: preConfiguredItem.finishings || [],
            manualPrice: preConfiguredItem.manualPrice,
            revenue_print: preConfiguredItem.revenue_print,
            revenue_finish: preConfiguredItem.revenue_finish,
            notes:
              preConfiguredItem.notes ||
              preConfiguredItem.selected_details?.notes ||
              "",
            selected_details: preConfiguredItem.selected_details || null,
            detail_options: preConfiguredItem.detail_options,
            // FASE 2: Pass through finalTotal and pricingSnapshot from UI
            finalTotal: preConfiguredItem.finalTotal,
            pricingSnapshot: preConfiguredItem.pricingSnapshot,
          };
        } else {
          // OLD Structure
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
        // LEGACY (Configurator Input)
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

      const validatedItem = buildCartItem(rawInput);
      setTempItems((prev) => [...prev, validatedItem]);
      setConfiguratorInput(INITIAL_INPUT_STATE);
    } catch (error) {
      console.error("❌ Add to Cart Failed:", error);
      alert(`GAGAL TAMBAH ITEM:\n${error.message}`);
    }
  };

  const removeItem = (id) =>
    setTempItems((prev) => prev.filter((item) => item.id !== id));
  const clearCart = () => {
    setTempItems([]);
    setConfiguratorInput(INITIAL_INPUT_STATE);
  };

  // === PRIORITY LOGIC ===
  const setPriorityStandard = () => {
    const now = new Date();
    now.setHours(now.getHours() + PRIORITY_CONFIG.HOURS_STANDARD);
    setTargetDate(now.toISOString().slice(0, 16));
    setTempItems((prev) =>
      prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      ),
    );
  };

  const setPriorityExpress = () => {
    const now = new Date();
    const today17 = new Date();
    today17.setHours(PRIORITY_CONFIG.EXPRESS_CUTOFF_HOUR, 0, 0, 0);
    const plus5h = new Date(
      now.getTime() + PRIORITY_CONFIG.HOURS_EXPRESS * 60 * 60 * 1000,
    );
    const targetTime = today17 > now ? today17 : plus5h;
    setTargetDate(targetTime.toISOString().slice(0, 16));

    setTempItems((prev) => {
      const cleaned = prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      );
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
    const now = new Date();
    now.setHours(now.getHours() + PRIORITY_CONFIG.HOURS_URGENT);
    setTargetDate(now.toISOString().slice(0, 16));

    setTempItems((prev) => {
      const cleaned = prev.filter((item) => item.id !== "fee-urgent"); // Fix: don't clear express if adding urgent? usually exclusive.
      // Assuming exclusive:
      const cleanedExclusive = prev.filter(
        (item) => item.id !== "fee-express" && item.id !== "fee-urgent",
      );

      return [
        ...cleanedExclusive,
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

  // === CALCULATE TOTAL ===
  const calculateTotal = () => {
    const subtotal = tempItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0,
    );
    const safeDiscount = Math.min(discount, subtotal);
    const finalAmount = Math.max(0, subtotal - safeDiscount);
    return { subtotal, discount: safeDiscount, finalAmount };
  };

  // === PAYMENT & STAGE ===
  const updatePaymentState = (updates) =>
    setPaymentState((prev) => ({ ...prev, ...updates }));

  const validateStageTransition = () => {
    const zeroItems = tempItems.filter((item) => item.totalPrice === 0);
    if (zeroItems.length > 0)
      throw new Error(`Item harga 0 tidak boleh diproses`);
    if (tempItems.length === 0) throw new Error("Keranjang kosong");
    return true;
  };

  const confirmPayment = (isTempo = false) => {
    let paid = Number.parseFloat(paymentState.amountPaid) || 0;
    if (isTempo) {
      setPaymentState((prev) => ({
        ...prev,
        isLocked: true,
        amountPaid: paid,
      }));
      return true;
    }
    if (paymentState.mode === "TUNAI" && paid <= 0) {
      alert("Nominal pembayaran tidak valid!");
      return false;
    }
    setPaymentState((prev) => ({ ...prev, isLocked: true }));
    return true;
  };

  // =================================================================
  // 🔥 FINALIZE ORDER (THE MASTER FUNCTION) 🔥
  // =================================================================
  const finalizeOrder = async (createOrderFn, currentUser, isTempo = false) => {
    if (tempItems.length === 0) throw new Error("Keranjang kosong!");
    if (!currentUser?.name)
      throw new Error("CS/Kasir tidak terdeteksi. Silakan login kembali.");
    if (!customerSnapshot.name || customerSnapshot.name.trim() === "")
      throw new Error("Nama customer wajib diisi");

    const { finalAmount, discount: safeDiscount } = calculateTotal();
    const paidInput = Number.parseFloat(paymentState.amountPaid) || 0;
    const paid = isTempo ? 0 : paidInput;

    let paymentStatus = "UNPAID";
    if (isTempo) paymentStatus = "UNPAID";
    else if (paid >= finalAmount) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "PARTIAL";

    // 2. 🔥 AUTO-SAVE CUSTOMER KE DATABASE & CACHE 🔥
    let finalCustomerId = customerSnapshot.id;
    const phoneToSave =
      customerSnapshot.phone || customerSnapshot.whatsapp || "-";

    try {
      // Only insert if new customer (no existing ID)
      if (!customerSnapshot.id) {
        const customerData = {
          name: customerSnapshot.name,
          phone: phoneToSave,
          address: customerSnapshot.address || "-",
        };

        const { data: savedCustomer, error: custError } = await supabase
          .from("customers")
          .insert(customerData)
          .select()
          .single();

        if (!custError && savedCustomer) {
          finalCustomerId = savedCustomer.id;
          console.log("✅ Pelanggan baru tersimpan:", savedCustomer);
          addCustomerToCache(savedCustomer);
        } else {
          console.warn(
            "⚠️ Customer insert failed, proceeding without ID:",
            custError,
          );
        }
      } else {
        // Existing customer, use provided ID
        finalCustomerId = customerSnapshot.id;
        console.log("✅ Menggunakan pelanggan lama:", customerSnapshot.name);
      }
    } catch (err) {
      console.error("Error Customer Processing:", err);
    }

    // 3. Susun Payload Order
    const orderPayload = {
      customer_id: finalCustomerId,
      customer_name: customerSnapshot.name.trim(),
      customer_phone: phoneToSave,
      received_by: currentUser.name,
      meta: { createdBy: currentUser.name, shift: "morning", temp_id: uuid() },
      payment_method: paymentState.mode || "CASH",
      total_amount: finalAmount,
      discount_amount: safeDiscount,
      tax_amount: 0,
      paid_amount: paid,
      remaining_amount: Math.max(0, finalAmount - paid),
      payment_status: paymentStatus,
      status: "PENDING",
      production_status: "PENDING",
      is_tempo: isTempo,
      source: "OFFLINE",
      target_date: targetDate,
      created_at: new Date().toISOString(),
      items: tempItems.map((item, index) => {
        const safePrice = Number(item.unitPrice || item.price);
        const safeQty = Number(item.qty) || 1;
        const safeProductId = item.productId || item.id || `MANUAL_${index}`;
        return {
          product_id: safeProductId,
          product_name: item.name || item.productName,
          quantity: safeQty,
          price: safePrice,
          subtotal: item.totalPrice,
          metadata: {
            original_name: item.name,
            specs_json: item.dimensions,
            finishing_list: item.finishings || [],
            notes: item.notes || "",
            custom_dimensions: item.dimensions?.length
              ? { w: item.dimensions.width, h: item.dimensions.length }
              : null,
          },
        };
      }),
    };

    try {
      const order = await createOrderFn(orderPayload);
      if (!order) throw new Error("Gagal membuat order (Null response)");
      return order;
    } catch (error) {
      console.error("❌ Order Gagal:", error);
      throw error;
    }
  };

  // === CALCULATE ITEM PRICE (YANG TADI HILANG) ===
  const calculateItemPrice = (inputData) => {
    try {
      const {
        product,
        qty = 1,
        dimensions = {},
        manualPrice,
        finishings = [],
      } = inputData;
      const safeQty = Number.parseInt(qty) || 1;
      let mode = product?.input_mode;

      if (!mode) {
        const categoryType = currentCategory?.logic_type;
        if (categoryType === "HYBRID") mode = "AREA";
        else mode = categoryType || "MANUAL";
      }

      const result = calculatePriceByLogic({
        mode,
        product,
        qty: safeQty,
        dimensions: {
          ...dimensions,
          length: dimensions.length,
          width: dimensions.width,
          sizeKey: dimensions.sizeKey || dimensions.selectedVariant?.label,
        },
        finishings,
        manualPrice,
      });
      return { subtotal: result.subtotal };
    } catch (err) {
      console.error("Error calc item:", err);
      return { subtotal: 0 };
    }
  };

  // === RESET ===
  const resetTransaction = () => {
    setTempItems([]);
    setConfiguratorInput(INITIAL_INPUT_STATE);
    setPaymentState(INITIAL_PAYMENT_STATE);
    setTransactionStage(TRANSACTION_STAGES.CART);
    setDiscount(0);
    clearCustomerSnapshot();
  };

  // === RETURN UTAMA ===
  return {
    categories,
    currentCategory,
    selectCategory,
    configuratorInput,
    updateConfiguratorInput, // ✅ SUDAH ADA
    getCurrentPreview: _calculateCurrentPrice, // ✅ SUDAH ADA

    // Calculator Statis (Modal)
    calculateItemPrice, // ✅ SUDAH ADA

    items: tempItems,
    addItemToCart,
    removeItem,
    clearCart,
    calculateTotal,
    discount,
    setDiscount,
    paymentState,
    updatePaymentState,
    confirmPayment,
    finalizeOrder,
    customerSnapshot,
    updateCustomerSnapshot,
    clearCustomerSnapshot,
    targetDate,
    setTargetDate,
    setPriorityStandard,
    setPriorityExpress,
    setPriorityUrgent,
    transactionStage,
    setTransactionStage,
    validateStageTransition,
    resetTransaction,
  };
}
