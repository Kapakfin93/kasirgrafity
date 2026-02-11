/**
 * Order Store - Zustand (V5.4 - OPTIMISTIC UI FIX)
 * State management for order/production tracking
 * Features:
 * - Strict Normalization
 * - Supabase Hybrid Sync
 * - Auto Audit Logging (CCTV)
 * - INTELLIGENT DASHBOARD FEED (Via ownerDecisionEngine)
 * - FIX: Resolved "White Screen" by fixing imports and syntax
 */

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { supabase } from "../services/supabaseClient";
import { db } from "../data/db/schema"; // Top-level import for stability
import { OrderSyncService } from "../services/OrderSyncService"; // Top-level import

import {
  logPOSOrderCreated,
  logPaymentRecorded,
  logOrderStatusChanged,
  logEvent,
} from "../utils/eventLogger";

// Import Mesin Cerdas (Core)
import { getOwnerDailySnapshot } from "../core/ownerDecisionEngine";

// === 1. FINAL NORMALIZER (PIPA PERBAIKAN) ===
const internalNormalizeOrder = (dbOrder) => {
  if (!dbOrder) return null;

  // A. PARSE SNAPSHOT
  let rawItems = [];
  if (dbOrder.items_snapshot) {
    if (Array.isArray(dbOrder.items_snapshot)) {
      rawItems = dbOrder.items_snapshot;
    } else if (typeof dbOrder.items_snapshot === "object") {
      rawItems = [dbOrder.items_snapshot];
    } else if (typeof dbOrder.items_snapshot === "string") {
      try {
        rawItems = JSON.parse(dbOrder.items_snapshot);
      } catch {
        rawItems = [];
      }
    }
  }
  if ((!rawItems || rawItems.length === 0) && dbOrder.items) {
    rawItems = dbOrder.items;
  }

  // B. DESCRIPTION BUILDER (LOGIKA BARU - LEBIH PINTAR)
  const buildDescription = (item) => {
    const meta = item.meta || item.metadata || {};
    const parts = [];

    // [FIX 1] Cari Ukuran di 'original_specs' dulu (sesuai log terakhir)
    const dims =
      meta.original_specs ||
      meta.custom_dimensions ||
      meta.dimensions ||
      (meta.specs_json ? meta.specs_json : null);

    // Logic Tampilan Ukuran (5m x 1m)
    if (dims) {
      const l = parseFloat(dims.length || dims.h || 0);
      const w = parseFloat(dims.width || dims.w || 0);

      // Jika ada Variant Label (Flexi 280gr..), pakai itu
      if (dims.variantLabel) {
        parts.push(dims.variantLabel);
      } else if (l > 0 && w > 0) {
        // Jika tidak ada label, pakai ukuran manual
        parts.push(`${l}m x ${w}m`);
      }
    }

    // Logic Tampilan Finishing
    const finish =
      meta.finishing_names || // Prioritas 1: Nama dari SQL Label Fix
      meta.finishing ||
      (meta.finishing_ids && Array.isArray(meta.finishing_ids)
        ? meta.finishing_ids.join(", ")
        : null);

    if (finish && finish !== "") {
      parts.push(`Fin: ${finish}`);
    }

    return parts.join(" | ");
  };

  // C. EXPLICIT MAPPING
  return {
    id: dbOrder.id,
    server_id: dbOrder.id,
    ref_local_id: dbOrder.ref_local_id || null,
    orderNumber: dbOrder.order_number || dbOrder.orderNumber || "-",
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,

    // Pastikan Operator & Kasir Terbaca
    receivedBy: dbOrder.received_by,
    assignedTo: dbOrder.assigned_to,

    // Financials
    totalAmount: Number(dbOrder.total_amount || dbOrder.totalAmount || 0),
    paidAmount: Number(dbOrder.paid_amount || dbOrder.paidAmount || 0),
    remainingAmount: Number(
      dbOrder.remaining_amount || dbOrder.remainingAmount || 0,
    ),
    discountAmount: Number(
      dbOrder.discount_amount || dbOrder.discountAmount || 0,
    ),

    // [FIX 2] Angkat Service Fee keluar dari Meta agar Nota mudah baca
    serviceFee: Number(dbOrder.meta?.service_fee || 0),
    productionPriority: dbOrder.meta?.production_priority || "STANDARD",

    // Status
    productionStatus:
      dbOrder.production_status || dbOrder.productionStatus || "PENDING",
    paymentStatus: dbOrder.payment_status || dbOrder.paymentStatus || "UNPAID",
    paymentMethod: dbOrder.payment_method || dbOrder.paymentMethod || "TUNAI",
    isTempo: Boolean(dbOrder.is_tempo || dbOrder.isTempo),
    createdAt: dbOrder.created_at || dbOrder.createdAt,

    cancelReason: dbOrder.cancel_reason || dbOrder.cancelReason,
    cancelledAt: dbOrder.cancelled_at || dbOrder.cancelledAt,
    financialAction:
      dbOrder.financial_action || dbOrder.financialAction || "NONE",

    // Meta
    meta: dbOrder.meta || {},

    // [FIX 3] DEADLINE EXPOSURE (Untuk SPK)
    targetDate:
      dbOrder.target_date ||
      dbOrder.targetDate ||
      dbOrder.meta?.estimate_date ||
      null,

    // Items
    items: rawItems.map((item) => ({
      id: item.id || Math.random().toString(36).substr(2, 9),
      productId: item.product_id || item.productId,
      productName: item.product_name || item.productName || item.name || "Item",
      qty: Number(item.quantity || item.qty || 0),
      price: Number(item.price || item.unit_price || 0),
      totalPrice: Number(item.subtotal || item.total_price || 0),
      notes:
        item.dimensions?.note ||
        item.meta?.notes ||
        item.metadata?.notes ||
        item.notes ||
        "", // Prioritas: Dimensions (Smart Merge) -> Meta -> Direct

      // INI YANG AKAN DITAMPILKAN DI NOTA
      description: buildDescription(item),

      // 🔥 FIX: DATA CARRIER (Jangan Buang Dimensions!)
      dimensions: item.dimensions || item.specs || {},
      specs: item.dimensions || item.specs || {}, // Fallback for safety

      meta: item.meta || item.metadata || {},
    })),
  };
};

