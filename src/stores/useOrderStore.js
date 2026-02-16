/**
 * Order Store - Zustand (V5.5 - ENTERPRISE ARCHITECTURE)
 * State management for order/production tracking
 * Features:
 * - Strict Normalization (Phase 1-6 Data Integrity)
 * - Supabase Hybrid Sync & Offline First
 * - Auto Audit Logging (CCTV)
 * - INTELLIGENT DASHBOARD FEED
 * - FIX: Stale-While-Revalidate (Anti-Vanishing Orders)
 * - FIX: Silent Failover & Circuit Breaker (Anti-Red Screen)
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

    // [FIX 1] Cari Ukuran di 'original_specs' dulu
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

    // Marketing Gallery
    marketingEvidenceUrl:
      dbOrder.marketing_evidence_url || dbOrder.marketingEvidenceUrl || null,
    isPublicContent: Boolean(
      dbOrder.is_public_content || dbOrder.isPublicContent,
    ),
    isApprovedForSocial: Boolean(
      dbOrder.is_approved_for_social || dbOrder.isApprovedForSocial,
    ),
    isPostedToGmaps: Boolean(
      dbOrder.is_posted_to_gmaps || dbOrder.isPostedToGmaps,
    ),

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

  // 1. LOAD ORDERS (BLOCKCHAIN / STALE-WHILE-REVALIDATE STANDARD)
  loadOrders: async ({
    page = 1,
    limit = 20,
    paymentStatus = "ALL",
    productionStatus = "ALL",
  } = {}) => {
    // 🚨 STATE GUARANTEE: Nyalakan loading, jangan reset error dulu
    set({ loading: true });

    // 1. SETUP VARS DENGAN STALE DATA
    // AMBIL DATA YANG SAAT INI ADA DI LAYAR! (Ini kunci Stale-While-Revalidate menghindari layar kosong)
    let appOrders = get().orders || [];
    let serverCount = get().totalOrders || 0;
    let shouldUseServerData = false;

    try {
      // 2. CIRCUIT BREAKER & ONLINE CHECK
      if (navigator.onLine && supabase) {
        // Timeout Promise (15 Detik) - ZOMBIE PROTECTION
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout_Network")), 15000),
        );

        let query = supabase
          .from("orders")
          .select(`*, items_snapshot, items:order_items(*)`, {
            count: "exact",
          });

        if (paymentStatus !== "ALL")
          query = query.eq("payment_status", paymentStatus);
        if (productionStatus !== "ALL")
          query = query.eq("production_status", productionStatus);

        const safeLimit = Math.min(limit, 100);
        const offset = (page - 1) * safeLimit;

        const queryPromise = query
          .range(offset, offset + safeLimit - 1)
          .order("created_at", { ascending: false });

        // 3. EXECUTE WITH RACE (BALAPAN KONEKSI VS TIMEOUT)
        const { data, count, error } = await Promise.race([
          queryPromise,
          timeoutPromise,
        ]);

        if (error) throw error;

        // --- SUKSES: TIMPA STALE DATA DENGAN DATA BARU ---
        appOrders = data.map(internalNormalizeOrder);
        serverCount = count || 0;
        shouldUseServerData = true;

        // JIKA SERVER SUKSES, BERSIHKAN ERROR LAYAR
        set({ error: null });
      } else {
        throw new Error("Offline_NoInternet");
      }
    } catch (err) {
      // 🛡️ SILENT FAILOVER (CEGAT ERROR AGAR LAYAR TIDAK MERAH)
      if (
        err.message === "Timeout_Network" ||
        err.message === "Offline_NoInternet" ||
        err.message.includes("fetch")
      ) {
        console.warn(
          "🟡 [NETWORK] Beralih ke Data Lokal (Stale-While-Revalidate). Alasan:",
          err.message,
        );

        // Error disembunyikan agar UI tidak merender kotak merah yang mengganggu
        set({ error: null });
      } else {
        console.error("❌ [SYSTEM ERROR] Load Order Gagal:", err);
        set({ error: err.message }); // Ini hanya muncul jika ada bug kodingan
      }
    } finally {
      // 4. UNIVERSAL MERGE (KEMBALI KE ARSITEKTUR ASLI)
      try {
        const localPending = await db.orders
          .where("sync_status")
          .anyOf("PENDING", "UPDATE_PENDING")
          .reverse()
          .toArray();

        // JIKA ADA DATA LOKAL BELUM TERKIRIM ATAU KITA MEMILIKI DATA STALE (LAKUKAN MERGE)
        if (localPending.length > 0 || appOrders.length > 0) {
          console.log(
            `🧬 HYBRID HYDRATION: Merging ${localPending.length} local pending orders with ${appOrders.length} server/stale orders...`,
          );

          const orderMap = new Map();

          // A. Masukkan Server Data (atau Stale Data) dulu
          appOrders.forEach((o) => {
            const key = o.server_id || o.id;
            orderMap.set(key, o);
          });

          // B. Overlay dengan Local Data (Local Wins!)
          localPending.forEach((local) => {
            const normalizedLocal = internalNormalizeOrder(local);

            // Filter Check Lokal
            let matchesFilter = true;
            if (
              paymentStatus !== "ALL" &&
              normalizedLocal.paymentStatus !== paymentStatus
            )
              matchesFilter = false;
            if (
              productionStatus !== "ALL" &&
              normalizedLocal.productionStatus !== productionStatus
            )
              matchesFilter = false;

            if (matchesFilter) {
              if (
                normalizedLocal.server_id &&
                orderMap.has(normalizedLocal.server_id)
              ) {
                orderMap.set(normalizedLocal.server_id, normalizedLocal);
              } else {
                orderMap.set(normalizedLocal.id, normalizedLocal);
              }
            }
          });

          // C. Convert back to Array & Sort
          appOrders = Array.from(orderMap.values()).sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
        }

        // --- UPDATE LAYAR (DI LUAR IF, AGAR SELALU TEREKSEKUSI) ---
        const safeLimit = Math.min(limit, 100);

        // 🔥 SURGICAL FIX: Mencegah The "Ghost" Pagination Bug (Infinity Inflation)
        // Jika ONLINE  : count server murni + jumlah pending lokal saat ini.
        // Jika OFFLINE : gunakan stale count (karena angka ini SUDAH mengandung pesanan lokal sebelumnya).
        const calculatedTotalOrders = shouldUseServerData
          ? serverCount + localPending.length
          : serverCount;

        set({
          orders: appOrders,
          filteredOrders: appOrders,
          totalOrders: calculatedTotalOrders,
          totalPages: Math.ceil(calculatedTotalOrders / safeLimit),
          currentPage: page,
          pageSize: safeLimit,
          currentFilter: paymentStatus,
        });
      } catch (localError) {
        console.error("❌ Critical Local DB Error:", localError);
        // Fallback terakhir: jika dexie error, tetap tampilkan stale data agar layar tidak kosong
        set({ error: "Local DB Error: " + localError.message });
      }

      // 5. FINAL STATE RESET (Mencegah Loading Zombie)
      set({ loading: false });
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
          const paid = Number(o.paid_amount || 0);
          stats.totalCollected += paid; // Tambahkan ke Uang Masuk
          return; // Skip dari perhitungan Sales/Omzet
        }

        stats.totalCount++;

        // --- 1. Bedah Item (Bahan vs Jasa) ---
        let items = [];
        let calculatedItemsTotal = 0;

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

        // --- 💉 SURGICAL PATCH: Add Metadata Fee ---
        const metaFee = Number(o.meta?.production_service?.fee) || 0;
        stats.omsetJasa += metaFee;

        // --- 2. Hitung Keuangan ---
        let gross = Number(o.total_amount || 0);
        let net = Number(o.grand_total || o.total_amount || 0);
        const discount = Number(o.discount_amount || 0);
        const paid = Number(o.paid_amount || 0);

        if (net === 0 && calculatedItemsTotal > 0) {
          net = calculatedItemsTotal;
          if (gross === 0) gross = calculatedItemsTotal;
        }

        const remaining = net - paid;

        stats.totalSalesGross += gross;
        stats.totalSalesNet += net;
        stats.totalDiscount += discount;
        stats.totalCollected += paid;
        stats.totalOutstanding += remaining;

        // --- 3. Status Counter ---
        let payStatus = o.payment_status || "UNPAID";
        if (payStatus === "PARTIAL") payStatus = "DP";
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

  // 3. CREATE ORDER (V2 - ATOMIC RPC & DATA PURITY)
  createOrder: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { items, ...orderHeader } = payload;
      if (!orderHeader.customer_name)
        throw new Error("ORDER REJECTED: Nama customer wajib diisi");

      // === BUILD RAW_INTENT PAYLOAD ===
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

        // 4. SPECS FALLBACK
        let specs = item.specs;
        if (!specs || !specs.summary) {
          specs = { type: "LEGACY", summary: productName, inputs: {} };
        }

        const foundSpecs =
          item.dimensions ||
          item.metadata?.specs_json ||
          item.metadata?.original_specs ||
          null;
        const finalQty = Number(item.qty || item.quantity || 1);

        // 🔥 PHASE 1 FIX: UNIT PRODUCT (X-Banner)
        const isUnitType =
          item.input_mode === "UNIT" ||
          item.pricing_type === "UNIT" ||
          item.price_mode === "UNIT" ||
          (item.product_id && item.product_id.includes("display"));

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
          const finishingList =
            item.finishing_list || item.metadata?.finishing_list || [];
          const selectedFinishing = item.selected_finishing || {};
          const selectedVariant = item.selected_variant || {};

          let materialLabel = "";
          let variantLabel = "";
          let sizeLabel = "";

          if (finishingList.length > 0) {
            const firstFinishing = finishingList[0];
            materialLabel =
              firstFinishing.name ||
              firstFinishing.label ||
              firstFinishing.id ||
              "";
          }

          if (!materialLabel && selectedFinishing.material)
            materialLabel = selectedFinishing.material;
          if (!materialLabel && selectedFinishing.label)
            materialLabel = selectedFinishing.label;
          if (!materialLabel && selectedVariant.material)
            materialLabel = selectedVariant.material;
          if (!variantLabel && item.dimensions?.inputs?.variant)
            variantLabel = item.dimensions.inputs.variant;

          if (selectedVariant.size) {
            sizeLabel = selectedVariant.size;
          } else if (selectedFinishing.size) {
            sizeLabel = selectedFinishing.size;
          }

          const originalSummary = enrichedDimensions.summary || productName;
          let enrichedSummary = originalSummary;

          if (materialLabel || variantLabel) {
            const detailPart = materialLabel || variantLabel;
            enrichedSummary = `${originalSummary} | ${detailPart}${sizeLabel ? ` | ${sizeLabel}` : ""}`;
          }

          enrichedDimensions = {
            ...enrichedDimensions,
            ...(item.dimensions || {}),
            material:
              materialLabel || variantLabel || enrichedDimensions.material,
            variantLabel:
              variantLabel || materialLabel || enrichedDimensions.variantLabel,
            size: sizeLabel || enrichedDimensions.size,
            summary: enrichedSummary,
          };

          if (materialLabel || variantLabel)
            enrichedMaterialId =
              enrichedMaterialId || materialLabel || variantLabel;
          if (sizeLabel) enrichedSizeId = enrichedSizeId || sizeLabel;
        }

        // 🔥 PHASE 2 FIX: MATRIX PRODUCT (Poster)
        const isMatrixType =
          item.pricing_type === "MATRIX" ||
          item.pricingType === "MATRIX" ||
          item.dimensions?.type === "MATRIX" ||
          item.specs?.type === "MATRIX";
        if (isMatrixType) {
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
            if (
              finishingText &&
              !enrichedDimensions.summary?.includes(finishingText)
            ) {
              enrichedDimensions = {
                ...enrichedDimensions,
                summary: `${enrichedDimensions.summary || ""} | ${finishingText}`,
              };
            }
          }
        }

        // 🔥 PHASE 3 FIX: LINEAR PRODUCT (Textile/Rolls)
        const isLinearType =
          item.categoryId === "CAT_ROLLS" ||
          item.category_id === "CAT_ROLLS" ||
          item.pricing_type === "LINEAR" ||
          item.pricingType === "LINEAR" ||
          item.dimensions?.type === "LINEAR" ||
          item.specs?.type === "LINEAR";
        if (isLinearType) {
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
            if (
              finishingText &&
              !enrichedDimensions.summary?.includes(finishingText)
            ) {
              enrichedDimensions = {
                ...enrichedDimensions,
                summary: `${enrichedDimensions.summary || ""} | ${finishingText}`,
              };
            }
          }
          if (!enrichedMaterialId && enrichedDimensions.inputs?.material) {
            enrichedMaterialId = enrichedDimensions.inputs.material;
          }
        }

        // 🔥 PHASE 4: MERCH_APPAREL FIX (Jersey, Kaos)
        const isMerchApparel =
          item.categoryId === "MERCH_APPAREL" ||
          item.category_id === "MERCH_APPAREL" ||
          ["MERCH", "LANYARD", "JERSEY", "KAOS"].some((key) =>
            (item.product_id || "").toUpperCase().includes(key),
          );
        if (isMerchApparel) {
          const extras = [];
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];
          finishingList.forEach((f) => {
            const name = f.name || f.label || f.id;
            if (name) extras.push(name);
          });
          if (item.attributes && typeof item.attributes === "object") {
            Object.entries(item.attributes).forEach(([key, val]) => {
              if (
                val &&
                key !== "notes" &&
                typeof val === "string" &&
                val.trim()
              )
                extras.push(val);
            });
          }
          const extraText = extras.filter(Boolean).join(", ");
          if (extraText && !enrichedDimensions.summary?.includes(extraText)) {
            enrichedDimensions = {
              ...enrichedDimensions,
              summary: `${enrichedDimensions.summary || ""} | ${extraText}`,
            };
          }
          if (!enrichedMaterialId) {
            enrichedMaterialId =
              enrichedDimensions.inputs?.variant ||
              item.selected_variant?.name ||
              item.selected_variant?.label ||
              null;
          }
        }

        // 🔥 PHASE 5: STATIONERY FIX
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
        const isMaterialStationery =
          item.product_id &&
          stationeryMaterialKeywords.some((key) =>
            item.product_id.includes(key),
          );
        if (isMaterialStationery) {
          const mainSpec =
            enrichedDimensions.inputs?.variant ||
            enrichedDimensions.inputs?.material ||
            enrichedDimensions.variantLabel ||
            item.selected_variant?.name ||
            "";
          if (!enrichedMaterialId && mainSpec) enrichedMaterialId = mainSpec;
          const finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];
          const finishingNames = finishingList
            .map((f) => f.name || f.label || f.id)
            .filter(Boolean);
          const finishingText = finishingNames.join(", ");
          let newSummary = enrichedDimensions.summary || mainSpec;
          if (finishingText && !newSummary.includes(finishingText)) {
            newSummary = `${newSummary} | ${finishingText}`;
          }
          enrichedDimensions = { ...enrichedDimensions, summary: newSummary };
        }

        // 🔥 PHASE 6: DIGITAL A3 PRO FIX (Booklet, Stiker)
        const isBookletOrA3 =
          item.categoryId === "DIGITAL_A3_PRO" ||
          enrichedDimensions.type === "BOOKLET" ||
          item.product_id === "master_print_dokumen" ||
          item.product_id === "cetak_majalah_a4" ||
          item.product_id === "master_stiker_a3" ||
          item.product_id === "master_kartu_nama";
        if (isBookletOrA3) {
          const mainSpec =
            enrichedDimensions.inputs?.paper ||
            enrichedDimensions.inputs?.variant ||
            enrichedDimensions.variantLabel ||
            "";
          if (!enrichedMaterialId && mainSpec) enrichedMaterialId = mainSpec;
          let finishingList =
            item.finishings ||
            item.finishing_list ||
            item.metadata?.finishing_list ||
            [];
          const finishingNames = finishingList
            .map((f) => f.name || f.label || f.id)
            .filter(Boolean);
          const finishingText = finishingNames.join(", ");
          let newSummary = enrichedDimensions.summary || mainSpec;
          if (finishingText && !newSummary.includes(finishingText)) {
            newSummary = `${newSummary} | ${finishingText}`;
          }
          enrichedDimensions = { ...enrichedDimensions, summary: newSummary };
        }

        return {
          product_id: item.productId || item.product_id,
          product_name: productName,
          material_id: enrichedMaterialId,
          size_id: enrichedSizeId,
          quantity: finalQty,
          unit_price: finalUnitPrice,
          subtotal: finalUnitPrice * finalQty,
          dimensions: enrichedDimensions,
          specs: enrichedDimensions,
          note:
            item.note ||
            item.notes ||
            item.selected_details?.notes ||
            item.attributes?.notes ||
            item.specs?.notes ||
            "",
          meta: item.meta || {},
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
          notes:
            item.note ||
            item.notes ||
            item.selected_details?.notes ||
            item.attributes?.notes ||
            item.specs?.notes ||
            "",
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
        total_amount: parseFloat(payload.total_amount || 0),
        tax_amount: parseFloat(payload.tax_amount || 0),
        discount_amount: parseFloat(payload.discount_amount || 0),
        remaining_amount: parseFloat(payload.remaining_amount || 0),
        payment_status: payload.payment_status || "UNPAID",
        is_tempo: payload.is_tempo || false,
        production_status: payload.production_status || "PENDING",
        target_date: payload.target_date || payload.meta?.target_date || null,
        meta: {
          received_by: payload.received_by || "Kasir",
          production_priority:
            payload.meta?.production_service?.priority || "STANDARD",
          target_date: payload.target_date,
          discount_request: parseFloat(payload.discount_amount || 0),
          service_fee: parseFloat(payload.meta?.production_service?.fee || 0),
          source_version: "frontend_authority_v1",
        },
      };

      // === OPTIMISTIC UI: SAVE LOCAL & RETURN IMMEDIATELY ===
      try {
        const localOrderId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const localOrderNumber = `LOCAL-${Date.now()}`;
        const localCreatedAt = new Date().toISOString();

        const offlineIntent = {
          id: localOrderId,
          ref_local_id: localOrderId,
          status: "PENDING_LOCAL",
          sync_status: "PENDING",
          sync_attempts: 0,
          local_created_at: localCreatedAt,
          createdAt: localCreatedAt,
          orderNumber: localOrderNumber,
          customer: rawIntent.customer,
          items: rawItems,
          payment: rawIntent.payment,
          meta: { ...rawIntent.meta, source_version: "optimistic_ui_v1" },
          idempotency_key: rawIntent.idempotency_key,
          target_date: rawIntent.target_date,
          total_amount: rawIntent.total_amount,
          discount_amount: rawIntent.discount_amount,
          tax_amount: rawIntent.tax_amount,
          paid_amount: rawIntent.payment.amount,
          remaining_amount: rawIntent.remaining_amount,
          payment_status: rawIntent.payment_status,
          is_tempo: rawIntent.is_tempo,
          production_status: rawIntent.production_status,
        };

        await db.orders.add(offlineIntent);

        // TRIGGER BACKGROUND SYNC
        OrderSyncService.syncOfflineOrders().catch((err) =>
          console.error("⚠️ Background Sync Trigger Failed:", err),
        );

        const uiOrder = {
          ...offlineIntent,
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

        // 🔥 CCTV AUDIT CREATE ORDER
        try {
          const creatorName =
            payload.received_by || payload.meta?.createdBy || "System";
          await logPOSOrderCreated(localOrderId, localOrderNumber, creatorName);
        } catch (e) {}

        return uiOrder;
      } catch (err) {
        set({ loading: false });
        throw new Error("Gagal menyimpan order lokal: " + err.message);
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // === HELPER: OMNI-SEARCH & SELF-HEALING ===
  _resolveOrder: async (idOrString) => {
    if (!idOrString) return null;

    let order = await db.orders.get(idOrString);
    if (order) return order;

    order = await db.orders.where("server_id").equals(idOrString).first();
    if (order) return order;

    order = await db.orders.where("orderNumber").equals(idOrString).first();
    if (order) return order;

    const stateOrder = get().orders.find(
      (o) =>
        o.id === idOrString ||
        o.server_id === idOrString ||
        o.orderNumber === idOrString,
    );

    if (stateOrder) {
      try {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            stateOrder.id,
          );
        const hydratedOrder = {
          ...stateOrder,
          server_id: isUuid
            ? stateOrder.id
            : stateOrder.server_id || stateOrder.id,
          sync_status: "SYNCED",
          ref_local_id: stateOrder.id,
          isTempo: stateOrder.is_tempo,
          is_tempo: stateOrder.is_tempo,
        };
        await db.orders.put(hydratedOrder);
        return hydratedOrder;
      } catch (err) {
        return null;
      }
    }
    return null;
  },

  // 4. UPDATE PRODUCTION STATUS (FULL AUDIT & OFFLINE)
  updateProductionStatus: async (
    orderId,
    newStatus,
    operatorName = "System",
    options = {},
  ) => {
    set({ loading: true });
    try {
      const localOrder = await get()._resolveOrder(orderId);
      if (!localOrder) {
        throw new Error(
          "Data order lokal tidak ditemukan. Mohon refresh halaman.",
        );
      }

      const currentSyncStatus = localOrder.sync_status || "PENDING";
      const nextSyncStatus =
        currentSyncStatus === "PENDING" ? "PENDING" : "UPDATE_PENDING";
      const previousStatus = localOrder.productionStatus;

      const updates = {
        productionStatus: newStatus,
        production_status: newStatus,
        status: newStatus === "DONE" ? "READY" : "IN_PROGRESS",
        assignedTo: operatorName,
        assigned_to: operatorName,
        marketing_evidence_url: options.marketing_evidence_url || null,
        is_public_content: options.is_public_content || false,
        sync_status: nextSyncStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.update(localOrder.id, updates);

      set((state) => ({
        orders: state.orders.map((o) => {
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);
          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      try {
        if (previousStatus !== newStatus) {
          await logOrderStatusChanged(
            localOrder.id,
            previousStatus,
            newStatus,
            operatorName,
          );
        }
      } catch (logErr) {}

      OrderSyncService.syncOfflineOrders();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // 5. ADD PAYMENT (FULL AUDIT & OFFLINE)
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

      let newPaymentStatus = "PARTIAL";
      if (newRemaining <= 0) newPaymentStatus = "PAID";
      else if (newPaid <= 0) newPaymentStatus = "UNPAID";

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
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);
          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      try {
        await logPaymentRecorded(
          null,
          localOrder.id,
          paymentAmount,
          "MANUAL",
          receiver,
        );
      } catch (logErr) {}

      OrderSyncService.syncOfflineOrders();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // 6. CANCEL ORDER (FULL AUDIT)
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
        financialAction: financialAction,
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
          const isMatch =
            o.id === localOrder.id ||
            (o.server_id && o.server_id === localOrder.server_id) ||
            (o.orderNumber && o.orderNumber === localOrder.orderNumber);
          return isMatch ? { ...o, ...updates } : o;
        }),
        loading: false,
      }));

      // 🔥 JEJAK AUDIT PEMBATALAN (WIRED)
      try {
        await logOrderStatusChanged(
          localOrder.id,
          localOrder.productionStatus,
          "CANCELLED",
          operator || "System",
        );
      } catch (logErr) {
        console.warn("Audit Log Gagal:", logErr);
      }

      OrderSyncService.syncOfflineOrders();
      return true;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // 🛡️ FITUR BARU: MANUAL REFRESH (HEMAT KUOTA)
  manualRefreshOrders: async () => {
    const { loadOrders, currentFilter } = get();
    set({ loading: true });

    try {
      if (
        OrderSyncService &&
        typeof OrderSyncService.syncOfflineOrders === "function"
      ) {
        await OrderSyncService.syncOfflineOrders();
      }

      await loadOrders({
        page: 1,
        paymentStatus: currentFilter || "ALL",
      });
    } catch (error) {
      console.error("❌ MANUAL REFRESH: Gagal menarik data.", error);
    } finally {
      set({ loading: false });
    }
  },

  // 12. APPROVE MARKETING CONTENT
  approveMarketingContent: async (orderId, isApproved) => {
    try {
      const updates = {
        is_approved_for_social: isApproved,
        sync_status: "UPDATE_PENDING",
        updatedAt: new Date().toISOString(),
      };

      const updatedCount = await db.orders.update(orderId, updates);

      if (updatedCount === 0) {
        const currentOrder = get().orders.find((o) => o.id === orderId);
        if (currentOrder) {
          const orderToSave = {
            ...currentOrder,
            ...updates,
            is_approved_for_social: isApproved,
            id: orderId,
            server_id: currentOrder.server_id || orderId,
          };
          await db.orders.put(orderToSave);
        } else {
          return false;
        }
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, isApprovedForSocial: isApproved } : o,
        ),
      }));

      try {
        await OrderSyncService.syncOfflineOrders();
      } catch (syncErr) {}

      return true;
    } catch (err) {
      return false;
    }
  },

  // 13. REJECT MARKETING CONTENT
  rejectMarketingContent: async (orderId) => {
    try {
      const updates = {
        is_public_content: false,
        is_approved_for_social: false,
        sync_status: "UPDATE_PENDING",
        updatedAt: new Date().toISOString(),
      };

      const updatedCount = await db.orders.update(orderId, updates);

      if (updatedCount === 0) {
        const currentOrder = get().orders.find((o) => o.id === orderId);
        if (currentOrder) {
          const orderToSave = {
            ...currentOrder,
            ...updates,
            id: orderId,
            server_id: currentOrder.server_id || orderId,
          };
          await db.orders.put(orderToSave);
        }
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, isPublicContent: false, isApprovedForSocial: false }
            : o,
        ),
      }));

      try {
        await OrderSyncService.syncOfflineOrders();
      } catch (syncErr) {}

      return true;
    } catch (err) {
      return false;
    }
  },
}));
