/**
 * RecentOrders Component
 * Display recent orders - DARK MODE AWARE
 */

import React from 'react';
import { formatRupiah } from '../../core/formatters';
import { formatDateTime } from '../../utils/dateHelpers';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../core/constants';

export function RecentOrders({ orders }) {
    if (orders.length === 0) {
        return (
            <div className="empty-state">
                <p>📭 Belum ada pesanan</p>
            </div>
        );
    }

    const getProductPreview = (order) => {
        if (!order.items || order.items.length === 0) return null;
        const firstItem = order.items[0];
        const remainingCount = order.items.length - 1;
        const productName = firstItem.productName || firstItem.description?.split(' ')[0] || 'Item';
        const qty = firstItem.qty || 1;

        if (remainingCount > 0) {
            return `${productName} (${qty}pcs) + ${remainingCount} item lain`;
        }
        return `${productName} (${qty}pcs)`;
    };

    return (
        <div className="recent-orders-list">
            {orders.map(order => {
                const statusConfig = ORDER_STATUS[order.productionStatus] || ORDER_STATUS['PENDING'];
                const paymentConfig = PAYMENT_STATUS[order.paymentStatus] || PAYMENT_STATUS['UNPAID'];
                const productPreview = getProductPreview(order);

                return (
                    <div key={order.id} className="order-item-card">
                        <div className="order-item-header">
                            <div className="order-item-info">
                                <div className="order-item-id">{order.orderNumber || `#${order.id.toString().slice(0, 8)}`}</div>
                                <div className="order-item-customer">{order.customerName}</div>
                            </div>
                            <div className="order-item-badges">
                                <span className="mini-badge" style={{ backgroundColor: statusConfig.color }}>{statusConfig.label}</span>
                                <span className="mini-badge" style={{ backgroundColor: paymentConfig.color }}>{paymentConfig.label}</span>
                            </div>
                        </div>

                        {productPreview && (
                            <div className="product-preview">
                                <span className="product-preview-icon">📦</span>
                                <span className="product-preview-text">{productPreview}</span>
                            </div>
                        )}

                        <div className="order-item-footer">
                            <span className="order-item-date">{formatDateTime(order.createdAt)}</span>
                            <span className="order-item-amount">{formatRupiah(order.totalAmount)}</span>
                        </div>

                        {order.paymentStatus === 'DP' && (
                            <div className="order-item-dp-remaining">
                                💰 Sisa: {formatRupiah(order.remainingAmount)}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
