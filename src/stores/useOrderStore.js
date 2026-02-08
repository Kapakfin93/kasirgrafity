/**
 * Order Store - Zustand (V5.3 - LOGIC RESTORED & VERIFIED)
 * State management for order/production tracking
 * Features:
 * - Strict Normalization
 * - Supabase Hybrid Sync
 * - Auto Audit Logging (CCTV)
 * - INTELLIGENT DASHBOARD FEED (Via ownerDecisionEngine)
 * - FIX: Restored Missing Calculation Logic for Monthly View
 */

import { create } from "zustand";
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
      dimensions: item.dimensions || {},
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
      const { supabase } = await import("../services/supabaseClient");

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
    const { supabase } = await import("../services/supabaseClient");
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
    // === SPECS STANDARDIZER (KONTRAK FINAL) ===
    const buildSpecsFromProduct = (item) => {
      // 🔍 DEBUG: Log item structure to see what fields exist
      console.log("🏗️ buildSpecsFromProduct INPUT:", {
        has_pricingType: !!item.pricingType,
        pricingType_value: item.pricingType,
        has_pricing_model: !!item.pricing_model,
        pricing_model_value: item.pricing_model,
        has_inputMode: !!item.inputMode,
        inputMode_value: item.inputMode,
        has_dimensions: !!item.dimensions,
        dimensions_keys: item.dimensions ? Object.keys(item.dimensions) : null,
        item_keys: Object.keys(item).slice(0, 15), // First 15 keys
      });

      const pricingType =
        item.pricingType ||
        item.pricing_model ||
        item.product?.pricing_model ||
        item.inputMode ||
        "MANUAL";

      console.log("🏗️ DETECTED pricingType:", pricingType);

      let specs = {
        type: pricingType,
        inputs: {},
        summary: "",
      };

      // === AREA (Spanduk, Outdoor, MMT) ===
      if (pricingType === "AREA") {
        const dims = item.dimensions || {};
        const length = parseFloat(dims.length || 0);
        const width = parseFloat(dims.width || 0);
        const area = parseFloat(dims.area || length * width || 0);
        const material = dims.variantLabel || dims.material || "Standard";
        const finishingNames = (
          item.finishings ||
          item.metadata?.finishing_list ||
          []
        )
          .map((f) => f.name || f.id)
          .filter(Boolean);

        specs.inputs = {
          length,
          width,
          area,
          material,
          finishing: finishingNames,
        };

        specs.summary = `${length}m x ${width}m • ${material}`;
        if (finishingNames.length > 0) {
          specs.summary += ` • Fin: ${finishingNames.join(", ")}`;
        }
      }

      // === LINEAR (Roll, Stiker Meteran) ===
      else if (pricingType === "LINEAR" || pricingType === "LINEAR_METER") {
        const dims = item.dimensions || {};
        const length = parseFloat(dims.length || 0);
        const width = parseFloat(dims.width || 1);
        const material = dims.variantLabel || dims.material || "Standard";

        specs.inputs = {
          length,
          width,
          material,
        };

        specs.summary = `${length}m • ${material}`;
      }

      // === MATRIX (Poster A0/A1, Plakat) ===
      else if (pricingType === "MATRIX") {
        const size =
          item.dimensions?.sizeKey || item.selected_details?.size || "Custom";
        const material =
          item.dimensions?.material ||
          item.selected_details?.variant ||
          "Standard";

        specs.inputs = {
          size,
          material,
        };

        specs.summary = `${size} • ${material}`;
      }

      // === TIERED (Qty-based pricing) ===
      else if (pricingType === "TIERED") {
        const variant =
          item.dimensions?.variantLabel || item.variantLabel || "Standard";

        specs.inputs = {
          variant,
          tier: item.pricingSnapshot?.tier || "standard",
        };

        specs.summary = `${variant}`;
      }

      // === UNIT / MANUAL / MIXED (Jasa, Merch, Dokumen) ===
      else {
        const variant =
          item.dimensions?.variantLabel ||
          item.variantLabel ||
          item.selected_details?.variant ||
          "Standard";

        specs.inputs = {
          variant,
        };

        specs.summary = variant !== "Standard" ? variant : "";
      }

      // SAFETY NET: Fallback to description or product name
      if (!specs.summary || specs.summary.trim() === "") {
        specs.summary =
          item.description ||
          item.productName ||
          item.product_name ||
          item.name ||
          "Item";
      }

      return specs;
    };
    set({ isLoading: true, error: null });
    try {
      const { items, ...orderHeader } = payload;
      if (!orderHeader.customer_name)
        throw new Error("ORDER REJECTED: Nama customer wajib diisi");

      const { supabase } = await import("../services/supabaseClient");
      const { v4: uuid } = await import("uuid");

      // === BUILD RAW_INTENT PAYLOAD (FIXED: USE CART SPECS DIRECTLY) ===
      const rawItems = items.map((item) => {
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

        // 🔥 FIX: MERGE METADATA INTO SPECS/DIMENSIONS TO SURVIVE DB RPC
        // The RPC only saves 'specs' -> 'dimensions'. It DROPS 'metadata'.
        // So we must embed all critical info into 'specs'.
        const richSpecs = {
          ...specs,
          // Inject Metadata Helpers
          variant_info: specs.summary,
          finishing_list: sourceFinishings,
          original_specs: foundSpecs,
          note: item.notes || "", // Use 'note' key for Smart Merge compatibility
          notes: item.notes || "",
        };

        return {
          product_id: item.productId || item.product_id,
          product_name: productName,

          material_id:
            item.dimensions?.materialId ||
            item.dimensions?.variantId ||
            item.selected_details?.material_id ||
            null,
          size_id:
            item.dimensions?.sizeKey ||
            item.dimensions?.selectedVariant?.label ||
            item.selected_details?.size_id ||
            null,
          quantity: finalQty,

          unit_price: finalUnitPrice,
          // 🔥 FIX: FORCE RECALCULATE SUBTOTAL (Trust Math, Not Input)
          subtotal: finalUnitPrice * finalQty,

          // 🔥 SPECS MAPPING (Legacy Table Support)
          dimensions: richSpecs, // Map richSpecs -> dimensions column
          specs: richSpecs, // Keep specs key for RPC

          // LEGACY METADATA (keep for backward compatibility - local only)
          metadata: {
            is_manual_price: true,
            original_specs: foundSpecs,
            variant_info: specs.summary,
            finishing_ids: sourceFinishings.map((f) => f.id || f.name),
            finishing_total: finishingTotal,
            finishing_list: sourceFinishings,
            price_source: "frontend_calculator",
            notes: item.notes || "",
            calc_debug: `qty(${finalQty}) * unit(${finalUnitPrice}) = ${finalUnitPrice * finalQty}`,
          },

          notes: item.notes || "",
        };
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

      // === ONLINE PATH: Single RPC Call ===
      try {
        // 🏗️ DEBUG: Log specs untuk setiap item (NOW AT ITEM LEVEL)
        console.log(
          "🏗️ CHECKOUT PAYLOAD SPECS:",
          rawItems.map((item) => ({
            product: item.product_name,
            specs_type: item.specs.type,
            specs_summary: item.specs.summary,
            specs_inputs: item.specs.inputs,
            has_metadata_specs: !!item.metadata?.specs, // Should be undefined now
          })),
        );

        // 🔍 DEBUG: Log payload sebelum kirim ke RPC
        console.log(
          "🔍 PAYLOAD SENT TO RPC:",
          JSON.stringify(rawIntent, null, 2),
        );

        // 🔥 GUARD: Validate Payment Payload
        if (!rawIntent.payment || rawIntent.payment.amount === undefined) {
          throw new Error("INVALID_PAYMENT_PAYLOAD: Payment object missing");
        }

        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "create_pos_order_notary",
          { p_payload: rawIntent },
        );

        if (rpcError) throw rpcError;
        if (!rpcResult.success) {
          throw new Error(rpcResult.error || rpcResult.message || "RPC Failed");
        }

        // Log result
        if (rpcResult.is_duplicate) {
          console.log(
            "♻️ Idempotent: Returning existing order",
            rpcResult.order_id,
          );
        } else {
          logPOSOrderCreated(
            rpcResult.order_id,
            rpcResult.order_number,
            payload.received_by || "Kasir",
          );
        }

        // Fetch full order for UI normalization
        const { data: fullOrder } = await supabase
          .from("orders")
          .select(`*, items_snapshot, items:order_items(*)`)
          .eq("id", rpcResult.order_id)
          .single();

        const normalizedOrder = internalNormalizeOrder(fullOrder);

        set((state) => ({
          orders: [normalizedOrder, ...state.orders],
          loading: false,
        }));

        return normalizedOrder;
      } catch (supabaseError) {
        // === OFFLINE PATH: Save RAW INTENT Only (No Price Calculations) ===
        console.warn(
          "⚠️ RPC failed. Saving RAW INTENT to local Dexie:",
          supabaseError,
        );

        const db = (await import("../data/db/schema")).default;
        const localOrderId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Build offline RAW INTENT (Authority-Preserving)
        const offlineIntent = {
          id: localOrderId,
          orderNumber: `LOCAL-${Date.now()}`,
          customer: rawIntent.customer,
          items: rawItems,
          payment: rawIntent.payment,
          meta: {
            ...rawIntent.meta,
            source_version: "offline_fallback",
          },
          idempotency_key: rawIntent.idempotency_key,
          status: "PENDING_LOCAL",
          local_created_at: new Date().toISOString(),
          sync_error: supabaseError.message,
        };

        await db.orders.put(offlineIntent);

        console.log(
          "💾 RAW INTENT saved to local Dexie (no price calculations):",
          localOrderId,
        );

        // Return minimal order object for UI
        set({ loading: false });
        return {
          id: localOrderId,
          orderNumber: offlineIntent.orderNumber,
          customerName: offlineIntent.customer.name,
          customerPhone: offlineIntent.customer.phone,
          items: items,
          totalAmount: 0,
          paidAmount: offlineIntent.payment.amount,
          remainingAmount: 0,
          paymentStatus: "PENDING_LOCAL",
          productionStatus: "PENDING",
          createdAt: offlineIntent.local_created_at,
        };
      }
    } catch (err) {
      console.error("❌ Order creation failed:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // 4. REALTIME SUBSCRIPTION (LIVE UPDATE) 📡
  subscribeToOrders: async () => {
    const { supabase } = await import("../services/supabaseClient");
    if (!supabase) return;

    // Prevent duplicate subscription
    if (get().realtimeSubscription) return;

    console.log("📡 Subscribing to Realtime Orders...");

    const subscription = supabase
      .channel("public:orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          console.log("🔔 New Order Received:", payload.new);
          const newOrder = internalNormalizeOrder(payload.new);

          set((state) => ({
            orders: [newOrder, ...state.orders],
            // Update filtered if it matches current filter (simplified: just add it)
            filteredOrders: [newOrder, ...state.filteredOrders],
            totalOrders: state.totalOrders + 1,
          }));

          // Refresh Summary to update badges
          get().loadSummary();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          console.log("🔔 Order Updated:", payload.new);
          // Partial update to avoid full re-normalization overhead if possible,
          // but safer to normalize to ensure consistency
          const updatedOrder = internalNormalizeOrder(payload.new);

          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === updatedOrder.id ? updatedOrder : o,
            ),
            filteredOrders: state.filteredOrders.map((o) =>
              o.id === updatedOrder.id ? updatedOrder : o,
            ),
          }));

          // Refresh Summary to update badges/totals
          get().loadSummary();
        },
      )
      .subscribe();

    set({ realtimeSubscription: subscription });
  },

  unsubscribeFromOrders: () => {
    const sub = get().realtimeSubscription;
    if (sub) {
      console.log("🔕 Unsubscribing from Realtime Orders...");
      sub.unsubscribe();
      set({ realtimeSubscription: null });
    }
  },

  // 5. UPDATE ORDER
  updateOrder: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { supabase } = await import("../services/supabaseClient");
      const dbUpdates = {};
      const fieldMap = {
        productionStatus: "production_status",
        paymentStatus: "payment_status",
        paidAmount: "paid_amount",
        remainingAmount: "remaining_amount",
        dpAmount: "dp_amount",
        completedAt: "completed_at",
        deliveredAt: "delivered_at",
        cancelReason: "cancel_reason",
        cancelledAt: "cancelled_at",
        financialAction: "financial_action",
        receivedBy: "received_by",
        assignedTo: "assigned_to",
      };

      Object.keys(updates).forEach((key) => {
        if (fieldMap[key]) dbUpdates[fieldMap[key]] = updates[key];
        else dbUpdates[key] = updates[key];
      });

      if (navigator.onLine && Object.keys(dbUpdates).length > 0) {
        await supabase.from("orders").update(dbUpdates).eq("id", id);
      }

      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id ? { ...order, ...updates } : order,
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Update Error:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 5. HELPER ACTIONS
  searchOrders: async (query) => {
    if (!query || query.trim() === "") {
      set({ searchQuery: "" });
      return get().loadOrders({ page: 1, limit: 20 });
    }
    set({ loading: true, searchQuery: query.trim() });
    try {
      get().loadOrders({ page: 1, limit: 50 });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // === ACTION BUTTONS ===

  payOrder: async (
    orderId,
    amount,
    receivedBy = "Kasir",
    paymentMethod = "CASH",
  ) => {
    set({ loading: true, error: null });
    try {
      if (!amount || amount <= 0)
        throw new Error("Payment amount must be greater than 0");
      if (!receivedBy || receivedBy.trim() === "")
        throw new Error("Received by is required");

      const { supabase } = await import("../services/supabaseClient");

      const { data, error: rpcError } = await supabase.rpc(
        "add_payment_to_order",
        {
          p_order_id: orderId,
          p_amount: amount,
          p_user_name: receivedBy,
          p_payment_method: paymentMethod,
        },
      );

      if (rpcError) throw new Error(`Payment failed: ${rpcError.message}`);
      if (!data || !data.success) throw new Error("Payment recording failed");

      logPaymentRecorded(
        data.payment_id || "rpc_pay",
        orderId,
        amount,
        paymentMethod,
        receivedBy,
      );

      const { data: updatedOrder, error: fetchError } = await supabase
        .from("orders")
        .select(`*, items_snapshot, items:order_items(*)`)
        .eq("id", orderId)
        .single();

      if (!fetchError && updatedOrder) {
        const normalizedOrder = internalNormalizeOrder(updatedOrder);
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? normalizedOrder : o,
          ),
          loading: false,
        }));
      } else {
        set({ loading: false });
      }
      return data;
    } catch (error) {
      console.error("❌ Payment failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addPayment: async (orderId, amount, receivedBy = null) => {
    return get().payOrder(orderId, amount, receivedBy || "Kasir", "CASH");
  },

  updateProductionStatus: async (orderId, status, assignedTo = null) => {
    const oldOrder = get().orders.find((o) => o.id === orderId);
    const oldStatus = oldOrder ? oldOrder.productionStatus : "UNKNOWN";

    const updates = { productionStatus: status };
    if (status === "IN_PROGRESS" && assignedTo) updates.assignedTo = assignedTo;
    if (status === "READY") updates.completedAt = new Date().toISOString();
    if (status === "DELIVERED") updates.deliveredAt = new Date().toISOString();

    await get().updateOrder(orderId, updates);

    logOrderStatusChanged(orderId, oldStatus, status, assignedTo || "Operator");
  },

  cancelOrder: async (
    orderId,
    reason,
    financialAction = "NONE",
    actorName = "Operator",
  ) => {
    // 1. Fetch existing meta first to preserve data
    const oldOrder = get().orders.find((o) => o.id === orderId);
    const oldMeta = oldOrder?.meta || {};

    await get().updateOrder(orderId, {
      productionStatus: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      // ✅ FIX: Force snake_case key to match Supabase column exact name
      financial_action: financialAction,
      // 🔥 SECURITY FIX: RECORD ACTOR
      meta: {
        ...oldMeta,
        cancelled_by: actorName,
        cancel_reason_log: reason,
        cancelled_at_log: new Date().toISOString(),
      },
    });

    logEvent(
      "order_cancelled",
      "ORDER_BOARD",
      orderId,
      "orders",
      {
        reason: reason,
        financial_action: financialAction,
        cancelled_by: actorName,
      },
      actorName,
    );
  },

  // Helpers
  loadOrdersPaginated: async (page, pageSize, filter) =>
    get().loadOrders({ page, limit: pageSize, paymentStatus: filter }),
  goToPage: async (page) =>
    get().loadOrders({
      page,
      limit: get().pageSize,
      paymentStatus: get().currentFilter,
    }),
  nextPage: async () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) get().goToPage(currentPage + 1);
  },
  prevPage: async () => {
    const { currentPage } = get();
    if (currentPage > 1) get().goToPage(currentPage - 1);
  },
  setFilterAndReload: async (status) => {
    set({ currentFilter: status, currentPage: 1 });
    get().loadOrders({ page: 1, limit: 20, paymentStatus: status });
  },
  applyFilter: (orders) => orders,

  // PAYMENT VALIDATION
  getPaymentValidationReport: async (options = {}) => {
    try {
      const { getPaymentDiscrepancyReport } =
        await import("../core/paymentValidator");
      return await getPaymentDiscrepancyReport(options);
    } catch (error) {
      console.error("❌ Payment validation failed:", error);
      return {
        success: false,
        error: error.message,
        summary: null,
        results: [],
      };
    }
  },
  getProblematicPayments: async () => {
    const report = await get().getPaymentValidationReport({
      onlyMismatches: true,
    });
    return report.results || [];
  },
  // ============================================
  // STATE 3: OFFLINE → PENDING → SYNC
  // ============================================
  syncPendingLocalOrders: async () => {
    const MAX_RETRIES = 3;

    // A. Check online status
    if (!navigator.onLine) {
      console.log("📴 Offline - skipping sync");
      return { synced: 0, failed: 0, skipped: 0, message: "Offline" };
    }

    try {
      const db = (await import("../data/db/schema")).default;
      const { supabase } = await import("../services/supabaseClient");

      // B. Fetch pending orders from Dexie
      const pendingOrders = await db.orders
        .where("status")
        .equals("PENDING_LOCAL")
        .toArray();

      if (pendingOrders.length === 0) {
        console.log("✅ No pending local orders to sync");
        return { synced: 0, failed: 0, skipped: 0, message: "No pending" };
      }

      console.log(`🔄 Syncing ${pendingOrders.length} pending local orders...`);

      let synced = 0;
      let failed = 0;
      let skipped = 0;

      // C. Loop each pending order
      for (const localOrder of pendingOrders) {
        try {
          // D. Build RAW_INTENT from stored data (REUSE idempotency_key)
          const rawIntent = {
            idempotency_key: localOrder.idempotency_key,
            customer: localOrder.customer,
            items: localOrder.items,
            payment: localOrder.payment || localOrder.payment_attempt,
            meta: {
              ...localOrder.meta,
              source_version: "sync_recovery",
            },
          };

          // E. Validate idempotency_key exists
          if (!rawIntent.idempotency_key) {
            console.warn(
              `⚠️ Order ${localOrder.id} missing idempotency_key - skipping`,
            );
            skipped++;
            continue;
          }

          // F. Call RPC
          // F. Call RPC for Sync
          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            "create_pos_order_notary",
            { p_payload: rawIntent },
          );

          if (rpcError) throw rpcError;

          // G. Handle RPC response
          if (rpcResult.success) {
            // G1. SUCCESS or DUPLICATE - both are valid sync
            if (rpcResult.is_duplicate) {
              console.log(
                `♻️ Order ${localOrder.id} already exists on server (idempotent)`,
              );
            } else {
              console.log(
                `✅ Order ${localOrder.id} synced → ${rpcResult.order_number}`,
              );
            }

            // G2. Update Dexie order status to SYNCED
            await db.orders.update(localOrder.id, {
              status: "SYNCED",
              server_order_id: rpcResult.order_id,
              server_order_number: rpcResult.order_number,
              synced_at: new Date().toISOString(),
            });

            synced++;
          } else {
            // G3. RPC returned success: false (validation error)
            throw new Error(
              rpcResult.error || rpcResult.message || "RPC validation failed",
            );
          }
        } catch (syncError) {
          // H. Handle sync failure
          const attempts = (localOrder.sync_attempts || 0) + 1;
          const newStatus =
            attempts >= MAX_RETRIES ? "SYNC_FAILED" : "PENDING_LOCAL";

          await db.orders.update(localOrder.id, {
            sync_attempts: attempts,
            last_sync_error: syncError.message,
            last_sync_at: new Date().toISOString(),
            status: newStatus,
          });

          if (newStatus === "SYNC_FAILED") {
            console.error(
              `❌ Order ${localOrder.id} failed permanently after ${attempts} attempts`,
            );
          } else {
            console.warn(
              `⚠️ Order ${localOrder.id} sync failed (attempt ${attempts}/${MAX_RETRIES})`,
            );
          }

          failed++;
        }
      }

      const result = { synced, failed, skipped, message: "Sync complete" };
      console.log(
        `🔄 Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped`,
      );
      return result;
    } catch (error) {
      console.error("❌ Sync orchestration failed:", error);
      return { synced: 0, failed: 0, skipped: 0, error: error.message };
    }
  },

  clearError: () => set({ error: null }),
}));
