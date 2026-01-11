import React from 'react';
import { formatRupiah } from '../../core/formatters';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * PrintNota - THERMAL 80MM RECEIPT (READ-ONLY DISPLAY)
 * 
 * BLUEPRINT SPEC:
 * - 3 LINES PER ITEM: Title (bold), Specs (indent), Price Row (flexbox)
 * - NO discount/tax calculations
 * - Display: Subtotal, Grand Total, Payment, Remaining Balance
 * - Static payment footer
 * 
 * DATA CONTRACT:
 * - items[] from order_items (name, description, qty, unitPrice, totalPrice, finishings)
 * - totalAmount from order.grand_total
 * - paymentState: { mode, amountPaid }
 * - order: full order object with orderNumber, customerSnapshot, meta
 */
export function PrintNota({ items, totalAmount, paymentState, order }) {
    //===== STRICT VALIDATION - FAIL FAST =====

    if (!items || !Array.isArray(items) || items.length === 0) {
        return (
            <div className="print-error" style={{
                padding: '20px',
                background: '#fee',
                border: '2px solid #c00',
                color: '#c00',
                textAlign: 'center'
            }}>
                <h2>⚠️ ORDER TANPA ITEM – DATA RUSAK</h2>
                <p>PrintNota tidak dapat menampilkan order tanpa item.</p>
            </div>
        );
    }

    if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error(`PRINT BLOCKED: totalAmount invalid (${totalAmount})`);
    }

    items.forEach((item, index) => {
        if (!item.name || item.name.trim() === '') {
            throw new Error(`PRINT BLOCKED: Item #${index + 1} tidak memiliki nama`);
        }
        if (typeof item.totalPrice !== 'number' || isNaN(item.totalPrice)) {
            throw new Error(`PRINT BLOCKED: Item #${index + 1} "${item.name}" harga invalid`);
        }
    });

    // ===== READ-ONLY DISPLAY =====

    const { currentUser } = useAuthStore();
    const { mode, amountPaid } = paymentState || {};

    const paidAmount = parseFloat(amountPaid) || 0;
    const remainingBalance = Math.max(0, totalAmount - paidAmount);

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID');
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Extract from order if available
    const orderNumber = order?.orderNumber;
    const customerSnapshot = order?.customerSnapshot;

    return (
        <div id="print-80mm">
            <div className="thermal-receipt">
                {/* ========== HEADER (CENTER ALIGN) ========== */}
                <div className="th-header">JOGLO PRINTING</div>
                <div className="th-subheader">Jl. Diponegoro, Rw. 4, Jogoloyo</div>
                <div className="th-subheader">Demak, Jawa Tengah</div>
                <div className="th-subheader">Telp: 0813-9028-6826</div>
                <div className="th-line">================================</div>

                {/* ========== INFO TRANSAKSI (LEFT ALIGN) ========== */}
                <div className="th-info-row">
                    <span>Tanggal </span>
                    <span>: {dateStr} {timeStr}</span>
                </div>
                {orderNumber && (
                    <div className="th-info-row">
                        <span>No Order</span>
                        <span>: {orderNumber}</span>
                    </div>
                )}
                {customerSnapshot?.name && (
                    <div className="th-info-row">
                        <span>Customer</span>
                        <span>: {customerSnapshot.name}</span>
                    </div>
                )}
                {customerSnapshot?.whatsapp && (
                    <div className="th-info-row">
                        <span>WA</span>
                        <span>: {customerSnapshot.whatsapp}</span>
                    </div>
                )}
                {currentUser && (
                    <div className="th-info-row">
                        <span>Kasir   </span>
                        <span>: {currentUser.name}</span>
                    </div>
                )}
                <div className="th-line">================================</div>

                {/* ========== ITEMS (3 BARIS PER ITEM) ========== */}
                {items.map((item, index) => {
                    const unitPrice = item.unitPrice || (item.totalPrice / item.qty);

                    return (
                        <div key={item.id || index} className="nota-item">
                            {/* BARIS 1: Judul Item (BOLD) */}
                            <div className="nota-item-title">
                                {item.qty}x {item.name}
                            </div>

                            {/* BARIS 2: Spesifikasi (indent, font kecil) */}
                            {item.description && (
                                <div className="nota-item-spec">
                                    ({item.description})
                                </div>
                            )}

                            {/* Finishings (opsional, jika ada) */}
                            {Array.isArray(item.finishings) && item.finishings.length > 0 && (
                                <div className="nota-item-spec">
                                    {item.finishings.map((f, idx) => (
                                        <span key={idx}>+ {f.name} </span>
                                    ))}
                                </div>
                            )}

                            {/* BARIS 3: Harga (Flexbox kiri-kanan) */}
                            <div className="nota-item-price">
                                <span>@ {formatRupiah(unitPrice)}</span>
                                <span>{formatRupiah(item.totalPrice)}</span>
                            </div>
                        </div>
                    );
                })}

                <div className="th-line">================================</div>

                {/* ========== TOTAL & FOOTER ========== */}
                <div className="nota-total">
                    <span>Subtotal</span>
                    <span>{formatRupiah(totalAmount)}</span>
                </div>

                <div className="nota-total">
                    <span>GRAND TOTAL</span>
                    <span>{formatRupiah(totalAmount)}</span>
                </div>

                <div className="th-row">
                    <span>Bayar / DP ({mode || 'TUNAI'})</span>
                    <span>{formatRupiah(paidAmount)}</span>
                </div>

                {remainingBalance > 0 && (
                    <div className="nota-remaining">
                        <span>SISA BELUM BAYAR</span>
                        <span>{formatRupiah(remainingBalance)}</span>
                    </div>
                )}

                <div className="th-line">================================</div>

                {/* ========== STATIC FOOTER ========== */}
                <div className="th-footer">Terima Kasih - BUKA 24 JAM</div>
                <div className="th-footer">Pembayaran via Transfer:</div>
                <div className="th-footer">BCA 1234567890 / BRI 0987654321</div>
            </div>
        </div>
    );
}
