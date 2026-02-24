import { create } from "zustand";

const MAX_AGE_MS = 60 * 60 * 1000; // 1 jam

export const useSyncFeedbackStore = create((set, get) => ({
  failedOrders: [],
  lastSuccess: null,

  addFailedOrder: (orderInfo) => {
    // Guard: jangan tambah jika offline (expected behavior)
    if (!navigator.onLine) return;

    const now = Date.now();

    // Cleanup entry lama > 1 jam
    const cleaned = get().failedOrders.filter(
      (o) => now - o.timestamp < MAX_AGE_MS,
    );

    // Hindari duplikat order yang sama
    const exists = cleaned.find((o) => o.id === orderInfo.id);
    if (exists) return;

    set({
      failedOrders: [
        ...cleaned,
        {
          id: orderInfo.id,
          orderNumber: orderInfo.orderNumber || orderInfo.server_order_number,
          customerName: orderInfo.customerName || "Pelanggan",
          totalAmount: orderInfo.totalAmount || orderInfo.paidAmount || 0,
          error: orderInfo.error,
          timestamp: now,
        },
      ],
    });
  },

  markSuccess: (orderId) => {
    const order = get().failedOrders.find((o) => o.id === orderId);
    set({
      failedOrders: get().failedOrders.filter((o) => o.id !== orderId),
      lastSuccess: order
        ? { ...order, timestamp: Date.now() }
        : get().lastSuccess,
    });
    // Auto-clear lastSuccess setelah 3 detik
    setTimeout(() => {
      set({ lastSuccess: null });
    }, 3000);
  },

  dismissOrder: (orderId) => {
    set({
      failedOrders: get().failedOrders.filter((o) => o.id !== orderId),
    });
  },

  clearAll: () => set({ failedOrders: [], lastSuccess: null }),
}));
