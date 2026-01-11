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
