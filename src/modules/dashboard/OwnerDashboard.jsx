/**
 * OwnerDashboard Component
 * Main dashboard for owner - consumes all data
 */

import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../stores/useOrderStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import { usePermissions } from '../../hooks/usePermissions';
import { formatRupiah } from '../../core/formatters';
import { formatDate, formatTime, getDateRange } from '../../utils/dateHelpers';
import { StatsCard } from './StatsCard';
import { RecentOrders } from './RecentOrders';
import { TodayAttendance } from './TodayAttendance';

export function OwnerDashboard() {
    const { isOwner } = usePermissions();
    const [period, setPeriod] = useState('today'); // today | week | month
    // READ-ONLY: Tidak ada state edit di dashboard

    // Stores
    const { orders, loadOrders } = useOrderStore();
    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();
    const { todayAttendances, loadTodayAttendances } = useAttendanceStore();

    // Load data on mount
    useEffect(() => {
        loadOrders();
        loadEmployees();
        loadTodayAttendances();
    }, [loadOrders, loadEmployees, loadTodayAttendances]);

    // READ-ONLY: Tidak ada handler edit di dashboard

    // Check permission
    if (!isOwner) {
        return (
            <div className="access-denied">
                <h2>❌ Akses Ditolak</h2>
                <p>Hanya Owner yang bisa mengakses dashboard ini.</p>
            </div>
        );
    }

    // ============================================
    // SPLIT DATA LOGIC - Pemisahan Order Aktif vs Batal
    // ============================================

    // Get date range based on period
    const dateRange = getDateRange(period);

    // 1. CANCELLED ORDERS (Untuk audit trail - keranjang sampah)
    const cancelledOrders = orders
        .filter(o => o.productionStatus === 'CANCELLED')
        .sort((a, b) => new Date(b.cancelledAt || b.createdAt) - new Date(a.cancelledAt || a.createdAt));

    // 2. ACTIVE ORDERS ONLY (Exclude cancelled)
    const activeOrders = orders.filter(o => o.productionStatus !== 'CANCELLED');

    // 3. FILTERED ACTIVE ORDERS (by date range, exclude cancelled)
    const filteredOrders = activeOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });

    // Calculate stats - TRUST order.items[] (STEP 5)
    const stats = {
        // Sales - Calculate from items, NOT from order.totalAmount
        totalSales: filteredOrders.reduce((sum, order) => {
            // CRITICAL: Sum from items[], not order.totalAmount
            const orderTotal = order.items?.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0) || 0;

            // VALIDATION: Check if order.totalAmount matches calculated total
            if (order.totalAmount !== orderTotal) {
                console.error(`❌ DATA MISMATCH: Order ${order.id}`, {
                    storedTotal: order.totalAmount,
                    calculatedTotal: orderTotal,
                    items: order.items
                });
            }

            return sum + orderTotal;
        }, 0),
        totalOrders: filteredOrders.length,

        // Payment status
        unpaidOrders: filteredOrders.filter(o => o.paymentStatus === 'UNPAID').length,
        dpOrders: filteredOrders.filter(o => o.paymentStatus === 'DP').length,
        paidOrders: filteredOrders.filter(o => o.paymentStatus === 'PAID').length,

        // Production status
        pendingOrders: filteredOrders.filter(o => o.productionStatus === 'PENDING').length,
        inProgressOrders: filteredOrders.filter(o => o.productionStatus === 'IN_PROGRESS').length,
        readyOrders: filteredOrders.filter(o => o.productionStatus === 'READY').length,
        deliveredOrders: filteredOrders.filter(o => o.productionStatus === 'DELIVERED').length,
        cancelledOrders: cancelledOrders.length,

        // Collection
        totalCollected: filteredOrders.reduce((sum, order) => sum + order.paidAmount, 0),
        totalOutstanding: filteredOrders.reduce((sum, order) => sum + order.remainingAmount, 0),

        // Lost revenue from cancelled orders
        totalLostRevenue: cancelledOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),

        // Employees
        totalEmployees: getActiveEmployees().length,
        presentToday: todayAttendances.filter(a => a.checkInTime).length,

        // Average - Calculate from items
        averageOrderValue: filteredOrders.length > 0
            ? filteredOrders.reduce((sum, order) => {
                const orderTotal = order.items?.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0) || 0;
                return sum + orderTotal;
            }, 0) / filteredOrders.length
            : 0,
    };

    // 4. RECENT ACTIVE ORDERS (last 5, ONLY ACTIVE - not cancelled)
    const recentOrders = [...activeOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    return (
        <div className="owner-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>📊 Dashboard Owner</h1>
                    <p className="subtitle">Ringkasan bisnis real-time</p>
                </div>

                {/* Period Filter */}
                <div className="period-filter">
                    <button
                        className={`period-btn ${period === 'today' ? 'active' : ''}`}
                        onClick={() => setPeriod('today')}
                    >
                        Hari Ini
                    </button>
                    <button
                        className={`period-btn ${period === 'week' ? 'active' : ''}`}
                        onClick={() => setPeriod('week')}
                    >
                        7 Hari
                    </button>
                    <button
                        className={`period-btn ${period === 'month' ? 'active' : ''}`}
                        onClick={() => setPeriod('month')}
                    >
                        Bulan Ini
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {/* Total Sales */}
                <StatsCard
                    icon="💰"
                    title="Total Penjualan"
                    value={formatRupiah(stats.totalSales)}
                    subtitle={`${stats.totalOrders} pesanan`}
                    color="#22c55e"
                />

                {/* Collected */}
                <StatsCard
                    icon="💵"
                    title="Uang Terkumpul"
                    value={formatRupiah(stats.totalCollected)}
                    subtitle={`Piutang: ${formatRupiah(stats.totalOutstanding)}`}
                    color="#3b82f6"
                />

                {/* Pending Orders */}
                <StatsCard
                    icon="⏳"
                    title="Pesanan Pending"
                    value={stats.pendingOrders}
                    subtitle={`Dikerjakan: ${stats.inProgressOrders}`}
                    color="#f59e0b"
                />

                {/* Ready Orders */}
                <StatsCard
                    icon="✅"
                    title="Siap Diambil"
                    value={stats.readyOrders}
                    subtitle={`Terkirim: ${stats.deliveredOrders}`}
                    color="#8b5cf6"
                />
            </div>

            {/* Secondary Stats */}
            <div className="secondary-stats">
                <div className="stat-item">
                    <span className="stat-label">Rata-rata Nilai Order</span>
                    <span className="stat-value">{formatRupiah(stats.averageOrderValue)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Belum Bayar</span>
                    <span className="stat-value" style={{ color: '#ef4444' }}>{stats.unpaidOrders}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">DP</span>
                    <span className="stat-value" style={{ color: '#f59e0b' }}>{stats.dpOrders}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Lunas</span>
                    <span className="stat-value" style={{ color: '#22c55e' }}>{stats.paidOrders}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Karyawan Aktif</span>
                    <span className="stat-value">{stats.totalEmployees}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Hadir Hari Ini</span>
                    <span className="stat-value">{stats.presentToday}/{stats.totalEmployees}</span>
                </div>
            </div>

            {/* Content Grid */}
            <div className="dashboard-content">
                {/* Recent Orders */}
                <div className="content-section">
                    <h2>📋 Pesanan Terbaru</h2>
                    <RecentOrders orders={recentOrders} />
                </div>

                {/* Today Attendance */}
                <div className="content-section">
                    <h2>⏰ Absensi Hari Ini</h2>
                    <TodayAttendance
                        attendances={todayAttendances}
                        employees={getActiveEmployees()}
                    />
                </div>
            </div>

            {/* === CANCELLED ORDERS LOG (AUDIT TRAIL) === */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                marginTop: '32px',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                    padding: '20px 24px',
                    borderBottom: '1px solid #fecaca',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '10px',
                            background: '#fee2e2',
                            borderRadius: '10px',
                            color: '#dc2626'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '18px', margin: 0 }}>
                                Riwayat Pembatalan
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                                Monitoring order yang digagalkan
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            Total: {cancelledOrders.length}
                        </span>
                        <span style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            border: '1px solid #fecaca'
                        }}>
                            Lost: {formatRupiah(stats.totalLostRevenue)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: 0 }}>
                    {cancelledOrders.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '50px 20px',
                            color: '#94a3b8'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                            <p style={{ fontStyle: 'italic', margin: 0 }}>
                                Belum ada data pembatalan (Aman)
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                textAlign: 'left',
                                borderCollapse: 'collapse',
                                fontSize: '14px'
                            }}>
                                <thead>
                                    <tr style={{
                                        background: '#f8fafc',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}>
                                        <th style={{ padding: '14px 20px' }}>Waktu Batal</th>
                                        <th style={{ padding: '14px 20px' }}>ID Order</th>
                                        <th style={{ padding: '14px 20px' }}>Pelanggan</th>
                                        <th style={{ padding: '14px 20px', width: '30%' }}>Alasan Pembatalan</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'center' }}>Nasib Uang</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>Nominal Hilang</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cancelledOrders.map((order, index) => (
                                        <tr
                                            key={order.id}
                                            style={{
                                                borderBottom: index < cancelledOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                                                {new Date(order.cancelledAt || order.createdAt).toLocaleString('id-ID')}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontWeight: 'bold', color: '#334155' }}>
                                                {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                                    {order.customerSnapshot?.name || order.customerName || '-'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    {order.customerSnapshot?.whatsapp || order.customerPhone || '-'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    background: '#fee2e2',
                                                    color: '#b91c1c',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    border: '1px solid #fecaca',
                                                    display: 'inline-block'
                                                }}>
                                                    "{order.cancelReason || 'Tidak ada alasan'}"
                                                </span>
                                            </td>
                                            {/* [SOP V2.0] KOLOM NASIB UANG */}
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                {order.financialAction === 'REFUND' ? (
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                                        color: '#92400e',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        border: '1px solid #fcd34d'
                                                    }}>
                                                        💸 DIKEMBALIKAN
                                                    </span>
                                                ) : order.financialAction === 'FORFEIT' ? (
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                                        color: 'white',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        🔥 HANGUS (KAS)
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{
                                                padding: '14px 20px',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                color: '#94a3b8',
                                                textDecoration: 'line-through',
                                                textDecorationColor: '#ef4444'
                                            }}>
                                                {formatRupiah(order.totalAmount || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* READ-ONLY: Tidak ada modal edit di dashboard */}
        </div>
    );
}

