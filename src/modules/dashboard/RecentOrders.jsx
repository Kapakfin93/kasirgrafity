/**
 * RecentOrders Component
 * Display recent orders on dashboard
 */

import React from 'react';
import { formatRupiah } from '../../core/formatters';
import { formatDateTime } from '../../utils/dateHelpers';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../core/constants';

export function RecentOrders({ orders }) {
    // READ-ONLY: Dashboard tidak boleh ada tombol aksi
    if (orders.length === 0) {
        return (
            <div className="empty-state">
                <p>📭 Belum ada pesanan</p>
            </div>
        );
    }

    return (
        <div className="recent-orders-list">
            {orders.map(order => {
                // Safety Net: Fallback ke PENDING/UNPAID jika status tidak dikenali
                const statusConfig = ORDER_STATUS[order.productionStatus] || ORDER_STATUS['PENDING'];
                const paymentConfig = PAYMENT_STATUS[order.paymentStatus] || PAYMENT_STATUS['UNPAID'];

                return (
                    <div key={order.id} className="recent-order-item" style={{ position: 'relative' }}>
                        <div className="order-item-header">
                            <div className="order-item-id">
                                <strong>{order.orderNumber || `#${order.id.toString().slice(0, 8)}`}</strong>
                                <span className="order-item-customer">{order.customerName}</span>
                            </div>
                            <div className="order-item-badges">
                                <span
                                    className="mini-badge"
                                    style={{ backgroundColor: statusConfig.color }}
                                >
                                    {statusConfig.label}
                                </span>
                                <span
                                    className="mini-badge"
                                    style={{ backgroundColor: paymentConfig.color }}
                                >
                                    {paymentConfig.label}
                                </span>
                            </div>
                        </div>
                        <div className="order-item-details">
                            <span className="order-item-date">{formatDateTime(order.createdAt)}</span>
                            <span className="order-item-amount">{formatRupiah(order.totalAmount)}</span>
                        </div>
                        {order.paymentStatus === 'DP' && (
                            <div className="order-item-pending">
                                Sisa: {formatRupiah(order.remainingAmount)}
                            </div>
                        )}
                        {/* READ-ONLY: Tidak ada tombol aksi di Dashboard */}
                    </div>
                );
            })}
        </div>
    );
}
