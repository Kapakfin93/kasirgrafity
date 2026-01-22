/**
 * Order Store - Zustand
 * State management for order/production tracking
 * FINAL STABLE VERSION - JOGLO POS
 */

import { create } from "zustand";
import db from "../data/db/schema";
import { Order } from "../data/models/Order";
import { updateSupabaseOrder } from "./supabaseUploadHelper";

// === 1. FINAL NORMALIZER (PENYELARAS TOTAL) ===
const normalizeOrder = (dbOrder) => {
  if (!dbOrder) return null;

  // A. PARSE SNAPSHOT (DATA BELANJAAN)
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
  // Fallback ke relasi item jika snapshot kosong
  if ((!rawItems || rawItems.length === 0) && dbOrder.items) {
    rawItems = dbOrder.items;
  }

  // B. DESCRIPTION BUILDER (PENCANTIK NOTA)
  const buildDescription = (item) => {
    const meta = item.meta || item.metadata || {};
    const parts = [];

    // 1. Dimensi (Misal: "3x1m")
    const dims =
      meta.custom_dimensions ||
      meta.dimensions ||
      (meta.specs_json ? meta.specs_json : null);
    if (dims && (dims.length || dims.width || dims.h || dims.w)) {
      const l = dims.length || dims.h || 0;
      const w = dims.width || dims.w || 0;
      if (l > 0 && w > 0) parts.push(`${l}x${w}m`);
    }

    // 2. Bahan / Varian
    const variant =
      meta.variantLabel ||
      meta.variant_label ||
      (meta.specs_json ? meta.specs_json.variantLabel : null);
    if (variant) parts.push(variant);

    // 3. Finishing
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
    customerName:
      dbOrder.customer_name && dbOrder.customer_name.trim() !== ""
        ? dbOrder.customer_name
        : "PELANGGAN UMUM",
    customerPhone: dbOrder.customer_phone || "-",

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

    // Items Mapping
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

  // 1. LOAD ORDERS (SUPABASE HYBRID)
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

        if (paymentStatus !== "ALL") {
          query = query.eq("payment_status", paymentStatus);
        }

        if (productionStatus !== "ALL") {
          query = query.eq("production_status", productionStatus);
        }

        const { data, count, error } = await query
          .range(offset, offset + safeLimit - 1)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const appOrders = data.map(normalizeOrder);

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

  // === GANTI loadSummary DENGAN VERSI SENSOR BILINGUAL ===

  loadSummary: async (dateRange = null) => {
    const { supabase } = await import("../services/supabaseClient");

    try {
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

        // A. Bedah Item
        let items = [];
        let calculatedItemsTotal = 0;
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
          // FIX 1: BACA HARGA (Cek format camelCase DAN snake_case)
          const itemTotal = Number(
            item.totalPrice || item.total_price || item.subtotal || 0,
          );
          calculatedItemsTotal += itemTotal;

          // FIX 2: BACA NAMA (Sensor Bilingual)
          // Kita cek product_name (DB) dan productName (App)
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

          // Logika Deteksi
          if (serviceKeywords.some((keyword) => name.includes(keyword))) {
            stats.omsetJasa += itemTotal;
          } else {
            stats.omsetBahan += itemTotal;
          }
        });

        // B. Financial Basics
        let gross = Number(o.total_amount || 0);
        let net = Number(o.grand_total || o.final_amount || 0);
        const discount = Number(o.discount || 0);
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

        const payStatus = o.payment_status || "UNPAID";
        if (stats.countByPayment[payStatus] !== undefined)
          stats.countByPayment[payStatus]++;

        const prodStatus = o.production_status || "PENDING";
        if (stats.countByProduction[prodStatus] !== undefined)
          stats.countByProduction[prodStatus]++;
      });

      const summaryResult = {
        totalCount: stats.totalCount,
        totalSales: stats.totalSalesNet,
        totalGross: stats.totalSalesGross,
        totalDiscount: stats.totalDiscount,
        totalCollected: stats.totalCollected,
        totalOutstanding: stats.totalOutstanding,
        omsetBahan: stats.omsetBahan,
        omsetJasa: stats.omsetJasa,
        countByPaymentStatus: stats.countByPayment,
        countByProductionStatus: stats.countByProduction,
        totalLostRevenue: 0,
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

      const { data: fullOrder } = await supabase
        .from("orders")
        .select(`*, items_snapshot, items:order_items(*)`)
        .eq("id", orderData.id)
        .single();

      const normalizedOrder = normalizeOrder(fullOrder);
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

  // 4. UPDATE ORDER (SAFE VERSION)
  updateOrder: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { supabase } = await import("../services/supabaseClient");
      const dbUpdates = {};

      // Mapping Field UI -> DB
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
      get().loadOrders({ page: 1, limit: 50 }); // Fallback
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // ACTION BUTTONS HANDLERS (Pelunasan, Status, Cancel)
  // FASE 3.3: RPC-based payment recording
  payOrder: async (
    orderId,
    amount,
    receivedBy = "Kasir",
    paymentMethod = "CASH",
  ) => {
    set({ loading: true, error: null });
    try {
      // Client-side validation
      if (!amount || amount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }

      if (!receivedBy || receivedBy.trim() === "") {
        throw new Error("Received by (user name) is required");
      }

      const { supabase } = await import("../services/supabaseClient");

      // Call RPC function for atomic payment recording
      const { data, error: rpcError } = await supabase.rpc(
        "add_payment_to_order",
        {
          p_order_id: orderId,
          p_amount: amount,
          p_user_name: receivedBy,
          p_payment_method: paymentMethod,
        },
      );

      if (rpcError) {
        console.error("❌ Payment RPC Error:", rpcError);
        throw new Error(`Payment failed: ${rpcError.message}`);
      }

      if (!data || !data.success) {
        throw new Error("Payment recording failed");
      }

      console.log("✅ Payment recorded:", data);

      // Refresh the order to get updated state
      const { data: updatedOrder, error: fetchError } = await supabase
        .from("orders")
        .select(`*, items_snapshot, items:order_items(*)`)
        .eq("id", orderId)
        .single();

      if (!fetchError && updatedOrder) {
        const normalizedOrder = normalizeOrder(updatedOrder);
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

  // Backward compatibility: Keep addPayment alias
  addPayment: async (orderId, amount, receivedBy = null) => {
    return get().payOrder(orderId, amount, receivedBy || "Kasir", "CASH");
  },

  updateProductionStatus: async (orderId, status, assignedTo = null) => {
    const updates = { productionStatus: status };
    if (status === "IN_PROGRESS" && assignedTo) {
      updates.assignedTo = assignedTo;
    }
    if (status === "READY") {
      updates.completedAt = new Date().toISOString();
    }
    if (status === "DELIVERED") {
      updates.deliveredAt = new Date().toISOString();
    }
    await get().updateOrder(orderId, updates);
  },

  cancelOrder: async (orderId, reason, financialAction = "NONE") => {
    await get().updateOrder(orderId, {
      productionStatus: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      financialAction,
    });
  },

  // Dummy pagination placeholders (untuk kompatibilitas)
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

  // === PAYMENT CONSISTENCY VALIDATION ===
  // READ-ONLY: Detects discrepancies between orders and order_payments
  getPaymentValidationReport: async (options = {}) => {
    try {
      const { getPaymentDiscrepancyReport } =
        await import("../core/paymentValidator");
      const report = await getPaymentDiscrepancyReport(options);
      return report;
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

  // Get only problematic orders (convenience method)
  getProblematicPayments: async () => {
    const report = await get().getPaymentValidationReport({
      onlyMismatches: true,
    });
    return report.results || [];
  },

  clearError: () => set({ error: null }),
}));