export const useOrderStore = create((set, get) => ({
  // State
  orders: [],
  filteredOrders: [],
  currentFilter: "ALL",
  loading: false,
  error: null,

  // Pagination State
  currentPage: 1,
  pageSize: 20,
  totalOrders: 0,
  totalPages: 0,
  searchQuery: "",

  // Summary Data
  summaryData: {
    totalCount: 0,
    totalSales: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    omsetBahan: 0,
    omsetJasa: 0,
    countByPaymentStatus: { PAID: 0, DP: 0, UNPAID: 0 },
    countByProductionStatus: {
      PENDING: 0,
      IN_PROGRESS: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    },
  },

  // === ACTIONS ===

  // 1. LOAD ORDERS
  loadOrders: async ({
    page = 1,
    limit = 20,
    paymentStatus = "ALL",
    productionStatus = "ALL",
  } = {}) => {
    set({ loading: true, error: null });
    try {
      const safeLimit = Math.min(limit, 100);
      const offset = (page - 1) * safeLimit;

      if (navigator.onLine && supabase) {
        let query = supabase
          .from("orders")
          .select(`*, items_snapshot, items:order_items(*)`, {
            count: "exact",
          });

        if (paymentStatus !== "ALL")
          query = query.eq("payment_status", paymentStatus);
        if (productionStatus !== "ALL")
          query = query.eq("production_status", productionStatus);

        const { data, count, error } = await query
          .range(offset, offset + safeLimit - 1)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const appOrders = data.map(internalNormalizeOrder);

        set({
          orders: appOrders,
          filteredOrders: appOrders,
          totalOrders: count,
          totalPages: Math.ceil(count / safeLimit),
          currentPage: page,
          pageSize: safeLimit,
          currentFilter: paymentStatus,
          loading: false,
        });
      }
    } catch (error) {
      console.error(error);
      set({ error: error.message, loading: false });
    }
  },

  // 2. LOAD SUMMARY (HYBRID INTELLIGENCE)
  loadSummary: async (dateRange = null) => {
    try {
      // A. Fetch Basic Data
      let query = supabase
        .from("orders")
        .select(
          "id, total_amount, grand_total, discount_amount, paid_amount, remaining_amount, payment_status, production_status, items_snapshot, created_at, meta",
        );

      if (dateRange?.start && dateRange.end) {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Stats Container
      let stats = {
        totalCount: 0,
        totalSalesGross: 0,
        totalSalesNet: 0,
        totalDiscount: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        omsetBahan: 0,
        omsetJasa: 0,
        countByPayment: { PAID: 0, DP: 0, UNPAID: 0 },
        countByProduction: {
          PENDING: 0,
          IN_PROGRESS: 0,
          READY: 0,
          DELIVERED: 0,
          CANCELLED: 0,
        },
      };

      orders.forEach((o) => {
        if (o.production_status === "CANCELLED") {
          stats.countByProduction.CANCELLED++;

          // ✅ FIX: Catat uang masuk (DP) meskipun order batal.
          // Uang fisik sudah diterima, tidak boleh hilang dari laporan Cash Flow.
          const paid = Number(o.paid_amount || 0);
          stats.totalCollected += paid; // Tambahkan ke Uang Masuk

          return; // Skip dari perhitungan Sales/Omzet
        }

        stats.totalCount++;

        // --- 1. Bedah Item (Bahan vs Jasa) ---
        let items = [];
        let calculatedItemsTotal = 0; // Temp total dari item

        if (o.items_snapshot) {
          if (typeof o.items_snapshot === "string") {
            try {
              items = JSON.parse(o.items_snapshot);
            } catch (e) {
              console.warn("Ignored error:", e);
            }
          } else {
            items = o.items_snapshot;
          }
        }

        items.forEach((item) => {
          const itemTotal = Number(
            item.totalPrice || item.total_price || item.subtotal || 0,
          );
          calculatedItemsTotal += itemTotal;

          const name = (
            item.productName ||
            item.product_name ||
            item.name ||
            ""
          ).toLowerCase();
          const serviceKeywords = [
            "jasa",
            "layanan",
            "design",
            "desain",
            "setting",
            "ongkos",
            "delivery",
            "biaya",
            "fee",
            "express",
            "prioritas",
          ];

          if (serviceKeywords.some((keyword) => name.includes(keyword))) {
            stats.omsetJasa += itemTotal;
          } else {
            stats.omsetBahan += itemTotal;
          }
        });

        // --- 💉 SURGICAL PATCH: Add Metadata Fee (Architecture A) ---
        // Fix for "Invisible Fee" where service revenue is stored in meta only
        const metaFee = Number(o.meta?.production_service?.fee) || 0;
        stats.omsetJasa += metaFee;

        // --- 2. Hitung Keuangan (INI YANG TADI HILANG!) ---
        let gross = Number(o.total_amount || 0);
        let net = Number(o.grand_total || o.total_amount || 0); // Fallback ke total_amount jika grand_total null
        const discount = Number(o.discount_amount || 0);
        const paid = Number(o.paid_amount || 0);

        // Safety check: Jika header 0 tapi item ada isinya
        if (net === 0 && calculatedItemsTotal > 0) {
          net = calculatedItemsTotal;
          if (gross === 0) gross = calculatedItemsTotal;
        }

        const remaining = net - paid;

        stats.totalSalesGross += gross;
        stats.totalSalesNet += net; // <-- Akumulasi Penjualan
        stats.totalDiscount += discount;
        stats.totalCollected += paid; // <-- Akumulasi Uang Masuk
        stats.totalOutstanding += remaining;

        // --- 3. Status Counter ---
        let payStatus = o.payment_status || "UNPAID";
        if (payStatus === "PARTIAL") payStatus = "DP"; // Map PARTIAL to DP for display
        if (stats.countByPayment[payStatus] !== undefined)
          stats.countByPayment[payStatus]++;

        const prodStatus = o.production_status || "PENDING";
        if (stats.countByProduction[prodStatus] !== undefined)
          stats.countByProduction[prodStatus]++;
      });

      // B. FETCH CORE SNAPSHOT
      let intelligentData = {};
      try {
        const snapshot = await getOwnerDailySnapshot();
        if (snapshot.success) {
          intelligentData = {
            totalSales: snapshot.today.newOrdersAmount,
            totalCollected: snapshot.today.paymentsAmount,
            totalOutstanding: snapshot.receivables.total,
          };
        }
      } catch (err) {
        console.warn("Core Snapshot Failed", err);
      }

      // C. MERGE RESULT
      const isTodayFilter =
        dateRange?.start &&
        dateRange?.end &&
        dateRange.end.getTime() - dateRange.start.getTime() < 86400000 + 1000;

      const summaryResult = {
        totalCount: stats.totalCount,

        // JIKA "Hari Ini": Pakai Core (Supaya Alex terbaca real-time)
        // JIKA "Bulan Ini": Pakai Stats Manual (Supaya angka 5 Juta muncul)
        totalSales:
          isTodayFilter && intelligentData.totalSales != null
            ? intelligentData.totalSales
            : stats.totalSalesNet,

        totalGross: stats.totalSalesGross,
        totalDiscount: stats.totalDiscount,

        totalCollected:
          isTodayFilter && intelligentData.totalCollected != null
            ? intelligentData.totalCollected
            : stats.totalCollected,

        totalOutstanding:
          intelligentData.totalOutstanding ?? stats.totalOutstanding,

        omsetBahan: stats.omsetBahan,
        omsetJasa: stats.omsetJasa,
        countByPaymentStatus: stats.countByPayment,
        countByProductionStatus: stats.countByProduction,
      };

      set({ summaryData: summaryResult });
      return summaryResult;
    } catch (error) {
      console.error("❌ Failed to load summary:", error);
    }
  },

  // === SPECS STANDARDIZER (KONTRAK FINAL) ===
  // Fungsi tunggal untuk translate semua variasi produk ke format specs
  // buildSpecsFromProduct: (item) => { ... } - Defined inline below for access

  // 3. CREATE ORDER (V2 - ATOMIC RPC)
  createOrder: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { items, ...orderHeader } = payload;
      if (!orderHeader.customer_name)
        throw new Error("ORDER REJECTED: Nama customer wajib diisi");

      // === BUILD RAW_INTENT PAYLOAD (FIXED: USE CART SPECS DIRECTLY) ===
      const rawItems = items.map((item) => {
        // 🕵️ DEBUG: SPY ON THE RAW ITEM STRUCTURE
        if (
          item.product_name?.includes("DISPLAY") ||
          item.productName?.includes("DISPLAY") ||
          item.name?.includes("DISPLAY") ||
          item.product_id?.includes("display")
        ) {
          console.log("🕵️ RAW ITEM PAYLOAD:", JSON.stringify(item, null, 2));
        }

        // 1. CALCULATE FINISHING TOTAL (keep for legacy)
        const sourceFinishings =
          item.finishings || item.metadata?.finishing_list || [];

        const finishingTotal = sourceFinishings.reduce(
          (sum, f) => sum + (f.price || 0),
          0,
        );

        // 2. UNIT PRICE
        let baseUnitPrice = Number(item.unitPrice || item.price || 0);

        // 🔥 FIX: FALLBACK CALCULATION
        // If unitPrice is 0 but we have subtotal, derive it.
        if (baseUnitPrice === 0 && (item.totalPrice || item.subtotal)) {
          const sub = Number(item.totalPrice || item.subtotal || 0);
          const q = Number(item.qty || item.quantity || 1);
          if (q > 0) baseUnitPrice = sub / q;
        }

        const finalUnitPrice = baseUnitPrice;

        // 3. PRODUCT NAME
        const productName =
          item.product_name ||
          item.productName ||
          item.name ||
          "Unknown Product";

        // 4. 🔥 CTO DIRECTIVE: USE CART SPECS OR FALLBACK
        let specs = item.specs;

        // 5. 🔥 FALLBACK (CTO REVISION: NO CRASH)
        if (!specs || !specs.summary) {
          console.warn(
            "⚠️ LEGACY_CART_STATE: specs missing for:",
            productName,
            "Using fallback.",
          );
          specs = {
            type: "LEGACY",
            summary: productName,
            inputs: {},
          };
        }

        // 6. LEGACY SPECS (for backward compatibility only)
        const foundSpecs =
          item.dimensions ||
          item.metadata?.specs_json ||
          item.metadata?.original_specs ||
          null;
        // 7. BUILD ITEM (specs AT ITEM LEVEL, not inside metadata)

        // 🔥 FIX: STANDARDIZE QUANTITY VARIABLE (Calculated ONCE)
        const finalQty = Number(item.qty || item.quantity || 1);

        // 🕵️ DEBUG: Check item fields BEFORE isUnitType detection
        console.log("🔍 PRE-CHECK ITEM:", {
          product_name: productName,
          input_mode: item.input_mode,
          pricing_type: item.pricing_type,
          price_mode: item.price_mode,
          product_id: item.product_id,
          productId: item.productId,
        });

        // 🔥 PHASE 1 FIX: UNIT PRODUCT DATA CAPTURE (X-Banner / Display System)
        // Detect if this is a UNIT-type product
        const isUnitType =
          item.input_mode === "UNIT" ||
          item.pricing_type === "UNIT" ||
          item.price_mode === "UNIT" ||
          (item.product_id && item.product_id.includes("display"));

        // Capture hidden data for UNIT products
        let enrichedDimensions = item.dimensions || item.specs || {};
        let enrichedMaterialId =
          item.dimensions?.materialId ||
          item.dimensions?.variantId ||
          item.selected_details?.material_id ||
          null;
        let enrichedSizeId =
          item.dimensions?.sizeKey ||
          item.dimensions?.selectedVariant?.label ||
          item.selected_details?.size_id ||
          null;

        if (isUnitType) {
          console.log(
            "🔧 UNIT TYPE DETECTED:",
            productName,
            "| Processing material extraction...",
          );

          // STEP 1: Extract variant/material from CORRECT SOURCES
          // 🔥 CRITICAL: Material data for X-Banner is in finishing_list array
          const finishingList =
            item.finishing_list || item.metadata?.finishing_list || [];
          const selectedFinishing = item.selected_finishing || {};
          const finishingSelections = item.finishing_selections || [];
          const selectedVariant = item.selected_variant || {};

          console.log("📦 Data Sources:", {
            finishing_list_count: finishingList.length,
            has_selected_finishing: Object.keys(selectedFinishing).length > 0,
            has_selected_variant: Object.keys(selectedVariant).length > 0,
            dimensions_inputs: item.dimensions?.inputs,
          });

          // STEP 2: Build material label from available sources
          let materialLabel = "";
          let variantLabel = "";
          let sizeLabel = "";

          // 🔥 PRIORITY 1: Check finishing_list (PRIMARY SOURCE for X-Banner)
          // For Display System, material (Flexi 280gr, Albatros, etc.) is stored as finishing
          if (finishingList.length > 0) {
            const firstFinishing = finishingList[0];
            materialLabel =
              firstFinishing.name ||
              firstFinishing.label ||
              firstFinishing.id ||
              "";

            if (materialLabel) {
              console.log(
                "✅ Material FOUND in finishing_list[0]:",
                materialLabel,
              );
            } else {
              console.warn(
                "⚠️ finishing_list[0] exists but has no name/label/id:",
                firstFinishing,
              );
            }
          } else {
            console.warn("⚠️ finishing_list is EMPTY - checking fallbacks...");
          }

          // PRIORITY 2: Try selected_finishing (Legacy/Fallback)
          if (!materialLabel && selectedFinishing.material) {
            materialLabel = selectedFinishing.material;
            console.log(
              "✅ Material from selected_finishing.material:",
              materialLabel,
            );
          }
          if (!materialLabel && selectedFinishing.label) {
            materialLabel = selectedFinishing.label;
            console.log(
              "✅ Material from selected_finishing.label:",
              materialLabel,
            );
          }

          // PRIORITY 3: Try selected_variant (Merch/ATK pattern)
          if (!materialLabel && selectedVariant.material) {
            materialLabel = selectedVariant.material;
            console.log(
              "✅ Material from selected_variant.material:",
              materialLabel,
            );
          }

          // PRIORITY 4: Try dimensions.inputs.variant (X-Banner variant name)
          if (!variantLabel && item.dimensions?.inputs?.variant) {
            variantLabel = item.dimensions.inputs.variant;
            console.log(
              "✅ Variant from dimensions.inputs.variant:",
              variantLabel,
            );
          }

          // Extract size if available
          if (selectedVariant.size) {
            sizeLabel = selectedVariant.size;
          } else if (selectedFinishing.size) {
            sizeLabel = selectedFinishing.size;
          }

          // STEP 3: Build enriched summary
          const originalSummary = enrichedDimensions.summary || productName;
          let enrichedSummary = originalSummary;

          // Only enrich if we found material data
          if (materialLabel || variantLabel) {
            const detailPart = materialLabel || variantLabel;
            enrichedSummary = `${originalSummary} | ${detailPart}${sizeLabel ? ` | ${sizeLabel}` : ""}`;
            console.log("📝 Enriched Summary Created:", enrichedSummary);
          } else {
            console.error(
              "❌ CRITICAL: No material data found for UNIT product:",
              productName,
            );
            console.error("Raw item data:", {
              finishing_list: finishingList,
              selected_finishing: selectedFinishing,
              selected_variant: selectedVariant,
              dimensions_inputs: item.dimensions?.inputs,
            });
          }

          // STEP 4: Merge captured data into dimensions
          enrichedDimensions = {
            ...enrichedDimensions,
            // Preserve original
            ...(item.dimensions || {}),
            // Inject captured fields (CRITICAL for rendering)
            material:
              materialLabel || variantLabel || enrichedDimensions.material,
            variantLabel:
              variantLabel || materialLabel || enrichedDimensions.variantLabel,
            size: sizeLabel || enrichedDimensions.size,
            // Enrich summary with material info
            summary: enrichedSummary,
            // Store raw sources for debugging
            _unit_capture: {
              selected_finishing: selectedFinishing,
              selected_variant: selectedVariant,
              finishing_selections: finishingSelections,
              finishing_list: finishingList,
            },
          };

          console.log("🎯 Final enrichedDimensions:", {
            material: enrichedDimensions.material,
            variantLabel: enrichedDimensions.variantLabel,
            summary: enrichedDimensions.summary,
          });

          // STEP 5: Update IDs if we found labels
          if (materialLabel || variantLabel) {
            enrichedMaterialId =
              enrichedMaterialId || materialLabel || variantLabel;
          }
          if (sizeLabel) {
            enrichedSizeId = enrichedSizeId || sizeLabel;
          }

          console.log("🔧 UNIT Product Enriched:", {
            product: productName,
            material: enrichedMaterialId,
            size: enrichedSizeId,
            summary: enrichedDimensions.summary,
          });
        }

        // 🔥 PHASE 2 FIX: MATRIX PRODUCT DATA CAPTURE (Poster)
        const isMatrixType =
          item.pricing_type === "MATRIX" ||
          item.pricingType === "MATRIX" ||
          item.dimensions?.type === "MATRIX" ||
          item.specs?.type === "MATRIX";

        if (isMatrixType) {
          console.log(
            "📐 MATRIX TYPE DETECTED:",
            productName,
            "| Processing finishing & notes...",
          );

          // STEP 1: Extract & Append Finishing to Summary
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          if (finishingList.length > 0) {
            const finishingNames = finishingList
              .map((f) => f.name || f.label || f.id)
              .filter(Boolean);
            const finishingText = finishingNames.join(", ");

            console.log("🎨 Finishing extracted:", finishingText);

            // Append if not already present
            if (
              finishingText &&
              !enrichedDimensions.summary?.includes(finishingText)
            ) {
              enrichedDimensions = {
                ...enrichedDimensions,
                summary: `${enrichedDimensions.summary || ""} | ${finishingText}`,
              };
              console.log("📝 Summary enriched:", enrichedDimensions.summary);
            }
          }

          console.log("🎯 Final MATRIX dimensions:", {
            summary: enrichedDimensions.summary,
          });
        }

        // 🔥 PHASE 3 FIX: LINEAR PRODUCT DATA CAPTURE (Textile/Rolls)
        const isLinearType =
          item.categoryId === "CAT_ROLLS" ||
          item.category_id === "CAT_ROLLS" ||
          item.pricing_type === "LINEAR" ||
          item.pricingType === "LINEAR" ||
          item.dimensions?.type === "LINEAR" ||
          item.specs?.type === "LINEAR";

        if (isLinearType) {
          console.log(
            "📏 LINEAR TYPE DETECTED:",
            productName,
            "| Processing finishing, notes & material...",
          );

          // STEP 1: Extract & Append Finishing to Summary
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          if (finishingList.length > 0) {
            const finishingNames = finishingList
              .map((f) => f.name || f.label || f.id)
              .filter(Boolean);
            const finishingText = finishingNames.join(", ");

            console.log("✂️ Finishing extracted:", finishingText);

            // Append if not already present
            if (
              finishingText &&
              !enrichedDimensions.summary?.includes(finishingText)
            ) {
              enrichedDimensions = {
                ...enrichedDimensions,
                summary: `${enrichedDimensions.summary || ""} | ${finishingText}`,
              };
              console.log("📝 Summary enriched:", enrichedDimensions.summary);
            }
          }

          // STEP 2: Capture Material ID from dimensions.inputs
          if (!enrichedMaterialId && enrichedDimensions.inputs?.material) {
            enrichedMaterialId = enrichedDimensions.inputs.material;
            console.log("🧵 Material ID captured:", enrichedMaterialId);
          }

          console.log("🎯 Final LINEAR enrichment:", {
            summary: enrichedDimensions.summary,
            material_id: enrichedMaterialId,
          });
        }

        // 🔥 PHASE 4: MERCH_APPAREL FIX (Jersey, Kaos, Mug)
        const isMerchApparel =
          item.categoryId === "MERCH_APPAREL" ||
          item.category_id === "MERCH_APPAREL";

        if (isMerchApparel) {
          console.log(
            "👕 MERCH_APPAREL TYPE DETECTED:",
            productName,
            "| Processing finishing, attributes, notes & variant...",
          );

          // STEP 1: Collect ALL Extra Info (Finishing + Attributes)
          const extras = [];

          // Extract Finishings
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          finishingList.forEach((f) => {
            const name = f.name || f.label || f.id;
            if (name) extras.push(name);
          });

          console.log("🎨 Finishings extracted:", finishingList.length);

          // Extract Attributes (Color/Size for Merch if not in variant)
          if (item.attributes && typeof item.attributes === "object") {
            Object.entries(item.attributes).forEach(([key, val]) => {
              if (
                val &&
                key !== "notes" &&
                typeof val === "string" &&
                val.trim()
              ) {
                extras.push(val);
              }
            });
            console.log(
              "🏷️ Attributes extracted:",
              Object.keys(item.attributes).length,
            );
          }

          // STEP 2: Append to Summary
          const extraText = extras.filter(Boolean).join(", ");
          if (extraText && !enrichedDimensions.summary?.includes(extraText)) {
            enrichedDimensions = {
              ...enrichedDimensions,
              summary: `${enrichedDimensions.summary || ""} | ${extraText}`,
            };
            console.log("📝 Summary enriched:", enrichedDimensions.summary);
          }

          // STEP 3: Capture Variant/Material ID from multiple sources
          if (!enrichedMaterialId) {
            enrichedMaterialId =
              enrichedDimensions.inputs?.variant ||
              item.selected_variant?.name ||
              item.selected_variant?.label ||
              null;

            if (enrichedMaterialId) {
              console.log("🏷️ Variant ID captured:", enrichedMaterialId);
            }
          }

          console.log("🎯 Final MERCH_APPAREL enrichment:", {
            summary: enrichedDimensions.summary,
            material_id: enrichedMaterialId,
            extras_count: extras.length,
          });
        }

        // 🔥 PHASE 5: STATIONERY (MATERIAL-BASED) FIX
        // Applies to: Yasin, Stempel, Kop, Kalender (Products using Materials as Main Variants)
        // EXCLUDES: Nota (handled by Matrix logic)
        const stationeryMaterialKeywords = [
          "yasin",
          "stempel",
          "kop_surat",
          "piagam",
          "stopmap",
          "kalender",
          "map_ijazah",
          "brosur",
          "amplop",
        ];

        // Safe product_id check (whitelist approach)
        const isMaterialStationery =
          item.product_id &&
          stationeryMaterialKeywords.some((key) =>
            item.product_id.includes(key),
          );

        if (isMaterialStationery) {
          console.log(
            "📚 STATIONERY (MATERIAL) DETECTED:",
            item.product_id,
            "| Processing material, finishing & notes...",
          );

          // STEP 1: CAPTURE MAIN SPEC (Material/Variant Name)
          // Audit shows Yasin stores "Softcover 180" in inputs.variant OR inputs.material
          const mainSpec =
            enrichedDimensions.inputs?.variant ||
            enrichedDimensions.inputs?.material ||
            enrichedDimensions.variantLabel ||
            item.selected_variant?.name ||
            "";

          console.log("📖 Main spec (material):", mainSpec);

          // STEP 2: FORCE SET material_id (Crucial for Reporting & SPK)
          // Database expects material name (e.g., "Softcover 180")
          if (!enrichedMaterialId && mainSpec) {
            enrichedMaterialId = mainSpec;
            console.log("🏷️ Material ID captured:", enrichedMaterialId);
          }

          // STEP 3: EXTRACT FINISHINGS
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          const finishingNames = finishingList
            .map((f) => f.name || f.label || f.id)
            .filter(Boolean);
          const finishingText = finishingNames.join(", ");

          console.log("📎 Finishings:", finishingText || "(none)");

          // STEP 4: ENRICH SUMMARY WITH FINISHINGS
          // Start with existing summary OR the captured main spec
          let newSummary = enrichedDimensions.summary || mainSpec;

          // Append finishing (avoid duplicates)
          if (finishingText && !newSummary.includes(finishingText)) {
            newSummary = `${newSummary} | ${finishingText}`;
            console.log("📝 Summary enriched:", newSummary);
          }

          // Apply enriched summary
          enrichedDimensions = {
            ...enrichedDimensions,
            summary: newSummary,
          };

          console.log("🎯 Final STATIONERY enrichment:", {
            summary: enrichedDimensions.summary,
            material_id: enrichedMaterialId,
            finishing_count: finishingNames.length,
          });
        }

        // 👕 PHASE 4: MERCH & APPAREL ENRICHMENT (Lanyard, Jersey, Kaos)
        // Detect via category OR product ID keywords (CASE-INSENSITIVE)
        const merchKeywords = ["MERCH", "LANYARD", "JERSEY", "KAOS"];
        const productIdUpper = (item.product_id || "").toUpperCase();
        const isMerchProduct =
          item.categoryId === "MERCH_APPAREL" ||
          merchKeywords.some((key) => productIdUpper.includes(key));

        if (isMerchProduct) {
          console.log(
            "👕 MERCH/APPAREL DETECTED:",
            item.product_id,
            "| Processing variant + finishings...",
          );

          // STEP 1: CAPTURE MAIN SPEC (Material/Variant from Frontend)
          // Lanyard stores "Lanyard Tissue 2cm" in inputs.variant OR variantLabel
          const mainSpec =
            enrichedDimensions.inputs?.variant ||
            enrichedDimensions.variantLabel ||
            item.selected_variant?.name ||
            "";

          console.log("🏷️ Main spec (variant):", mainSpec);

          // STEP 2: EXTRACT FINISHINGS (Crucial for Lanyard: Stoppers, Hooks)
          // Check all possible sources for finishings
          let finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          const finishingNames = finishingList
            .map((f) => f.name || f.label || f.id)
            .filter(Boolean);
          const finishingText = finishingNames.join(", ");

          console.log("📎 Finishings:", finishingText || "(none)");

          // STEP 3: ENRICH SUMMARY WITH FINISHINGS
          // Start with existing summary OR the captured main spec
          let newSummary = enrichedDimensions.summary || mainSpec;

          // Append finishing (avoid duplicates)
          if (finishingText && !newSummary.includes(finishingText)) {
            newSummary = `${newSummary} | ${finishingText}`;
            console.log("📝 MERCH Summary enriched:", newSummary);
          }

          // Apply enriched summary
          enrichedDimensions = {
            ...enrichedDimensions,
            summary: newSummary,
          };

          console.log("🎯 Final MERCH/APPAREL enrichment:", {
            summary: enrichedDimensions.summary,
            finishing_count: finishingNames.length,
          });
        }

        // 🔥 PHASE 6: DIGITAL A3 PRO FIX (Universal: Booklet, Stiker, Kartu Nama)
        // Covers all products in DIGITAL_A3_PRO category including Stiker & Kartu Nama
        const isBookletOrA3 =
          item.categoryId === "DIGITAL_A3_PRO" ||
          enrichedDimensions.type === "BOOKLET" ||
          item.product_id === "master_print_dokumen" ||
          item.product_id === "cetak_majalah_a4" ||
          item.product_id === "master_stiker_a3" || // ✅ Explicitly include Stiker
          item.product_id === "master_kartu_nama";

        if (isBookletOrA3) {
          console.log(
            "🖨️ A3 PRO DETECTED (Universal):",
            productName,
            "| Processing main spec + finishings...",
          );

          // STEP 1: CAPTURE MAIN SPEC (Hybrid Strategy)
          // - Booklet uses 'paper'
          // - Stiker/Kartu Nama uses 'variant'
          const mainSpec =
            enrichedDimensions.inputs?.paper ||
            enrichedDimensions.inputs?.variant ||
            enrichedDimensions.variantLabel ||
            "";

          console.log("📄 Main Spec detected:", mainSpec);

          // Force set material_id if not already set
          if (!enrichedMaterialId && mainSpec) {
            enrichedMaterialId = mainSpec;
            console.log("🏷️ Material ID captured:", mainSpec);
          }

          // STEP 2: EXTRACT FINISHINGS (Universal Source)
          // A3 Calculator puts finishings in metadata.finishing_list
          let finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];

          const finishingNames = finishingList
            .map((f) => f.name || f.label || f.id)
            .filter(Boolean);
          const finishingText = finishingNames.join(", ");

          console.log("📎 Finishings:", finishingText || "(none)");

          // STEP 3: ENRICH SUMMARY
          // Start with existing summary OR main spec
          let newSummary = enrichedDimensions.summary || mainSpec;

          // Append finishing if exists and not already present
          if (finishingText && !newSummary.includes(finishingText)) {
            // Use Pipe separator for clear distinction
            newSummary = `${newSummary} | ${finishingText}`;
            console.log("📝 A3 Summary enriched:", newSummary);
          }

          // Apply enriched summary
          enrichedDimensions = {
            ...enrichedDimensions,
            summary: newSummary,
          };

          console.log("🎯 Final A3 PRO enrichment:", {
            summary: enrichedDimensions.summary,
            material_id: enrichedMaterialId,
            finishing_count: finishingNames.length,
          });
        }

        // 🔍 DEBUG: Trace note sources BEFORE return
        console.log("📝 NOTE SOURCES CHECK:", {
          product: productName,
          "item.note": item.note,
          "item.notes": item.notes,
          "selected_details.notes": item.selected_details?.notes,
          "attributes.notes": item.attributes?.notes,
          "specs.notes": item.specs?.notes,
        });

        return {
          product_id: item.productId || item.product_id,
          product_name: productName,

          material_id: enrichedMaterialId,
          size_id: enrichedSizeId,
          quantity: finalQty,

          unit_price: finalUnitPrice,
          // 🔥 FIX: FORCE RECALCULATE SUBTOTAL (Trust Math, Not Input)
          subtotal: finalUnitPrice * finalQty,

          // 🔥 CRITICAL FIX: Both dimensions AND specs must use enriched data
          // SPK/NOTA may read from either field depending on database schema
          dimensions: enrichedDimensions,
          specs: enrichedDimensions, // ✅ Use enriched data, not raw item.specs

          // Force copy the note from all possible sources
          note:
            item.note ||
            item.notes ||
            item.selected_details?.notes ||
            item.attributes?.notes ||
            item.specs?.notes ||
            "",

          // Ensure metadata survives
          meta: item.meta || {},

          // LEGACY METADATA (keep for backward compatibility - local only)
          metadata: {
            is_manual_price: true,
            original_specs: foundSpecs,
            variant_info: specs.summary,
            finishing_ids: sourceFinishings.map((f) => f.id || f.name),
            finishing_total: finishingTotal,
            finishing_list: sourceFinishings,
            price_source: "frontend_calculator",
            notes:
              item.notes ||
              item.selected_details?.notes ||
              item.attributes?.notes ||
              "",
            calc_debug: `qty(${finalQty}) * unit(${finalUnitPrice}) = ${finalUnitPrice * finalQty}`,
          },

          // 🔥 FIX: Sync notes field with note field (check all sources)
          notes:
            item.note ||
            item.notes ||
            item.selected_details?.notes ||
            item.attributes?.notes ||
            item.specs?.notes ||
            "",
        };
      });

      // 🕵️ DEBUG: Check final payload BEFORE sending to Supabase
      console.log(
        "💾 FINAL PAYLOAD TO DATABASE:",
        JSON.stringify(rawItems, null, 2),
      );
      rawItems.forEach((item, idx) => {
        console.log(`📦 ITEM ${idx + 1} DIMENSIONS:`, {
          product: item.product_name,
          dimensions_summary: item.dimensions?.summary,
          dimensions_material: item.dimensions?.material,
          dimensions_full: item.dimensions,
        });
      });

      const rawIntent = {
        idempotency_key: uuid(),

        customer: {
          name: payload.customer_name,
          phone: payload.customer_phone || "-",
        },

        items: rawItems,

        payment: {
          amount: parseFloat(payload.paid_amount || 0),
          method: payload.payment_method || "TUNAI",
          received_by: payload.received_by || "System",
        },

        // 🔥 FRONTEND AUTHORITY (Financial State)
        // Values calculated by useTransaction.js are now TRUSTED by the Backend.
        total_amount: parseFloat(payload.total_amount || 0),
        tax_amount: parseFloat(payload.tax_amount || 0),
        discount_amount: parseFloat(payload.discount_amount || 0),
        remaining_amount: parseFloat(payload.remaining_amount || 0),
        payment_status: payload.payment_status || "UNPAID",
        is_tempo: payload.is_tempo || false,
        production_status: payload.production_status || "PENDING",

        // [FIX 5] LIFT DEADLINE TO ROOT (Critical for SPK)
        target_date: payload.target_date || payload.meta?.target_date || null,

        meta: {
          received_by: payload.received_by || "Kasir",
          production_priority:
            payload.meta?.production_service?.priority || "STANDARD",
          target_date: payload.target_date,
          discount_request: parseFloat(payload.discount_amount || 0),
          service_fee: parseFloat(payload.meta?.production_service?.fee || 0), // Explicitly store fee in meta
          source_version: "frontend_authority_v1",
        },
      };

      // === OPTIMISTIC UI: SAVE LOCAL & RETURN IMMEDIATELY ===
      try {
        // 1. GENERATE LOCAL ID
        const localOrderId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const localOrderNumber = `LOCAL-${Date.now()}`;
        const localCreatedAt = new Date().toISOString();

        // 2. BUILD PROPER OFFLINE INTENT (Authority-Preserving)
        const offlineIntent = {
          // ID & SYNC TRACKING
          id: localOrderId,
          ref_local_id: localOrderId, // Critical for Idempotency
          status: "PENDING_LOCAL", // Dexie Status
          sync_status: "PENDING", // Sync Service Status
          sync_attempts: 0,
          local_created_at: localCreatedAt,
          createdAt: localCreatedAt, // For UI sorting
          orderNumber: localOrderNumber,

          // DATA PAYLOAD
          customer: rawIntent.customer,
          items: rawItems, // Full items with specs & metadata
          payment: rawIntent.payment,
          meta: {
            ...rawIntent.meta,
            source_version: "optimistic_ui_v1",
          },
          idempotency_key: rawIntent.idempotency_key,

          // [FIX 5b] PERSIST DEADLINE (Offline Intent)
          target_date: rawIntent.target_date,

          // FINANCIALS (TRUSTED FRONTEND CALCULATION)
          total_amount: rawIntent.total_amount,
          discount_amount: rawIntent.discount_amount,
          tax_amount: rawIntent.tax_amount,
          paid_amount: rawIntent.payment.amount,
          remaining_amount: rawIntent.remaining_amount,
          payment_status: rawIntent.payment_status,
          is_tempo: rawIntent.is_tempo,
          production_status: rawIntent.production_status,
        };

        // 3. SAVE TO DEXIE (NON-BLOCKING AWAIT)
        console.log("💾 Optimistic Save:", localOrderNumber);
        await db.orders.add(offlineIntent);

        // 4. TRIGGER BACKGROUND SYNC (FIRE & FORGET)
        // We do NOT await this. Let it run in background.
        OrderSyncService.syncOfflineOrders().catch((err) =>
          console.error("⚠️ Background Sync Trigger Failed:", err),
        );

        // 5. UPDATE LOCAL STATE (UI LOOKS INSTANT)
        // Normalize for UI consumption
        const uiOrder = {
          ...offlineIntent,
          // Map DB fields to UI expected fields if necessary
          customerName: offlineIntent.customer.name,
          customerPhone: offlineIntent.customer.phone,
          items: rawItems,
          totalAmount: offlineIntent.total_amount,
          paidAmount: offlineIntent.paid_amount,
          remainingAmount: offlineIntent.remaining_amount,
          paymentStatus: offlineIntent.payment_status,
        };

        set((state) => ({
          orders: [uiOrder, ...state.orders],
          loading: false,
        }));

        console.log("✅ Optimistic Order Created:", uiOrder);
        return uiOrder;
      } catch (err) {
        console.error("❌ CRITICAL: Failed to save local order:", err);
        set({ loading: false });
        throw new Error("Gagal menyimpan order lokal: " + err.message);
      }
    } catch (err) {
      console.error("❌ Order creation failed:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ... (Pastikan import OrderSyncService dan loggers ada di paling atas file)
  // import { OrderSyncService } from "../services/OrderSyncService";
  // import { logOrderStatusChanged, logPaymentRecorded, logOrderCancelled } from "../utils/eventLogger";

  // === HELPER: OMNI-SEARCH (PENCARIAN CERDAS) ===
  // Mencari order di Dexie berdasarkan ID Lokal, UUID Server, atau Nomor Nota
  // === HELPER: OMNI-SEARCH & SELF-HEALING ===
  // Mencari order di Dexie. Jika tidak ada tapi ada di State (Cloud),
  // otomatis simpan ke Dexie (Hydration) agar bisa diedit offline.
  _resolveOrder: async (idOrString) => {
    if (!idOrString) return null;

    // 1. Cek Primary Key (ID Lokal)
    let order = await db.orders.get(idOrString);
    if (order) return order;

    // 2. Cek Server ID (Jika UI mengirim UUID dari Supabase)
    order = await db.orders.where("server_id").equals(idOrString).first();
    if (order) return order;

    // 3. Cek Order Number (Backup terakhir)
    order = await db.orders.where("orderNumber").equals(idOrString).first();
    if (order) return order;

    // 4. 🔥 SELF-HEALING: CLOUD TO LOCAL HYDRATION
    // Jika tidak ada di Dexie, tapi ada di State (baru load dari Supabase),
    // kita "High-Jacking" data state untuk disusupkan ke Dexie.
    const stateOrder = get().orders.find(
      (o) =>
        o.id === idOrString ||
        o.server_id === idOrString ||
        o.orderNumber === idOrString,
    );

    if (stateOrder) {
      console.log("🚑 Hydrating missing order to Dexie:", stateOrder.id);
      try {
        // Prepare object for Dexie (Refine structure if needed)
        // Kita gunakan ID asli dari state (bisa UUID atau Local ID)
        // Pastikan field server_id terisi jika ini UUID
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            stateOrder.id,
          );

        const hydratedOrder = {
          ...stateOrder,
          // Jika ID-nya UUID, jadikan server_id juga
          server_id: isUuid
            ? stateOrder.id
            : stateOrder.server_id || stateOrder.id,
          sync_status: "SYNCED", // Anggap synced karena asalnya dari cloud
          ref_local_id: stateOrder.id, // Fallback
          isTempo: stateOrder.is_tempo, // <--- CRITICAL: Fixes Rule Engine for Tempo
          is_tempo: stateOrder.is_tempo,
        };

        // Simpan ke Dexie
        await db.orders.put(hydratedOrder);
        return hydratedOrder;
      } catch (err) {
        console.warn("⚠️ Hydration failed:", err);
        return null; // Gagal hydrate, ya sudahlah
      }
    }

    return null;
  },

  // === 4. UPDATE PRODUCTION STATUS (FULL AUDIT & OFFLINE) ===
  updateProductionStatus: async (
    orderId,
    newStatus,
    operatorName = "System",
  ) => {
    set({ loading: true });
    try {
      // 1. GUNAKAN OMNI-SEARCH
      const localOrder = await get()._resolveOrder(orderId);

      if (!localOrder) {
        console.error(`❌ Order Not Found in Dexie. Input: ${orderId}`);
        throw new Error(
          "Data order lokal tidak ditemukan. Mohon refresh halaman.",
        );
      }

      // 2. SMART SYNC STATE
      // Jika PENDING (Baru & Offline) -> Tetap PENDING
      // Jika SYNCED (Sudah di Server) -> UPDATE_PENDING (Kirim Perubahan)
      const currentSyncStatus = localOrder.sync_status || "PENDING";
      const nextSyncStatus =
        currentSyncStatus === "PENDING" ? "PENDING" : "UPDATE_PENDING";

      const previousStatus = localOrder.productionStatus;

      // 3. PREPARE UPDATES
      const updates = {
        productionStatus: newStatus, // CamelCase (App)
        production_status: newStatus, // Snake_case (DB)
        status: newStatus === "DONE" ? "READY" : "IN_PROGRESS", // Helper status

        assignedTo: operatorName,
        assigned_to: operatorName,

        sync_status: nextSyncStatus,
        updatedAt: new Date().toISOString(),
      };

      // 4. UPDATE DEXIE
      await db.orders.update(localOrder.id, updates);

      // 5. UPDATE STATE (OPTIMISTIC UI - MULTI-MATCH FIX)
      set((state) => ({
        orders: state.orders.map((o) => {
          // Robust Match: Local ID OR Server ID
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);

          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      // 6. 🔥 JEJAK AUDIT (DIGITAL FOOTPRINT)
      // Mencatat siapa yang mengubah status, jam berapa, dari apa ke apa
      try {
        if (previousStatus !== newStatus) {
          // Pastikan Anda mengimpor fungsi ini di atas file
          // import { logOrderStatusChanged } from "../utils/eventLogger";
          await logOrderStatusChanged(
            localOrder.id,
            previousStatus,
            newStatus,
            operatorName,
          );
        }
      } catch (logErr) {
        console.warn("⚠️ Gagal mencatat log audit:", logErr);
      }

      // 7. TRIGGER SYNC (JALUR IMPORT FIX)
      // Menggunakan import yang sudah ada di atas, tidak perlu import() dinamis yang bikin crash path
      OrderSyncService.syncOfflineOrders();

      console.log(
        `✅ Status Updated: ${previousStatus} -> ${newStatus} (Sync: ${nextSyncStatus})`,
      );
      return true;
    } catch (err) {
      console.error("❌ Update Production Failed:", err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // === 5. ADD PAYMENT (FULL AUDIT & OFFLINE) ===
  addPayment: async (orderId, amount, receiver = "Kasir") => {
    set({ loading: true });
    try {
      const localOrder = await get()._resolveOrder(orderId);
      if (!localOrder)
        throw new Error("Order tidak ditemukan di database lokal.");

      const paymentAmount = Number(amount);
      const currentPaid = Number(localOrder.paidAmount || 0);
      const total = Number(
        localOrder.totalAmount || localOrder.grandTotal || 0,
      );

      const newPaid = currentPaid + paymentAmount;
      const newRemaining = total - newPaid;

      // Logic Status Pembayaran
      let newPaymentStatus = "PARTIAL";
      if (newRemaining <= 0) newPaymentStatus = "PAID";
      else if (newPaid <= 0) newPaymentStatus = "UNPAID";

      // Smart Sync Logic
      const nextSyncStatus =
        localOrder.sync_status === "PENDING" ? "PENDING" : "UPDATE_PENDING";

      const updates = {
        paidAmount: newPaid,
        paid_amount: newPaid,

        remainingAmount: newRemaining > 0 ? newRemaining : 0,
        remaining_amount: newRemaining > 0 ? newRemaining : 0,

        paymentStatus: newPaymentStatus,
        payment_status: newPaymentStatus,

        sync_status: nextSyncStatus,
        updatedAt: new Date().toISOString(),

        // Meta Pembayaran Terakhir
        payment_meta: {
          ...(localOrder.payment_meta || {}),
          last_payment_amount: paymentAmount,
          last_payment_by: receiver,
          last_payment_date: new Date().toISOString(),
        },
      };

      await db.orders.update(localOrder.id, updates);

      set((state) => ({
        orders: state.orders.map((o) => {
          // Robust Match
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);

          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      // 🔥 JEJAK AUDIT KEUANGAN
      try {
        // import { logPaymentRecorded } from "../utils/eventLogger";
        await logPaymentRecorded(
          null, // Payment ID (Not available yet)
          localOrder.id, // Order ID
          paymentAmount, // Amount
          "MANUAL", // Method (Simplified)
          receiver, // Received By
        );
      } catch (logErr) {
        console.warn("Audit Log Fail", logErr);
      }

      OrderSyncService.syncOfflineOrders();
      return true;
    } catch (err) {
      console.error("❌ Add Payment Failed:", err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // === 6. CANCEL ORDER (FULL AUDIT) ===
  cancelOrder: async (orderId, reason, financialAction, operator) => {
    set({ loading: true });
    try {
      const localOrder = await get()._resolveOrder(orderId);
      if (!localOrder) throw new Error("Order tidak ditemukan.");

      const nextSyncStatus =
        localOrder.sync_status === "PENDING" ? "PENDING" : "UPDATE_PENDING";

      const updates = {
        productionStatus: "CANCELLED",
        production_status: "CANCELLED",
        status: "CANCELLED",

        cancelReason: reason,
        cancel_reason: reason,

        financialAction: financialAction, // REFUND / FORFEIT
        financial_action: financialAction,

        cancelledAt: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
        cancelledBy: operator,

        sync_status: nextSyncStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.update(localOrder.id, updates);

      set((state) => ({
        orders: state.orders.map((o) => {
          // Robust Match
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);

          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      // 🔥 JEJAK AUDIT PEMBATALAN
      // Log manual karena cancel agak spesifik
      // logEvent("ORDER_CANCELLED", { ... }) bisa digunakan jika ada

      OrderSyncService.syncOfflineOrders();
      return true;
    } catch (err) {
      console.error("❌ Cancel Failed:", err);
      set({ loading: false });
      throw err;
    }
  },

  // ... (kode actions lainnya biarkan saja)

  // 🛡️ FITUR BARU: MANUAL REFRESH (HEMAT KUOTA)
  // Terpisah total dari logic createOrder (Fase 1-6 Aman)
  manualRefreshOrders: async () => {
    const { fetchOrders } = get(); // Ambil fungsi reload yang sudah ada
    set({ loading: true });

    console.log("🔄 MANUAL REFRESH: Operator meminta data terbaru...");

    try {
      // 1. PANGGIL KURIR (Service Sync)
      // Memaksa service untuk cek ke Supabase sekarang juga
      if (OrderSyncService && typeof OrderSyncService.sync === "function") {
        await OrderSyncService.sync();
      } else {
        console.warn(
          "⚠️ OrderSyncService.sync tidak ditemukan, memuat data lokal saja.",
        );
      }

      // 2. UPDATE TAMPILAN (Dexie -> Store)
      // Menarik data yang baru saja dibawa kurir ke layar
      if (fetchOrders) {
        await fetchOrders();
      }

      console.log("✅ MANUAL REFRESH: Data Produksi Terupdate.");
    } catch (error) {
      console.error("❌ MANUAL REFRESH: Gagal menarik data.", error);
    } finally {
      set({ loading: false });
    }
  },

  // ... (kode actions lainnya biarkan saja)

  // 🛡️ FITUR BARU: MANUAL REFRESH (HEMAT KUOTA)
  // Terpisah total dari logic createOrder (Fase 1-6 Aman)
  manualRefreshOrders: async () => {
    const { fetchOrders } = get(); // Ambil fungsi reload yang sudah ada
    set({ loading: true });

    console.log("🔄 MANUAL REFRESH: Operator meminta data terbaru...");

    try {
      // 1. PANGGIL KURIR (Service Sync)
      // Memaksa service untuk cek ke Supabase sekarang juga
      if (OrderSyncService && typeof OrderSyncService.sync === "function") {
        await OrderSyncService.sync();
      } else {
        console.warn(
          "⚠️ OrderSyncService.sync tidak ditemukan, memuat data lokal saja.",
        );
      }

      // 2. UPDATE TAMPILAN (Dexie -> Store)
      // Menarik data yang baru saja dibawa kurir ke layar
      if (fetchOrders) {
        await fetchOrders();
      }

      console.log("✅ MANUAL REFRESH: Data Produksi Terupdate.");
    } catch (error) {
      console.error("❌ MANUAL REFRESH: Gagal menarik data.", error);
    } finally {
      set({ loading: false });
    }
  },

  // 🛡️ FITUR BARU: MANUAL REFRESH (HEMAT KUOTA)
  manualRefreshOrders: async () => {
    const { loadOrders, currentFilter } = get(); // ✅ USE CORRECT ACTION NAME
    set({ loading: true });

    console.log("🔄 MANUAL REFRESH: Operator meminta data terbaru...");

    try {
      // 1. PUSH PENDING DATA (Jika ada order offline yang nyangkut)
      if (
        OrderSyncService &&
        typeof OrderSyncService.syncOfflineOrders === "function"
      ) {
        await OrderSyncService.syncOfflineOrders(); // ✅ CORRECT METHOD NAME
      }

      // 2. PULL LATEST DATA (Sesuai Filter Saat Ini)
      // Gunakan parameter yang sama dengan state terakhir agar user tidak bingung
      await loadOrders({
        page: 1, // Reset ke halaman 1 agar data paling baru terlihat
        paymentStatus: currentFilter || "ALL",
      });

      console.log("✅ MANUAL REFRESH: Data Produksi Terupdate.");
    } catch (error) {
      console.error("❌ MANUAL REFRESH: Gagal menarik data.", error);
    } finally {
      set({ loading: false });
    }
  },
}));
