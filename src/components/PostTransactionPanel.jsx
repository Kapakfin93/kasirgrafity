import React from 'react';

/**
 * PostTransactionPanel Component
 * Displayed after order is successfully created
 * Gives user explicit control over next actions
 */
export function PostTransactionPanel({
    orderId,
    orderData,
    onPrint,
    onWhatsApp,
    onNewTransaction,
    onDashboard
}) {
    const formatRupiah = (n) => {
        return 'Rp ' + n.toLocaleString('id-ID');
    };

    return (
        <div className="post-transaction-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(8px)'
        }}>
            <div className="post-transaction-panel" style={{
                background: 'white',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Success Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '12px',
                        animation: 'scaleIn 0.3s ease-out'
                    }}>
                        ✅
                    </div>
                    <h2 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#0f172a'
                    }}>
                        Transaksi Berhasil!
                    </h2>
                    <p style={{
                        margin: '8px 0 0 0',
                        color: '#64748b',
                        fontSize: '14px'
                    }}>
                        Order #{orderId}
                    </p>
                </div>

                {/* Order Summary - CLEAR & UNAMBIGUOUS */}
                <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                }}>
                    {/* Header */}
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#64748b',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Detail Transaksi
                    </div>

                    {/* Item Count */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '14px'
                    }}>
                        <span style={{ color: '#64748b' }}>Jumlah Item</span>
                        <strong>{orderData?.items?.length || 0} item</strong>
                    </div>

                    {/* Subtotal */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '14px'
                    }}>
                        <span style={{ color: '#64748b' }}>Total Belanja</span>
                        <strong style={{ color: '#0f172a' }}>
                            {formatRupiah(orderData?.totalAmount || 0)}
                        </strong>
                    </div>

                    {/* Payment Method */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '14px'
                    }}>
                        <span style={{ color: '#64748b' }}>Metode Bayar</span>
                        <strong style={{
                            color: '#0f172a',
                            background: orderData?.paymentMode === 'TUNAI' ? '#dcfce7' : '#dbeafe',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px'
                        }}>
                            {orderData?.paymentMode || 'TUNAI'}
                        </strong>
                    </div>

                    {/* Amount Received */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '14px'
                    }}>
                        <span style={{ color: '#64748b' }}>Uang Diterima</span>
                        <strong style={{ color: '#0f172a' }}>
                            {formatRupiah(orderData?.paidAmount || orderData?.totalAmount || 0)}
                        </strong>
                    </div>

                    {/* Change */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '12px',
                        borderTop: '2px solid #e2e8f0',
                        fontSize: '15px'
                    }}>
                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Kembalian</span>
                        <strong style={{
                            fontSize: '20px',
                            color: '#059669',
                            fontWeight: 'bold'
                        }}>
                            {formatRupiah(
                                (orderData?.paidAmount || orderData?.totalAmount || 0) -
                                (orderData?.totalAmount || 0)
                            )}
                        </strong>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px'
                }}>
                    <button
                        onClick={onPrint}
                        style={{
                            padding: '14px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        🖨️ Cetak Nota
                    </button>

                    <button
                        onClick={onWhatsApp}
                        style={{
                            padding: '14px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        💬 Kirim WA
                    </button>

                    <button
                        onClick={onNewTransaction}
                        style={{
                            padding: '14px',
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        ➕ Transaksi Baru
                    </button>

                    <button
                        onClick={onDashboard}
                        style={{
                            padding: '14px',
                            background: 'white',
                            color: '#64748b',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        📊 Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
