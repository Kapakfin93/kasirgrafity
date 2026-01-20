/**
 * Order Store - Zustand
 * State management for order/production tracking
 */

import { create } from "zustand";
import db from "../data/db/schema";
import { Order } from "../data/models/Order";
import { updateSupabaseOrder } from "./supabaseUploadHelper"; // Import Helper

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
  // Merangkai detail teknis (Panjang x Lebar, Bahan) jadi kalimat siap cetak
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

    return parts.join(" | "); // Gabung jadi satu baris
  };

  // C. EXPLICIT MAPPING (JEMBATAN HULU-HILIR)
  return {
    // Identity
    id: dbOrder.id,
    orderNumber: dbOrder.order_number || dbOrder.orderNumber || "-",

    // FIX 1: AUTO-FILL DEFAULT NAME
    customerName:
      dbOrder.customer_name && dbOrder.customer_name.trim() !== ""
        ? dbOrder.customer_name
        : "PELANGGAN UMUM",

    customerPhone: dbOrder.customer_phone || "-",

    // FIX 2: FORCE NUMBER FORMAT (Agar Dashboard tidak Rp 0)
    totalAmount: Number(dbOrder.total_amount || dbOrder.totalAmount || 0),
    paidAmount: Number(dbOrder.paid_amount || dbOrder.paidAmount || 0),
    remainingAmount: Number(
      dbOrder.remaining_amount || dbOrder.remainingAmount || 0,
    ),
    discountAmount: Number(
      dbOrder.discount_amount || dbOrder.discountAmount || 0,
    ),

    // FIX 3: STRICT STATUS MAPPING (Agar Order Board Muncul)
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

      // FIX 4: DESCRIPTION TERISI
      description: buildDescription(item),

      meta: item.meta || item.metadata || {},
    })),
  };
};

