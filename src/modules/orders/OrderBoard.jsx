/**
 * OrderBoard Component
 * Production tracking board - read from OrderStore
 * Role: PRODUCTION (can view & update status)
 */

import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../stores/useOrderStore';
import { usePermissions } from '../../hooks/usePermissions';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../core/constants';
import { formatRupiah } from '../../core/formatters';
import { formatDateTime } from '../../utils/dateHelpers';
import { OrderCard } from './OrderCard';

export function OrderBoard() {
    const {
        orders,
        filteredOrders,
        currentFilter,
        loadOrders,
        filterByPaymentStatus,
        loading,
        error
    } = useOrderStore();

    const permissions = usePermissions();
    const canViewOrders = permissions.canViewOrders(); // Call the function!
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | IN_PROGRESS | READY
    const [searchQuery, setSearchQuery] = useState('');

    // Load orders on mount
    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Check permissions
    if (!canViewOrders) {
        return (
            <div className="access-denied">
                <h2>❌ Akses Ditolak</h2>
                <p>Anda tidak memiliki izin untuk melihat halaman ini.</p>
            </div>
        );
    }

    // Filter orders by production status and search
    const displayOrders = filteredOrders.filter(order => {
        // Status filter
        if (statusFilter !== 'ALL' && order.productionStatus !== statusFilter) {
            return false;
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                order.customerName.toLowerCase().includes(query) ||
                order.id.toString().includes(query) ||
                order.transactionId?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    // Count by status for badges
    const counts = {
        PENDING: orders.filter(o => o.productionStatus === 'PENDING').length,
        IN_PROGRESS: orders.filter(o => o.productionStatus === 'IN_PROGRESS').length,
        READY: orders.filter(o => o.productionStatus === 'READY').length,
    };

    return (
        <div className="order-board">
            {/* Header */}
            <div className="board-header">
                <div className="board-title">
                    <h1>📋 Order Board - Produksi</h1>
                    <p className="subtitle">Tracking status pesanan real-time</p>
                </div>

                {/* Search */}
                <div className="board-search">
                    <input
                        type="text"
                        placeholder="🔍 Cari pesanan... (nama customer, ID)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="board-filters">
                {/* Payment Status Filter */}
                <div className="filter-group">
                    <label>Status Pembayaran:</label>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${currentFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => filterByPaymentStatus('ALL')}
                        >
                            Semua
                        </button>
                        <button
                            className={`filter-btn unpaid ${currentFilter === 'UNPAID' ? 'active' : ''}`}
                            onClick={() => filterByPaymentStatus('UNPAID')}
                        >
                            Belum Bayar
                        </button>
                        <button
                            className={`filter-btn dp ${currentFilter === 'DP' ? 'active' : ''}`}
                            onClick={() => filterByPaymentStatus('DP')}
                        >
                            DP
                        </button>
                        <button
                            className={`filter-btn paid ${currentFilter === 'PAID' ? 'active' : ''}`}
                            onClick={() => filterByPaymentStatus('PAID')}
                        >
                            Lunas
                        </button>
                    </div>
                </div>

                {/* Production Status Filter */}
                <div className="filter-group">
                    <label>Status Produksi:</label>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('ALL')}
                        >
                            Semua
                        </button>
                        <button
                            className={`filter-btn pending ${statusFilter === 'PENDING' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('PENDING')}
                        >
                            Pending ({counts.PENDING})
                        </button>
                        <button
                            className={`filter-btn progress ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('IN_PROGRESS')}
                        >
                            Dikerjakan ({counts.IN_PROGRESS})
                        </button>
                        <button
                            className={`filter-btn ready ${statusFilter === 'READY' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('READY')}
                        >
                            Siap ({counts.READY})
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading / Error State */}
            {loading && <div className="board-loading">⏳ Memuat data...</div>}
            {error && <div className="board-error">❌ Error: {error}</div>}

            {/* Order Cards Grid */}
            <div className="board-grid">
                {!loading && displayOrders.length === 0 && (
                    <div className="board-empty">
                        <p>📭 Tidak ada pesanan untuk ditampilkan.</p>
                        {searchQuery && <p>Coba ubah kata kunci pencarian.</p>}
                    </div>
                )}

                {displayOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                ))}
            </div>
        </div>
    );
}
