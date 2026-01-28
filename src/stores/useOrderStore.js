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

// === 1. FINAL NORMALIZER ===
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

  // B. DESCRIPTION BUILDER
  const buildDescription = (item) => {
    const meta = item.meta || item.metadata || {};
    const parts = [];
    const dims =
      meta.custom_dimensions ||
      meta.dimensions ||
      (meta.specs_json ? meta.specs_json : null);
    if (dims && (dims.length || dims.width || dims.h || dims.w)) {
      const l = dims.length || dims.h || 0;
      const w = dims.width || dims.w || 0;
      if (l > 0 && w > 0) parts.push(`${l}x${w}m`);
    }
    const variant =
      meta.variantLabel ||
      meta.variant_label ||
      (meta.specs_json ? meta.specs_json.variantLabel : null);
    if (variant) parts.push(variant);
    const finish =
      meta.finishing ||
      (meta.specs_json ? meta.specs_json.finishing_list : null);
    if (Array.isArray(finish) && finish.length > 0) {
      parts.push(`Fin: ${finish.join(", ")}`);
    } else if (typeof finish === "string" && finish) {
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

    // Status
    productionStatus:
      dbOrder.production_status || dbOrder.productionStatus || "PENDING",
    paymentStatus: dbOrder.payment_status || dbOrder.paymentStatus || "UNPAID",
    paymentMethod: dbOrder.payment_method || dbOrder.paymentMethod || "TUNAI",
    isTempo: Boolean(dbOrder.is_tempo || dbOrder.isTempo),
    createdAt: dbOrder.created_at || dbOrder.createdAt,

    cancelReason: dbOrder.cancel_reason || dbOrder.cancelReason,
    cancelledAt: dbOrder.cancelled_at || dbOrder.cancelledAt,

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
      notes: item.notes || "",
      description: buildDescription(item),
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
          "id, total_amount, grand_total, discount, paid_amount, remaining_amount, payment_status, production_status, items_snapshot, created_at",
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
          return;
        }

        stats.totalCount++;

        // --- 1. Bedah Item (Bahan vs Jasa) ---
        let items = [];
        let calculatedItemsTotal = 0; // Temp total dari item

        if (o.items_snapshot) {
          if (typeof o.items_snapshot === "string") {
            try {
              items = JSON.parse(o.items_snapshot);
            } catch (e) {}
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

        // --- 2. Hitung Keuangan (INI YANG TADI HILANG!) ---
        let gross = Number(o.total_amount || 0);
        let net = Number(o.grand_total || o.total_amount || 0); // Fallback ke total_amount jika grand_total null
        const discount = Number(o.discount || 0);
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
        const payStatus = o.payment_status || "UNPAID";
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

  // 3. CREATE ORDER
  createOrder: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { items, ...orderHeader } = payload;
      if (!orderHeader.customer_name)
        throw new Error("ORDER REJECTED: Nama customer wajib diisi");

      const { supabase } = await import("../services/supabaseClient");
      const orderPayload = { ...orderHeader, items_snapshot: items };

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();
      if (orderError) throw orderError;

      if (items && items.length > 0) {
        const itemsWithOrderId = items.map((item) => ({
          ...item,
          order_id: orderData.id,
        }));
        await supabase.from("order_items").insert(itemsWithOrderId);
      }

      logPOSOrderCreated(
        orderData.id,
        orderData.order_number,
        orderData.received_by || "Kasir",
      );

      const { data: fullOrder } = await supabase
        .from("orders")
        .select(`*, items_snapshot, items:order_items(*)`)
        .eq("id", orderData.id)
        .single();
      const normalizedOrder = internalNormalizeOrder(fullOrder);

      // --- 💉 SURGICAL INJECTION: RECORD INITIAL PAYMENT ---
      // Cek apakah ada pembayaran awal (DP/Lunas) saat order dibuat
      if (orderData && parseFloat(payload.paid_amount || 0) > 0) {
        const paymentData = {
          order_id: orderData.id,
          amount: parseFloat(payload.paid_amount),
          payment_method: payload.payment_method || "TUNAI",
          // payment_date dihapus karena tidak ada di tabel
          created_at: new Date().toISOString(),
          // 🔥 TAMBAHAN WAJIB: Masukkan nama penerima uang
          received_by: payload.received_by || "Kasir",
        };

        // Silent Insert (Fire & Forget) agar tidak memblokir UI jika gagal
        const { error: payError } = await supabase
          .from("order_payments")
          .insert([paymentData]);

        if (payError) {
          console.error(
            "⚠️ Order created but Initial Payment recording failed:",
            payError,
          );
          // Jangan throw error, biarkan order tetap sukses
        } else {
          console.log(
            `✅ Initial payment recorded: Rp ${paymentData.amount} (${paymentData.payment_method})`,
          );
        }
      }
      // --- END INJECTION ---

      set((state) => ({
        orders: [normalizedOrder, ...state.orders],
        loading: false,
      }));
      return normalizedOrder;
    } catch (err) {
      console.error("❌ Order creation failed:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // 4. UPDATE ORDER
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

  cancelOrder: async (orderId, reason, financialAction = "NONE") => {
    await get().updateOrder(orderId, {
      productionStatus: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      financialAction,
    });

    logEvent(
      "order_cancelled",
      "ORDER_BOARD",
      orderId,
      "orders",
      { reason: reason, financial_action: financialAction },
      "Operator",
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
  clearError: () => set({ error: null }),
}));
