/**
 * TopProducts Component
 * Shows top performing products - DARK MODE AWARE
 */

import React, { useMemo } from 'react';

export function TopProducts({ orders }) {
    const productRankings = useMemo(() => {
        const productMap = new Map();

        orders.forEach(order => {
            if (!order.items || order.items.length === 0) return;
            order.items.forEach(item => {
                const productName = item.productName || item.description?.split(' (')[0] || 'Unknown';
                const qty = item.qty || 1;
                if (productMap.has(productName)) {
                    productMap.set(productName, productMap.get(productName) + qty);
                } else {
                    productMap.set(productName, qty);
                }
            });
        });

        const sorted = Array.from(productMap.entries())
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        const maxQty = sorted.length > 0 ? sorted[0].qty : 1;

        return sorted.map(item => ({
            ...item,
            percentage: Math.round((item.qty / maxQty) * 100)
        }));
    }, [orders]);

    if (productRankings.length === 0) {
        return (
            <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <p>Belum ada data produk</p>
            </div>
        );
    }

    return (
        <div className="top-products-list">
            {productRankings.map((product, index) => (
                <div key={product.name} className={`product-rank-item ${index === 0 ? 'product-rank-gold' : ''}`}>
                    <div className={`rank-badge rank-${index + 1}`}>{index + 1}</div>
                    <div className="product-rank-info">
                        <div className="product-rank-name">{product.name}</div>
                        <div className="product-rank-bar">
                            <div className="product-rank-fill" style={{ width: `${product.percentage}%` }} />
                        </div>
                    </div>
                    <div className="product-rank-qty">{product.qty.toLocaleString()} pcs</div>
                </div>
            ))}
        </div>
    );
}
