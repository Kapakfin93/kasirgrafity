/**
 * Order Store - Zustand
 * State management for order/production tracking
 */

import { create } from 'zustand';
import db from '../data/db/schema';
import { Order } from '../data/models/Order';

export const useOrderStore = create((set, get) => ({
    // State
    orders: [],
    filteredOrders: [],
    currentFilter: 'ALL', // ALL | UNPAID | DP | PAID
    loading: false,
    error: null,

    // === PAGINATION STATE (NEW) ===
    currentPage: 1,
    pageSize: 20,
    totalOrders: 0,
    totalPages: 0,
    searchQuery: '',

    // === SUMMARY DATA (Separate from paginated data) ===
    summaryData: {
        totalCount: 0,
        totalSales: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        countByPaymentStatus: { PAID: 0, DP: 0, UNPAID: 0 },
        countByProductionStatus: { PENDING: 0, IN_PROGRESS: 0, READY: 0, DELIVERED: 0, CANCELLED: 0 }
    },


    // Actions
    loadOrders: async () => {
        set({ loading: true, error: null });
        try {
            const orders = await db.orders.toArray();
            const orderObjects = orders.map(o => Order.fromDB(o));

            set({
                orders: orderObjects,
                filteredOrders: orderObjects,
                loading: false
            });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    // === PAGINATION: Load orders with offset/limit ===
    loadOrdersPaginated: async (page = 1, pageSize = 20, filter = 'ALL') => {
        set({ loading: true, error: null, currentPage: page, pageSize });
        try {
            // Get total count first
            let query = db.orders.orderBy('createdAt').reverse();

            // Apply filter if not ALL
            if (filter !== 'ALL') {
                const allOrders = await db.orders.where('paymentStatus').equals(filter).toArray();
                const sorted = allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const total = sorted.length;
                const totalPages = Math.ceil(total / pageSize);
                const skip = (page - 1) * pageSize;
                const paged = sorted.slice(skip, skip + pageSize);
                const orderObjects = paged.map(o => Order.fromDB(o));

                set({
                    orders: orderObjects,
                    filteredOrders: orderObjects,
                    totalOrders: total,
                    totalPages,
                    currentPage: page,
                    currentFilter: filter,
                    loading: false
                });
                return;
            }

            // No filter - use direct DB pagination
            const total = await db.orders.count();
            const totalPages = Math.ceil(total / pageSize);
            const skip = (page - 1) * pageSize;

            const orders = await db.orders
                .orderBy('createdAt')
                .reverse()
                .offset(skip)
                .limit(pageSize)
                .toArray();

            const orderObjects = orders.map(o => Order.fromDB(o));

            set({
                orders: orderObjects,
                filteredOrders: orderObjects,
                totalOrders: total,
                totalPages,
                currentPage: page,
                currentFilter: filter,
                loading: false
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
            if (dateRange && dateRange.start && dateRange.end) {
                ordersToSum = ordersToSum.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= dateRange.start && orderDate <= dateRange.end;
                });
            }

            // Exclude cancelled from main stats
            const activeOrders = ordersToSum.filter(o => o.productionStatus !== 'CANCELLED');
            const cancelledOrders = ordersToSum.filter(o => o.productionStatus === 'CANCELLED');

            const summary = {
                totalCount: activeOrders.length,
                // Calculate from items if available, fallback to totalAmount
                totalSales: activeOrders.reduce((sum, o) => {
                    if (o.items && o.items.length > 0) {
                        return sum + o.items.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0);
                    }
                    return sum + (o.totalAmount || 0);
                }, 0),
                totalCollected: activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
                totalOutstanding: activeOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0),
                countByPaymentStatus: {
                    PAID: activeOrders.filter(o => o.paymentStatus === 'PAID').length,
                    DP: activeOrders.filter(o => o.paymentStatus === 'DP').length,
                    UNPAID: activeOrders.filter(o => o.paymentStatus === 'UNPAID').length
                },
                countByProductionStatus: {
                    PENDING: activeOrders.filter(o => o.productionStatus === 'PENDING').length,
                    IN_PROGRESS: activeOrders.filter(o => o.productionStatus === 'IN_PROGRESS').length,
                    READY: activeOrders.filter(o => o.productionStatus === 'READY').length,
                    DELIVERED: activeOrders.filter(o => o.productionStatus === 'DELIVERED').length,
                    CANCELLED: cancelledOrders.length
                },
                totalLostRevenue: cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
            };

            set({ summaryData: summary });
            return summary;
        } catch (error) {
            console.error('❌ Failed to load summary:', error);
        }
    },

    // === SEARCH: Direct DB query for search ===
    searchOrders: async (query) => {
        if (!query || query.trim() === '') {
            // Clear search, reload paginated
            set({ searchQuery: '' });
            return get().loadOrdersPaginated(1, get().pageSize, get().currentFilter);
        }

        set({ loading: true, searchQuery: query.trim() });
        try {
            const lowerQuery = query.toLowerCase();

            // Use Collection.filter for flexible search
            const results = await db.orders
                .filter(order =>
                    (order.customerName && order.customerName.toLowerCase().includes(lowerQuery)) ||
                    (order.orderNumber && order.orderNumber.toLowerCase().includes(lowerQuery)) ||
                    (order.customerSnapshot?.name && order.customerSnapshot.name.toLowerCase().includes(lowerQuery))
                )
                .limit(50)
                .toArray();

            // Sort by createdAt desc
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const orderObjects = results.map(o => Order.fromDB(o));

            set({
                orders: orderObjects,
                filteredOrders: orderObjects,
                totalOrders: results.length,
                totalPages: 1, // Search shows all results in one page
                currentPage: 1,
                loading: false
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
        const { MACHINE_ID } = await import('../core/constants');

        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, ''); // "20260109"

        // Get last order for this machine and date
        const allOrders = await db.orders.toArray();
        const todayOrders = allOrders.filter(order => {
            if (!order.orderNumber) return false;

            // Extract date from order number: JGL-A-20260109-0001 -> "20260109"
            const parts = order.orderNumber.split('-');
            if (parts.length !== 4) return false;

            const orderMachineId = parts[1];
            const orderDate = parts[2];

            // Only count orders from same machine and same date
            return orderMachineId === MACHINE_ID && orderDate === datePrefix;
        });

        // Find max sequence for today on this machine
        let maxSequence = 0;
        todayOrders.forEach(order => {
            const parts = order.orderNumber.split('-');
            const sequence = parseInt(parts[3], 10);
            if (sequence > maxSequence) {
                maxSequence = sequence;
            }
        });

        const nextSequence = maxSequence + 1;
        const paddedSequence = nextSequence.toString().padStart(4, '0');

        return `JGL-${MACHINE_ID}-${datePrefix}-${paddedSequence}`;
    },

    createOrder: async (orderData) => {
        set({ loading: true, error: null });

        try {
            // VALIDATION 1: Customer Snapshot (MANDATORY)
            if (!orderData.customerSnapshot || !orderData.customerSnapshot.name || orderData.customerSnapshot.name.trim() === '') {
                throw new Error('ORDER REJECTED: Nama customer wajib diisi');
            }

            // VALIDATION 2: Metadata - Created By (MANDATORY)
            if (!orderData.meta || !orderData.meta.createdBy) {
                throw new Error('ORDER REJECTED: CS/Kasir tidak terdeteksi');
            }

            // STEP 1: Generate Order Number (ATOMIC)
            const orderNumber = await get()._generateOrderNumber();
            console.log('✅ Generated order number:', orderNumber);

            // STEP 2: Create Order with Generated Number (UUID auto-generated in constructor)
            const order = new Order({
                ...orderData,
                orderNumber,
                createdAt: new Date().toISOString(),
                // [SOP V2.0] FLAG TEMPO - Bypass payment gate
                isTempo: orderData.isTempo || false
            });

            order.updatePaymentStatus();

            // STEP 3: Save to IndexedDB (UUID already in order.id)
            await db.orders.put(order.toJSON()); // Use put() for explicit ID
            // Note: order.id already set by Order constructor (UUID)

            set(state => ({
                orders: [...state.orders, order],
                filteredOrders: get().applyFilter([...state.orders, order]),
                loading: false
            }));

            console.log('✅ Order created successfully:', order);
            return order;

        } catch (error) {
            console.error('❌ Order creation failed:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateOrder: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            await db.orders.update(id, updates);

            set(state => {
                const updatedOrders = state.orders.map(order => {
                    if (order.id === id) {
                        const updated = Order.fromDB({ ...order.toJSON(), ...updates });
                        updated.updatePaymentStatus();
                        return updated;
                    }
                    return order;
                });

                return {
                    orders: updatedOrders,
                    filteredOrders: get().applyFilter(updatedOrders),
                    loading: false
                };
            });
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    addPayment: async (orderId, amount) => {
        set({ loading: true, error: null });
        try {
            const order = get().orders.find(o => o.id === orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            const newPaidAmount = order.paidAmount + amount;
            const updates = {
                paidAmount: newPaidAmount,
                dpAmount: order.dpAmount || (newPaidAmount < order.totalAmount ? amount : 0),
            };

            // Update payment status
            if (newPaidAmount >= order.totalAmount) {
                updates.paymentStatus = 'PAID';
                updates.remainingAmount = 0;
            } else if (newPaidAmount > 0) {
                updates.paymentStatus = 'DP';
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

        if (status === 'IN_PROGRESS' && assignedTo) {
            updates.assignedTo = assignedTo;
        }

        if (status === 'READY') {
            updates.completedAt = new Date().toISOString();
        }

        if (status === 'DELIVERED') {
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
    cancelOrder: async (orderId, reason, financialAction = 'NONE') => {
        if (!reason || reason.trim() === '') {
            throw new Error('Alasan pembatalan wajib diisi!');
        }

        set({ loading: true, error: null });

        try {
            const updates = {
                productionStatus: 'CANCELLED',
                cancelReason: reason.trim(),
                cancelledAt: new Date().toISOString(),
                // [SOP V2.0] AUDIT KEUANGAN - Nasib uang DP saat batal
                financialAction: financialAction
            };

            await db.orders.update(orderId, updates);

            set(state => {
                const updatedOrders = state.orders.map(order =>
                    order.id === orderId
                        ? {
                            ...order,
                            productionStatus: 'CANCELLED',
                            cancelReason: reason.trim(),
                            cancelledAt: new Date().toISOString(),
                            financialAction: financialAction
                        }
                        : order
                );
                return {
                    orders: updatedOrders,
                    filteredOrders: get().applyFilter(updatedOrders),
                    loading: false
                };
            });

            console.log('✅ Order cancelled:', orderId, 'Reason:', reason, 'Financial:', financialAction);
        } catch (error) {
            console.error('❌ Cancel order failed:', error);
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
        if (filter === 'ALL') return orders;
        return orders.filter(order => order.paymentStatus === filter);
    },

    getOrdersByStatus: (status) => {
        return get().orders.filter(order => order.productionStatus === status);
    },

    getOrdersByPaymentStatus: (status) => {
        return get().orders.filter(order => order.paymentStatus === status);
    },

    getPendingOrders: () => {
        return get().orders.filter(order =>
            order.productionStatus !== 'DELIVERED' &&
            order.paymentStatus !== 'PAID'
        );
    },

    getOrderById: (id) => {
        return get().orders.find(order => order.id === id);
    },

    clearError: () => {
        set({ error: null });
    },
}));