export const useOrderStore = create((set, get) => ({
  // State
  orders: [],
  filteredOrders: [],
  currentFilter: "ALL", // ALL | UNPAID | DP | PAID
  loading: false,
  error: null,

  // === PAGINATION STATE (NEW) ===
  currentPage: 1,
  pageSize: 20,
  totalOrders: 0,
  totalPages: 0,
  searchQuery: "",

  // === SUMMARY DATA (Separate from paginated data) ===
  summaryData: {
    totalCount: 0,
    totalSales: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    countByPaymentStatus: { PAID: 0, DP: 0, UNPAID: 0 },
    countByProductionStatus: {
      PENDING: 0,
      IN_PROGRESS: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    },
  },

  // Actions
  // Actions

  /**
   * HYBRID LOAD ORDERS (Scalable Rule #1)
   * Supports Pagination & Dual Source (Dexie/Supabase)
   */
  loadOrders: async ({ page = 1, limit = 20, status = "ALL" } = {}) => {
    set({ loading: true, error: null });
    try {
      const safeLimit = Math.min(limit, 100);
      const offset = (page - 1) * safeLimit;
      const { supabase } = await import("../services/supabaseClient");

      // 1. FETCH FROM SUPABASE
      if (navigator.onLine && supabase) {
        let query = supabase.from("orders").select(
          `
            *,
            items_snapshot,
            items:order_items(*)
          `,
          { count: "exact" },
        ); // FIX #1: Explicitly request items_snapshot

        if (status !== "ALL") {
          // Map UI status "UNPAID" to DB column 'payment_status'
          query = query.eq("payment_status", status);
        }

        const { data, count, error } = await query
          .range(offset, offset + safeLimit - 1)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // FIX #3: DEBUG LOGGING
        console.log("📥 RAW DATA FROM SUPABASE:", data[0]);
        console.log("📦 items_snapshot present?", !!data[0]?.items_snapshot);
        console.log("📊 items_snapshot type:", typeof data[0]?.items_snapshot);
        console.log("📋 items_snapshot content:", data[0]?.items_snapshot);

        // 2. NORMALIZE DATA (THE GLOBAL FIX)
        const appOrders = data.map(normalizeOrder);
        console.log("✅ NORMALIZED ORDER:", appOrders[0]);

        set({
          orders: appOrders,
          filteredOrders: appOrders,
          totalOrders: count,
          totalPages: Math.ceil(count / safeLimit),
          currentPage: page,
          pageSize: safeLimit,
          loading: false,
        });
      } else {
        // Fallback to local DB (Logic remains same, assuming local DB is already CamelCase)
        const { orders } = get();
        // Basic fetch from local if offline - simplified for now as per user instruction to prioritize loadOrders fix
        // ... (Keep existing Dexie logic if needed, but usually redundant if simple fetch)
        // === FALLBACK / OFFLINE MODE: FETCH FROM DEXIE ===
        // If offline or if Supabase fetch failed/skipped
        let orderObjects = [];
        let totalCount = 0;
        if (orders.length === 0) {
          // Only fetch if empty to avoid overwrite loop? No, this fn sets orders.
          console.log("⚠️ Fetching from Local DB (Offline/Fallback)");
          let collection = db.orders.orderBy("createdAt").reverse();

          if (status !== "ALL") {
            collection = db.orders
              .where("paymentStatus")
              .equals(status)
              .reverse();
          }

          totalCount = await collection.count();
          const data = await collection
            .offset(offset)
            .limit(safeLimit)
            .toArray();
          orderObjects = data.map((o) => Order.fromDB(o));

          set({
            orders: orderObjects,
            filteredOrders: orderObjects,
            totalOrders: totalCount,
            totalPages: Math.ceil(totalCount / safeLimit),
            currentPage: page,
            pageSize: safeLimit,
            loading: false,
          });
        }
      }
    } catch (error) {
      console.error(error);
      set({ error: error.message, loading: false });
    }
  },

  // === PAGINATION: Load orders with offset/limit ===
  loadOrdersPaginated: async (page = 1, pageSize = 20, filter = "ALL") => {
    set({ loading: true, error: null, currentPage: page, pageSize });
    try {
      // Get total count first
      // let query = db.orders.orderBy("createdAt").reverse(); // Unused variable removed

      // Apply filter if not ALL
      if (filter !== "ALL") {
        const allOrders = await db.orders
          .where("paymentStatus")
          .equals(filter)
          .toArray();
        const sorted = allOrders.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        const total = sorted.length;
        const totalPages = Math.ceil(total / pageSize);
        const skip = (page - 1) * pageSize;
        const paged = sorted.slice(skip, skip + pageSize);
        const orderObjects = paged.map((o) => Order.fromDB(o));

        set({
          orders: orderObjects,
          filteredOrders: orderObjects,
          totalOrders: total,
          totalPages,
          currentPage: page,
          currentFilter: filter,
          loading: false,
        });
        return;
      }

      // No filter - use direct DB pagination
      const total = await db.orders.count();
      const totalPages = Math.ceil(total / pageSize);
      const skip = (page - 1) * pageSize;

      const orders = await db.orders
        .orderBy("createdAt")
        .reverse()
        .offset(skip)
        .limit(pageSize)
        .toArray();

      const orderObjects = orders.map((o) => Order.fromDB(o));

      set({
        orders: orderObjects,
        filteredOrders: orderObjects,
        totalOrders: total,
        totalPages,
        currentPage: page,
        currentFilter: filter,
        loading: false,
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // === SUMMARY: Lightweight query for dashboard stats ===
  loadSummary: async (dateRange = null) => {
    try {
      let ordersToSum = await db.orders.toArray();

      // Apply date filter if provided
      if (dateRange?.start && dateRange.end) {
        ordersToSum = ordersToSum.filter((o) => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
      }

      // Exclude cancelled from main stats
      const activeOrders = ordersToSum.filter(
        (o) => o.productionStatus !== "CANCELLED",
      );
      const cancelledOrders = ordersToSum.filter(
        (o) => o.productionStatus === "CANCELLED",
      );

      const summary = {
        totalCount: activeOrders.length,
        // Calculate from items if available, fallback to totalAmount
        totalSales: activeOrders.reduce((sum, o) => {
          if (o.items && o.items.length > 0) {
            return (
              sum +
              o.items.reduce(
                (itemSum, item) => itemSum + (item.totalPrice || 0),
                0,
              )
            );
          }
          return sum + (o.totalAmount || 0);
        }, 0),
        totalCollected: activeOrders.reduce(
          (sum, o) => sum + (o.paidAmount || 0),
          0,
        ),
        totalOutstanding: activeOrders.reduce(
          (sum, o) => sum + (o.remainingAmount || 0),
          0,
        ),
        countByPaymentStatus: {
          PAID: activeOrders.filter((o) => o.paymentStatus === "PAID").length,
          DP: activeOrders.filter((o) => o.paymentStatus === "DP").length,
          UNPAID: activeOrders.filter((o) => o.paymentStatus === "UNPAID")
            .length,
        },
        countByProductionStatus: {
          PENDING: activeOrders.filter((o) => o.productionStatus === "PENDING")
            .length,
          IN_PROGRESS: activeOrders.filter(
            (o) => o.productionStatus === "IN_PROGRESS",
          ).length,
          READY: activeOrders.filter((o) => o.productionStatus === "READY")
            .length,
          DELIVERED: activeOrders.filter(
            (o) => o.productionStatus === "DELIVERED",
          ).length,
          CANCELLED: cancelledOrders.length,
        },
        totalLostRevenue: cancelledOrders.reduce(
          (sum, o) => sum + (o.totalAmount || 0),
          0,
        ),
      };

      set({ summaryData: summary });
      return summary;
    } catch (error) {
      console.error("❌ Failed to load summary:", error);
    }
  },

  // === SEARCH: Direct DB query for search ===
  searchOrders: async (query) => {
    if (!query || query.trim() === "") {
      // Clear search, reload paginated
      set({ searchQuery: "" });
      return get().loadOrdersPaginated(1, get().pageSize, get().currentFilter);
    }

    set({ loading: true, searchQuery: query.trim() });
    try {
      const lowerQuery = query.toLowerCase();

      // Use Collection.filter for flexible search
      const results = await db.orders
        .filter(
          (order) =>
            order.customerName?.toLowerCase().includes(lowerQuery) ||
            order.orderNumber?.toLowerCase().includes(lowerQuery) ||
            order.customerSnapshot?.name?.toLowerCase().includes(lowerQuery),
        )
        .limit(50)
        .toArray();

      // Sort by createdAt desc
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const orderObjects = results.map((o) => Order.fromDB(o));

      set({
        orders: orderObjects,
        filteredOrders: orderObjects,
        totalOrders: results.length,
        totalPages: 1, // Search shows all results in one page
        currentPage: 1,
        loading: false,
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // === NAVIGATION ===
  goToPage: async (page) => {
    const { pageSize, currentFilter } = get();
    await get().loadOrdersPaginated(page, pageSize, currentFilter);
  },

  nextPage: async () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      await get().goToPage(currentPage + 1);
    }
  },

  prevPage: async () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      await get().goToPage(currentPage - 1);
    }
  },

  // === FILTER WITH PAGINATION ===
  setFilterAndReload: async (status) => {
    set({ currentFilter: status, currentPage: 1 });
    await get().loadOrdersPaginated(1, get().pageSize, status);
  },

  /**
   * Generate Order Number with MACHINE_ID for multi-computer safety
   * Format: JGL-{MACHINE_ID}-{YYYYMMDD}-{SEQUENCE}
   * Example: JGL-A-20260109-0001
   */
  _generateOrderNumber: async () => {
    const { MACHINE_ID } = await import("../core/constants");

    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replaceAll("-", ""); // "20260109"

    // Get last order for this machine and date

    // Get last order for this machine and date
    const allOrders = await db.orders.toArray();
    const todayOrders = allOrders.filter((order) => {
      if (!order.orderNumber) return false;

      // Extract date from order number: JGL-A-20260109-0001 -> "20260109"
      const parts = order.orderNumber.split("-");
      if (parts.length !== 4) return false;

      const orderMachineId = parts[1];
      const orderDate = parts[2];

      // Only count orders from same machine and same date
      return orderMachineId === MACHINE_ID && orderDate === datePrefix;
    });

    // Find max sequence for today on this machine
    let maxSequence = 0;
    todayOrders.forEach((order) => {
      const parts = order.orderNumber.split("-");
      const sequence = Number.parseInt(parts[3], 10);
      if (sequence > maxSequence) {
        maxSequence = sequence;
      }
    });

    const nextSequence = maxSequence + 1;
    const paddedSequence = nextSequence.toString().padStart(4, "0");

    return `JGL-${MACHINE_ID}-${datePrefix}-${paddedSequence}`;
  },

  createOrder: async (payload) => {
    set({ isLoading: true, error: null });

    try {
      console.log("📦 OrderStore received payload:", payload);

      const { items, ...orderHeader } = payload;

      // 1. VALIDATION
      if (!orderHeader.customer_name)
        throw new Error("ORDER REJECTED: Nama customer wajib diisi");

      const { supabase } = await import("../services/supabaseClient");

      // 2. PREPARE PAYLOAD WITH SNAPSHOT (THE FUNDAMENTAL FIX)
      // We inject the items array directly into the header as a JSON snapshot.
      // This ensures the Order Board has data even without joining tables.
      const orderPayload = {
        ...orderHeader,
        items_snapshot: items, // <--- MENGISI KEKOSONGAN (NULL)
      };

      // 3. INSERT HEADER (WRITE)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload]) // Use the payload with snapshot
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. INSERT ITEMS (WRITE - RELATIONAL)
      // We still keep this for analytics/reporting
      if (items && items.length > 0) {
        const itemsWithOrderId = items.map((item) => ({
          ...item,
          order_id: orderData.id,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;
      }

      console.log(
        "✅ Transaction Saved. Snapshot Secured. Fetching fresh row...",
      );

      // 5. EFFICIENT SYNC
      const { data: fullOrder, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          *,
          items_snapshot,
          items:order_items(*)
        `,
        ) // FIX #2: Explicitly request items_snapshot
        .eq("id", orderData.id)
        .single();

      if (fetchError) throw fetchError;

      // FIX #3: DEBUG LOGGING FOR NEW ORDER
      console.log("📥 CREATED ORDER RAW:", fullOrder);
      console.log(
        "📦 items_snapshot in new order?",
        !!fullOrder?.items_snapshot,
      );

      // 6. NORMALIZE & UPDATE
      const normalizedOrder = normalizeOrder(fullOrder);
      console.log("✅ NORMALIZED NEW ORDER:", normalizedOrder);

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

  // === GANTI FUNGSI updateOrder YANG LAMA DENGAN INI ===

  updateOrder: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { supabase } = await import("../services/supabaseClient"); // Pastikan import ini ada atau gunakan db lokal jika perlu

      // 1. UPDATE KE DATABASE (SUPABASE)
      // Kita update langsung ke server
      // Perlu convert camelCase keys (UI) ke snake_case (DB) jika updates berisi field camelCase
      // Tapi biasanya updates disini simple seperti { productionStatus: 'READY' }

      // Helper map simpel untuk field umum yang sering diupdate
      const dbUpdates = {};
      if (updates.productionStatus)
        dbUpdates.production_status = updates.productionStatus;
      if (updates.paymentStatus)
        dbUpdates.payment_status = updates.paymentStatus;
      if (updates.paidAmount !== undefined)
        dbUpdates.paid_amount = updates.paidAmount;
      if (updates.remainingAmount !== undefined)
        dbUpdates.remaining_amount = updates.remainingAmount;
      if (updates.dpAmount !== undefined)
        dbUpdates.dp_amount = updates.dpAmount;
      if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;
      if (updates.deliveredAt) dbUpdates.delivered_at = updates.deliveredAt;
      if (updates.cancelReason) dbUpdates.cancel_reason = updates.cancelReason;
      if (updates.cancelledAt) dbUpdates.cancelled_at = updates.cancelledAt;
      if (updates.financialAction)
        dbUpdates.financial_action = updates.financialAction;
      if (updates.receivedBy) dbUpdates.received_by = updates.receivedBy;
      if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;

      // Jika ada field lain yang tidak dimap, masukkan juga (fallback)
      Object.keys(updates).forEach((key) => {
        // Jika key belum ada di dbUpdates dan bukan camelCase yang sudah dihandle
        if (
          ![
            "productionStatus",
            "paymentStatus",
            "paidAmount",
            "remainingAmount",
            "dpAmount",
            "completedAt",
            "deliveredAt",
            "cancelReason",
            "cancelledAt",
            "financialAction",
            "receivedBy",
            "assignedTo",
          ].includes(key)
        ) {
          // Asumsi key sudah snake_case atau sama
          dbUpdates[key] = updates[key];
        }
      });

      // EKSEKUSI UPDATE KE DB
      if (navigator.onLine && Object.keys(dbUpdates).length > 0) {
        await supabase.from("orders").update(dbUpdates).eq("id", id);
      }

      // Update Local DB (Dexie) jika perlu
      // await db.orders.update(id, updates);

      // 2. UPDATE STATE (UI)
      // Di sini kita tidak perlu .toJSON() lagi karena state kita sudah Plain Object
      set((state) => {
        const updatedOrders = state.orders.map((order) => {
          if (order.id === id) {
            // GABUNGKAN DATA LAMA (PLAIN) DENGAN UPDATE BARU
            // Kita update local state langsung agar UI responsif
            return { ...order, ...updates };
          }
          return order;
        });

        return {
          orders: updatedOrders,
          filteredOrders: get().applyFilter(updatedOrders),
          loading: false,
        };
      });
    } catch (error) {
      console.error("Update Error:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addPayment: async (orderId, amount, receivedBy = null) => {
    set({ loading: true, error: null });
    try {
      const order = get().orders.find((o) => o.id === orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const newPaidAmount = order.paidAmount + amount;
      const updates = {
        paidAmount: newPaidAmount,
        dpAmount:
          order.dpAmount || (newPaidAmount < order.totalAmount ? amount : 0),
      };

      // Update receiver if provided
      if (receivedBy) {
        updates.receivedBy = receivedBy;
      }

      // Update payment status
      if (newPaidAmount >= order.totalAmount) {
        updates.paymentStatus = "PAID";
        updates.remainingAmount = 0;
      } else if (newPaidAmount > 0) {
        updates.paymentStatus = "DP";
        updates.remainingAmount = order.totalAmount - newPaidAmount;
      }

      await get().updateOrder(orderId, updates);
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
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

  /**
   * Cancel Order dengan alasan wajib + audit keuangan
   * @param {string} orderId - ID order yang akan dibatalkan
   * @param {string} reason - Alasan pembatalan (WAJIB)
   * @param {string} financialAction - Nasib uang: 'REFUND' | 'FORFEIT' | 'NONE'
   */
  cancelOrder: async (orderId, reason, financialAction = "NONE") => {
    if (!reason || reason.trim() === "") {
      throw new Error("Alasan pembatalan wajib diisi!");
    }

    set({ loading: true, error: null });

    try {
      const updates = {
        productionStatus: "CANCELLED",
        cancelReason: reason.trim(),
        cancelledAt: new Date().toISOString(),
        // [SOP V2.0] AUDIT KEUANGAN - Nasib uang DP saat batal
        financialAction: financialAction,
      };

      await db.orders.update(orderId, updates);

      set((state) => {
        const updatedOrders = state.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                productionStatus: "CANCELLED",
                cancelReason: reason.trim(),
                cancelledAt: new Date().toISOString(),
                financialAction: financialAction,
              }
            : order,
        );
        return {
          orders: updatedOrders,
          filteredOrders: get().applyFilter(updatedOrders),
          loading: false,
        };
      });

      console.log(
        "✅ Order cancelled:",
        orderId,
        "Reason:",
        reason,
        "Financial:",
        financialAction,
      );
    } catch (error) {
      console.error("❌ Cancel order failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  filterByPaymentStatus: (status) => {
    set({ currentFilter: status });
    const filtered = get().applyFilter(get().orders);
    set({ filteredOrders: filtered });
  },

  applyFilter: (orders) => {
    const filter = get().currentFilter;
    if (filter === "ALL") return orders;
    return orders.filter((order) => order.paymentStatus === filter);
  },

  getOrdersByStatus: (status) => {
    return get().orders.filter((order) => order.productionStatus === status);
  },

  getOrdersByPaymentStatus: (status) => {
    return get().orders.filter((order) => order.paymentStatus === status);
  },

  getPendingOrders: () => {
    return get().orders.filter(
      (order) =>
        order.productionStatus !== "DELIVERED" &&
        order.paymentStatus !== "PAID",
    );
  },

  getOrderById: (id) => {
    return get().orders.find((order) => order.id === id);
  },

  clearError: () => {
    set({ error: null });
  },
}));
