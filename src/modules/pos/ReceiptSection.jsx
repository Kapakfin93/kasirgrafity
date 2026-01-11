import React from 'react';
import { formatRupiah } from '../../core/formatters';

export function ReceiptSection({ items, removeItem, totalAmount, paymentState, updatePayment, onConfirmPayment, isLocked: isLockedProp, onPrint, onReset, isTempo, setIsTempo }) {
    const { mode, amountPaid } = paymentState || {};
    const isLocked = isLockedProp || paymentState?.isLocked;

    // Calculate Change
    const paid = parseFloat(amountPaid) || 0;
    const change = Math.max(0, paid - totalAmount);
    const isTunai = mode === 'TUNAI';

    // Format display number (add thousand separators)
    const formatDisplayNumber = (value) => {
        if (!value) return '';
        return Number(value).toLocaleString('id-ID');
    };

    // Handle input change - strip non-numeric, store raw value
    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        updatePayment({ amountPaid: rawValue });
    };

    // Validation: Allow checkout if Tempo mode is active OR payment is valid
    const canCheckout = items.length > 0 && (isTempo || !isTunai || paid > 0);

    const renderSummary = () => {
        const sisaBayar = totalAmount - paid;
        return (
            <div className="total-summary">
                <div className="summary-row total">
                    <span>{isLocked ? 'TOTAL BAYAR' : 'TOTAL'}</span>
                    <span className="amount">{formatRupiah(totalAmount)}</span>
                </div>
                {isTunai && (
                    <>
                        <div className="summary-row">
                            <span>DIBAYAR</span>
                            <span>{formatRupiah(paid)}</span>
                        </div>
                        {sisaBayar > 0 ? (
                            <div className="summary-row sisa" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                <span>SISA BAYAR</span>
                                <span>{formatRupiah(sisaBayar)}</span>
                            </div>
                        ) : (
                            <div className="summary-row change">
                                <span>KEMBALI</span>
                                <span>{formatRupiah(change)}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const handlePrint = () => {
        console.log('SHOWING NOTA PREVIEW');
        console.table(items);
        console.log('TOTAL:', totalAmount);
        updatePayment({ showNotaPreview: true });
    };

    return (
        <div style={{
            background: 'white',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '380px',
            flexShrink: 0
        }}>
            {/* NEON TOP STRIP */}
            <div style={{
                height: '4px',
                width: '100%',
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6)'
            }} />

            {/* HEADER SECTION */}
            <div style={{
                padding: '20px',
                textAlign: 'center',
                borderBottom: '2px dashed #e2e8f0',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
            }}>
                {/* BRAND */}
                <h1 style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#1e293b',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}>
                    JOGLO <span style={{ color: '#0891b2' }}>PRINTING</span>
                </h1>

                {/* ADDRESS */}
                <div style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#64748b',
                    lineHeight: '1.6',
                    marginBottom: '12px'
                }}>
                    <p style={{ margin: '2px 0' }}>Jl. Diponegoro, Rw. 4, Jogoloyo</p>
                    <p style={{ margin: '2px 0' }}>Demak, Jawa Tengah</p>
                    <p style={{
                        margin: '4px 0',
                        fontFamily: 'monospace',
                        color: '#475569',
                        letterSpacing: '0.05em',
                        fontWeight: '600'
                    }}>0813-9028-6826</p>
                </div>

                {/* 24H BADGE - HIGH CONTRAST */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#000000',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)'
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#000'
                    }} />
                    ⚡ Buka 24 Jam
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {items.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '2px dashed #e2e8f0',
                        color: '#94a3b8'
                    }}>
                        <span style={{ fontSize: '48px', opacity: 0.3 }}>🛒</span>
                        <p style={{ marginTop: '12px', fontWeight: '600' }}>Cart Kosong</p>
                    </div>
                )}

                {items.map((item) => {
                    // Standardized Data Structure Mapping
                    const { id, productName, dimensions, pricingType, qty, totalPrice, finishings } = item;
                    // Fallback for safety
                    const { length, width, sizeKey } = dimensions || {};

                    return (
                        <div key={id} className="receipt-item-card" style={{ opacity: isLocked ? 0.7 : 1 }}>
                            <div className="item-info">
                                {/* Improved Name Rendering */}
                                <div className="item-name">{productName || item.name || 'Unknown Item'}</div>
                                <div className="item-details">
                                    {(pricingType === 'AREA' || pricingType === 'CUSTOM') && length && width && (
                                        <span className="dim-badge">{length}m x {width}m</span>
                                    )}
                                    {pricingType === 'LINEAR' && length && (
                                        <span className="dim-badge">{length}m</span>
                                    )}
                                    {pricingType === 'MATRIX' && sizeKey && (
                                        <span className="size-badge">{sizeKey}</span>
                                    )}
                                    {pricingType === 'MANUAL' && (
                                        <span className="manual-badge">-</span>
                                    )}
                                    <span className="qty-badge">{qty} pcs</span>
                                </div>

                                {finishings && finishings.length > 0 && (
                                    <div className="item-finishings">
                                        {finishings.map((f, idx) => (
                                            <span key={idx} className="fin-pill">+ {f.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '8px'
                            }}>
                                <div className="item-price" style={{
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    fontSize: '14px'
                                }}>
                                    {formatRupiah(totalPrice)}
                                </div>
                                {!isLocked && (
                                    <button
                                        onClick={() => removeItem(id)}
                                        title="Hapus Item"
                                        style={{
                                            padding: '6px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#fef2f2';
                                            e.currentTarget.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="receipt-footer">
                {!isLocked ? (
                    <>
                        <div className="payment-controls">
                            <div className="payment-mode-switch">
                                <button
                                    className={`mode-btn ${mode === 'TUNAI' ? 'active' : ''}`}
                                    onClick={() => updatePayment({ mode: 'TUNAI' })}
                                >
                                    TUNAI
                                </button>
                                <button
                                    className={`mode-btn ${mode === 'NON_TUNAI' ? 'active' : ''}`}
                                    onClick={() => updatePayment({ mode: 'NON_TUNAI' })}
                                >
                                    NON TUNAI
                                </button>
                            </div>

                            {/* [SOP V2.0] TEMPO/VIP CHECKBOX */}
                            {setIsTempo && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    marginTop: '10px',
                                    background: isTempo
                                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                                        : '#f8fafc',
                                    borderRadius: '10px',
                                    border: isTempo ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }} onClick={() => setIsTempo(!isTempo)}>
                                    <input
                                        type="checkbox"
                                        id="tempo-mode"
                                        checked={isTempo}
                                        onChange={(e) => setIsTempo(e.target.checked)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            accentColor: '#8b5cf6',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <label htmlFor="tempo-mode" style={{
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        flex: 1
                                    }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: isTempo ? '#6366f1' : '#475569',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            👑 MODE TEMPO / VIP
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: '#94a3b8',
                                            marginTop: '2px'
                                        }}>
                                            Bypass produksi tanpa pembayaran
                                        </div>
                                    </label>
                                    {isTempo && (
                                        <span style={{
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            color: 'white',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            letterSpacing: '0.05em'
                                        }}>
                                            AKTIF
                                        </span>
                                    )}
                                </div>
                            )}
                            {isTunai && (
                                <div className="payment-input-row">
                                    <label>Uang Diterima</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formatDisplayNumber(amountPaid)}
                                        onChange={handleAmountChange}
                                        className="pay-input"
                                        onFocus={(e) => e.target.select()}
                                        style={{
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            textAlign: 'right'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {renderSummary()}

                        <button
                            disabled={!canCheckout}
                            onClick={() => {
                                console.log("=== PROSES PEMBAYARAN BUTTON CLICKED ===");
                                onConfirmPayment();
                            }}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: canCheckout
                                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                    : '#475569',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '800',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                cursor: canCheckout ? 'pointer' : 'not-allowed',
                                boxShadow: canCheckout ? '0 4px 20px rgba(16, 185, 129, 0.4)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            💳 PROSES PEMBAYARAN
                        </button>
                    </>
                ) : (
                    <div style={{ padding: '16px' }}>
                        {/* STATUS BADGE - HIGH CONTRAST */}
                        <div style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: paid >= totalAmount
                                ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                                : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '16px',
                            boxShadow: paid >= totalAmount
                                ? '0 4px 12px rgba(34, 197, 94, 0.4)'
                                : '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}>
                            {paid >= totalAmount ? '✅ LUNAS' : '⏳ DP (BELUM LUNAS)'} ({mode})
                        </div>

                        {renderSummary()}

                        {/* ACTION BUTTONS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            <button
                                onClick={() => {
                                    console.log('🖨️ Tombol Cetak Diklik');
                                    if (onPrint) onPrint();
                                    else window.print(); // Fallback darurat
                                }}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#000';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = 'scale(0.98)';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                CETAK NOTA
                            </button>
                            <button
                                onClick={() => {
                                    console.log('🔄 Tombol Transaksi Baru Diklik');
                                    if (onReset) onReset();
                                    else window.location.reload(); // Fallback darurat
                                }}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '2px solid #1e293b',
                                    background: 'white',
                                    color: '#1e293b',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = 'scale(0.98)';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                            >
                                ✨ TRANSAKSI BARU
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
