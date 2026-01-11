/**
 * OrderCard Component
 * Smart Action Buttons - Strict Workflow
 * PENDING → PROSES SPK → IN_PROGRESS → SELESAI → READY → SERAHKAN → DELIVERED
 */

import React, { useState } from 'react';
import { useOrderStore } from '../../stores/useOrderStore';
import { usePermissions } from '../../hooks/usePermissions';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../core/constants';
import { formatRupiah } from '../../core/formatters';
import { formatDateTime } from '../../utils/dateHelpers';
import { NotaPreview } from '../pos/NotaPreview';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PromptModal } from '../../components/PromptModal';
import { WANotificationModal } from '../../components/WANotificationModal';

export function OrderCard({ order }) {
    const { updateProductionStatus, addPayment, cancelOrder } = useOrderStore();
    const permissions = usePermissions();
    const canUpdateOrderStatus = permissions.canUpdateOrderStatus(); // Call the function!
    const [isExpanded, setIsExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Edit state dihapus - Karyawan produksi tidak boleh edit order

    // Print Config State
    const [printConfig, setPrintConfig] = useState({
        show: false,
        type: 'NOTA',
        autoPrint: false
    });

    // === MODAL STATES ===
    const [settlementModal, setSettlementModal] = useState({ show: false });
    const [cancelReasonModal, setCancelReasonModal] = useState({ show: false });
    const [financialAuditModal, setFinancialAuditModal] = useState({ show: false, reason: '' });
    const [finalConfirmModal, setFinalConfirmModal] = useState({ show: false, reason: '', financialAction: 'NONE' });

    // [SMART WA] WhatsApp notification modal state
    const [waModal, setWaModal] = useState({ show: false, actionType: null });

    const statusConfig = ORDER_STATUS[order.productionStatus];
    const paymentConfig = PAYMENT_STATUS[order.paymentStatus];

    // === MAIN ACTION HANDLER ===
    const handleMainAction = async () => {
        if (!canUpdateOrderStatus) {
            alert('Anda tidak memiliki izin');
            return;
        }

        // PENDING → IN_PROGRESS: Direct update + Print SPK
        if (order.productionStatus === 'PENDING') {
            setUpdating(true);
            try {
                await updateProductionStatus(order.id, 'IN_PROGRESS');
                // Show SPK print modal AFTER status update
                // Use setTimeout to ensure React re-renders first
                setTimeout(() => {
                    setPrintConfig({ show: true, type: 'SPK', autoPrint: true });
                }, 100);
            } catch (err) {
                alert('❌ Gagal: ' + err.message);
            }
            setUpdating(false);
            return;
        }

        // IN_PROGRESS → READY: Show WA modal (COMPLETE)
        if (order.productionStatus === 'IN_PROGRESS') {
            setWaModal({ show: true, actionType: 'COMPLETE' });
            return;
        }

        // READY → DELIVERED: Show WA modal (DELIVER)
        if (order.productionStatus === 'READY') {
            setWaModal({ show: true, actionType: 'DELIVER' });
            return;
        }
    };

    // === WA MODAL HANDLERS ===
    const handleWAConfirmWithNotification = async () => {
        setWaModal({ show: false, actionType: null });
        setUpdating(true);
        try {
            if (waModal.actionType === 'COMPLETE') {
                await updateProductionStatus(order.id, 'READY');
                alert('✅ Order ditandai SIAP AMBIL + WA terkirim');
            } else if (waModal.actionType === 'DELIVER') {
                await updateProductionStatus(order.id, 'DELIVERED');
                alert('✅ Order SELESAI + WA terkirim');
            }
        } catch (err) {
            alert('❌ Gagal: ' + err.message);
        }
        setUpdating(false);
    };

    const handleWASilentUpdate = async () => {
        setWaModal({ show: false, actionType: null });
        setUpdating(true);
        try {
            if (waModal.actionType === 'COMPLETE') {
                await updateProductionStatus(order.id, 'READY');
                alert('✅ Order ditandai SIAP AMBIL (tanpa WA)');
            } else if (waModal.actionType === 'DELIVER') {
                await updateProductionStatus(order.id, 'DELIVERED');
                alert('✅ Order SELESAI (tanpa WA)');
            }
        } catch (err) {
            alert('❌ Gagal: ' + err.message);
        }
        setUpdating(false);
    };

    const handleWACancel = () => {
        setWaModal({ show: false, actionType: null });
    };

    // === SETTLEMENT HANDLER (STEP 1: Open Modal) ===
    const handleSettlement = () => {
        console.log('🔵 handleSettlement CLICKED');
        setSettlementModal({ show: true });
    };

    // === SETTLEMENT EXECUTION (STEP 2: Execute after confirm) ===
    const executeSettlement = async () => {
        const sisa = order.remainingAmount || (order.totalAmount - order.paidAmount);
        setSettlementModal({ show: false });
        setUpdating(true);
        try {
            await addPayment(order.id, sisa);
            // Auto Print Nota Lunas
            setPrintConfig({ show: true, type: 'NOTA', autoPrint: true });
        } catch (err) {
            alert('❌ Gagal: ' + err.message);
        }
        setUpdating(false);
    };

    // === CANCEL ORDER HANDLER (STEP 1: Open reason modal) ===
    const handleCancelOrder = () => {
        console.log('🔴 handleCancelOrder CLICKED');
        // 🛡️ LAPIS 1: Cek Data Order
        if (!order || !order.id) {
            alert("❌ ERROR SISTEM: ID Order tidak terbaca. Hubungi IT.");
            return;
        }
        // Open reason input modal
        setCancelReasonModal({ show: true });
    };

    // === CANCEL STEP 2: After reason submitted ===
    const handleReasonSubmitted = (reason) => {
        setCancelReasonModal({ show: false });

        const amountPaid = order.paidAmount || 0;
        const hasMoneyIn = amountPaid > 0;

        if (hasMoneyIn) {
            // Need financial audit - open that modal
            setFinancialAuditModal({ show: true, reason });
        } else {
            // No money - skip to final confirm
            setFinalConfirmModal({ show: true, reason, financialAction: 'NONE' });
        }
    };

    // === CANCEL STEP 3A: Financial audit (REFUND) ===
    const handleFinancialRefund = () => {
        // PENTING: Simpan reason SEBELUM close modal (menghindari race condition)
        const savedReason = financialAuditModal.reason;
        setFinancialAuditModal({ show: false, reason: '' });
        setFinalConfirmModal({
            show: true,
            reason: savedReason,  // Gunakan variable yang sudah disimpan
            financialAction: 'REFUND'
        });
    };

    // === CANCEL STEP 3B: Financial audit (FORFEIT) ===
    const handleFinancialForfeit = () => {
        // PENTING: Simpan reason SEBELUM close modal (menghindari race condition)
        const savedReason = financialAuditModal.reason;
        setFinancialAuditModal({ show: false, reason: '' });
        setFinalConfirmModal({
            show: true,
            reason: savedReason,  // Gunakan variable yang sudah disimpan
            financialAction: 'FORFEIT'
        });
    };

    // === CANCEL STEP 4: Final execution ===
    const executeCancelOrder = async () => {
        const { reason, financialAction } = finalConfirmModal;
        setFinalConfirmModal({ show: false, reason: '', financialAction: 'NONE' });

        setUpdating(true);
        try {
            await cancelOrder(order.id, reason.trim(), financialAction);
            // UI akan update sendiri via store
        } catch (error) {
            console.error("Gagal membatalkan:", error);
            alert("❌ Gagal menyimpan ke database. Coba lagi.");
        } finally {
            setUpdating(false);
        }
    };

    // === MANUAL REPRINT ===
    const handleReprint = () => {
        setPrintConfig({ show: true, type: 'NOTA', autoPrint: false });
    };

    // === GET MAIN ACTION CONFIG (SMART SAKLAR) ===
    const getMainAction = () => {
        // [SOP V2.0] PAYMENT GATE LOGIC
        // Cek apakah sudah bayar (LUNAS/DP) ATAU punya akses VIP (Tempo)
        const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'DP';
        const isTempo = order.isTempo === true;
        const canProcess = isPaid || isTempo; // Kunci Utama

        switch (order.productionStatus) {
            case 'PENDING':
                return {
                    label: '🖨️ PROSES SPK',
                    // Jika tidak bisa proses, warna abu-abu. Jika bisa, biru.
                    color: canProcess ? '#3b82f6' : '#94a3b8',
                    // Matikan tombol jika belum bayar & bukan tempo
                    disabled: !canProcess
                };
            case 'IN_PROGRESS':
                return {
                    label: '✅ TANDAI SELESAI',
                    color: '#22c55e',
                    disabled: false
                };
            case 'READY':
                return {
                    label: '📦 SERAHKAN',
                    color: '#64748b',
                    disabled: false
                };
            default:
                return null;
        }
    };

    const mainAction = getMainAction();

    // Check if order can be cancelled
    const canCancel = order.productionStatus !== 'CANCELLED' && order.productionStatus !== 'DELIVERED';

    return (
        <div className={`order-card status-${order.productionStatus.toLowerCase()}`}>
            {/* === HEADER === */}
            <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="order-id">
                    <span className="order-number" style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {/* Source Indicator: 🏪 Offline / 🌐 Online */}
                        <span title={order.source === 'ONLINE' ? 'Order Online' : 'Order Kasir'}>
                            {order.source === 'ONLINE' ? '🌐' : '🏪'}
                        </span>
                        {' '}{order.orderNumber || `#${String(order.id).slice(0, 8)}`}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* Mini Print Button */}
                    <button
                        onClick={handleReprint}
                        style={{
                            background: 'none',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        title="Cetak Ulang Nota"
                    >
                        🖨️
                    </button>
                    {/* Status Badges */}
                    <span
                        style={{
                            backgroundColor: order.productionStatus === 'CANCELLED' ? '#ef4444' : (statusConfig?.color || '#94a3b8'),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}
                    >
                        {order.productionStatus === 'CANCELLED' ? '🚫 DIBATALKAN' : (statusConfig?.label || order.productionStatus)}
                    </span>
                    <span
                        style={{
                            backgroundColor: paymentConfig?.color || '#94a3b8',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}
                    >
                        {paymentConfig?.label || order.paymentStatus}
                    </span>
                </div>
            </div>

            {/* === CANCELLED REASON DISPLAY === */}
            {order.productionStatus === 'CANCELLED' && order.cancelReason && (
                <div style={{
                    marginTop: '8px',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid #fecaca'
                }}>
                    <strong>🚫 Dibatalkan:</strong> {order.cancelReason}
                    {order.cancelledAt && (
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                            {formatDateTime(order.cancelledAt)}
                        </div>
                    )}
                </div>
            )}

            {/* === CUSTOMER === */}
            <div className="order-customer" style={{ margin: '8px 0', fontSize: '14px' }}>
                <strong>👤 {order.customerName}</strong>
                {order.customerPhone && <span style={{ marginLeft: '10px', color: '#64748b' }}>📞 {order.customerPhone}</span>}
            </div>

            {/* === ITEMS SUMMARY === */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{order.items?.length || 0} item(s)</span>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    {isExpanded ? '▲ Tutup' : '▼ Detail'}
                </button>
            </div>

            {/* === EXPANDED ITEMS === */}
            {isExpanded && (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                    {(order.items || []).map((item, idx) => (
                        <div key={idx} style={{
                            padding: '6px 0',
                            borderBottom: idx < order.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
                            fontSize: '13px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600' }}>{item.productName}</span>
                                <span>x{item.qty}</span>
                            </div>
                            {item.description && (
                                <div style={{ color: '#64748b', fontSize: '11px' }}>{item.description}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* === PAYMENT INFO === */}
            <div style={{
                background: order.paymentStatus === 'PAID' ? '#f0fdf4' : '#fef2f2',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total</span>
                    <span>{formatRupiah(order.totalAmount)}</span>
                </div>
                {order.paymentStatus === 'DP' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                            <span>Dibayar</span>
                            <span>{formatRupiah(order.paidAmount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>
                            <span>Sisa</span>
                            <span>{formatRupiah(order.remainingAmount)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* === TIMELINE (Compact) === */}
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                📅 {formatDateTime(order.createdAt)}
            </div>

            {/* === ACTION BUTTONS === */}
            {order.productionStatus !== 'CANCELLED' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* LEFT: Settlement Button (if not PAID) */}
                    {order.paymentStatus !== 'PAID' && (
                        <button
                            onClick={handleSettlement}
                            disabled={updating}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                opacity: updating ? 0.7 : 1,
                                minWidth: '100px'
                            }}
                        >
                            {updating ? '⏳...' : '💸 LUNASI'}
                        </button>
                    )}

                    {/* CENTER: Main Action Button (SMART SAKLAR) */}
                    {mainAction && canUpdateOrderStatus && (
                        <button
                            onClick={handleMainAction}
                            disabled={updating || mainAction.disabled}
                            title={mainAction.disabled ? 'Belum bisa diproses - Bayar dulu atau set Tempo' : ''}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: mainAction.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: (updating || mainAction.disabled) ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                opacity: (updating || mainAction.disabled) ? 0.6 : 1,
                                minWidth: '100px'
                            }}
                        >
                            {updating ? '⏳...' : mainAction.label}
                            {mainAction.disabled && ' 🔒'}
                        </button>
                    )}

                    {/* TOMBOL EDIT DIHAPUS - Karyawan produksi tidak boleh edit order */}

                    {/* RIGHT: Cancel Button */}
                    {canCancel && canUpdateOrderStatus && (
                        <button
                            onClick={handleCancelOrder}
                            disabled={updating}
                            style={{
                                padding: '10px 12px',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: '2px solid #fecaca',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                opacity: updating ? 0.7 : 1,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#fef2f2';
                                e.target.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = '#fecaca';
                            }}
                            title="Batalkan Order"
                        >
                            🚫 BATAL
                        </button>
                    )}
                </div>
            )}

            {/* EDIT MODAL DIHAPUS - Karyawan produksi tidak boleh edit order */}

            {/* === NOTA PREVIEW MODAL === */}
            {printConfig.show && (
                <NotaPreview
                    items={order.items}
                    totalAmount={order.totalAmount}
                    paymentState={{
                        amountPaid: order.paidAmount,
                        mode: order.paymentStatus === 'PAID' ? 'LUNAS' : 'DP'
                    }}
                    order={order}
                    type={printConfig.type}
                    autoPrint={printConfig.autoPrint}
                    onClose={() => setPrintConfig({ ...printConfig, show: false, autoPrint: false })}
                    onPrint={() => window.print()}
                />
            )}

            {/* === SETTLEMENT MODAL === */}
            <ConfirmModal
                isOpen={settlementModal.show}
                title="💸 Konfirmasi Pelunasan"
                message={
                    <div>
                        <p style={{ marginBottom: '8px' }}>Terima pelunasan sebesar:</p>
                        <p style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#22c55e',
                            margin: '12px 0'
                        }}>
                            {formatRupiah(order.remainingAmount || (order.totalAmount - order.paidAmount))}
                        </p>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Order: {order.orderNumber}
                        </p>
                    </div>
                }
                confirmText="Ya, Terima"
                cancelText="Batal"
                confirmColor="#22c55e"
                onConfirm={executeSettlement}
                onCancel={() => setSettlementModal({ show: false })}
            />

            {/* === CANCEL REASON MODAL (STEP 1) === */}
            <PromptModal
                isOpen={cancelReasonModal.show}
                title="🛑 Pembatalan Order"
                message={`Anda akan membatalkan order: ${order.orderNumber}`}
                placeholder="Masukkan alasan pembatalan..."
                submitText="Lanjutkan"
                submitColor="#ef4444"
                onSubmit={handleReasonSubmitted}
                onCancel={() => setCancelReasonModal({ show: false })}
                required={true}
            />

            {/* === FINANCIAL AUDIT MODAL (STEP 2) === */}
            <ConfirmModal
                isOpen={financialAuditModal.show}
                title="💰 Audit Keuangan"
                message={
                    <div>
                        <p style={{ marginBottom: '12px' }}>Order ini memiliki pembayaran:</p>
                        <p style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#f59e0b',
                            margin: '8px 0'
                        }}>
                            {formatRupiah(order.paidAmount || 0)}
                        </p>
                        <p style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#475569'
                        }}>
                            Pilih nasib uang pembayaran:
                        </p>
                    </div>
                }
                confirmText="💸 REFUND (Dikembalikan)"
                cancelText="🔥 HANGUS (Masuk Kas)"
                confirmColor="#f59e0b"
                onConfirm={handleFinancialRefund}
                onCancel={handleFinancialForfeit}
            />

            {/* === FINAL CONFIRM MODAL (STEP 3) === */}
            <ConfirmModal
                isOpen={finalConfirmModal.show}
                title="⚠️ Konfirmasi Akhir"
                message={
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>Ringkasan Pembatalan:</p>
                        <div style={{
                            padding: '12px',
                            background: '#fef2f2',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            fontSize: '13px'
                        }}>
                            <p><strong>Order:</strong> {order.orderNumber}</p>
                            <p><strong>Alasan:</strong> "{finalConfirmModal.reason}"</p>
                            <p><strong>Status Dana:</strong> {
                                finalConfirmModal.financialAction === 'REFUND' ? '💸 Dikembalikan' :
                                    finalConfirmModal.financialAction === 'FORFEIT' ? '🔥 Hangus' : '- Tidak ada'
                            }</p>
                        </div>
                    </div>
                }
                confirmText="Ya, Batalkan Order"
                cancelText="Tidak Jadi"
                confirmColor="#dc2626"
                onConfirm={executeCancelOrder}
                onCancel={() => setFinalConfirmModal({ show: false, reason: '', financialAction: 'NONE' })}
            />

            {/* === WA NOTIFICATION MODAL === */}
            <WANotificationModal
                isOpen={waModal.show}
                order={order}
                actionType={waModal.actionType}
                onConfirmWithWA={handleWAConfirmWithNotification}
                onConfirmSilent={handleWASilentUpdate}
                onCancel={handleWACancel}
            />
        </div>
    );
}

