/**
 * ProductConfigModal - Dynamic Specification Modal
 * Adaptive form based on pricing type (AREA/LINEAR/MATRIX/UNIT/MANUAL)
 * Universal "Spesifikasi Produk" interface
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatRupiah } from '../../core/formatters';
import AdvancedProductForm from '../../components/forms/AdvancedProductForm';

export function ProductConfigModal({
    isOpen,
    onClose,
    product,
    category,
    onAddToCart,
    calculatePreview
}) {
    // Form State
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [qty, setQty] = useState(1);
    const [sizeKey, setSizeKey] = useState(null);
    const [manualPrice, setManualPrice] = useState('');
    const [selectedFinishings, setSelectedFinishings] = useState([]);

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setLength('');
            setWidth('');
            setQty(1);
            setSizeKey(null);
            setManualPrice('');
            setSelectedFinishings([]);

            // Auto-select first size for MATRIX
            if (category?.logic_type === 'MATRIX' && product.prices) {
                const firstKey = Object.keys(product.prices)[0];
                setSizeKey(firstKey);
            }
        }
    }, [product, category]);

    if (!isOpen || !product) return null;

    const logicType = category?.logic_type || 'UNIT';

    // Calculate preview price
    const getPreview = () => {
        if (calculatePreview) {
            return calculatePreview({
                product,
                qty,
                dimensions: { length: parseFloat(length) || 0, width: parseFloat(width) || 0 },
                sizeKey,
                manualPrice: parseFloat(manualPrice) || 0,
                finishings: selectedFinishings
            });
        }
        return { subtotal: 0 };
    };

    const preview = getPreview();

    // Validation
    const canSubmit = () => {
        switch (logicType) {
            case 'AREA':
                return product && parseFloat(length) > 0 && parseFloat(width) > 0;
            case 'LINEAR':
                return product && parseFloat(length) > 0;
            case 'MATRIX':
                return product && sizeKey;
            case 'MANUAL':
                return product && parseFloat(manualPrice) > 0;
            default: // UNIT, UNIT_SHEET
                return product && qty > 0;
        }
    };

    // Handle submit
    const handleSubmit = () => {
        if (!canSubmit()) return;

        onAddToCart({
            product,
            qty,
            dimensions: {
                length: parseFloat(length) || 0,
                width: parseFloat(width) || 0,
                sizeKey
            },
            manualPrice: parseFloat(manualPrice) || 0,
            finishings: selectedFinishings
        });

        onClose();
    };

    // Toggle finishing selection
    const toggleFinishing = (finishing) => {
        setSelectedFinishings(prev => {
            const exists = prev.find(f => f.id === finishing.id);
            if (exists) {
                return prev.filter(f => f.id !== finishing.id);
            }
            return [...prev, finishing];
        });
    };

    // STYLES
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modal: {
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '20px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)'
        },
        header: {
            marginBottom: '20px'
        },
        productName: {
            fontSize: '20px',
            fontWeight: '800',
            color: 'white',
            marginBottom: '4px'
        },
        subtitle: {
            fontSize: '12px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        },
        section: {
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.05)'
        },
        sectionLabel: {
            fontSize: '11px',
            color: '#64748b',
            textTransform: 'uppercase',
            fontWeight: '700',
            letterSpacing: '1px',
            marginBottom: '12px'
        },
        inputRow: {
            display: 'flex',
            gap: '12px',
            marginBottom: '12px'
        },
        inputGroup: {
            flex: 1
        },
        label: {
            display: 'block',
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '6px',
            fontWeight: '600'
        },
        input: {
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            background: 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            textAlign: 'center'
        },
        sizeGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
        },
        sizeBtn: (isActive) => ({
            padding: '12px',
            borderRadius: '10px',
            border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)',
            background: isActive ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: isActive ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none'
        }),
        qtyControl: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
        },
        qtyBtn: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            background: 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer'
        },
        qtyValue: {
            fontSize: '24px',
            fontWeight: '800',
            color: 'white',
            minWidth: '60px',
            textAlign: 'center'
        },
        finishingGrid: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
        },
        finishingBtn: (isActive) => ({
            padding: '8px 12px',
            borderRadius: '8px',
            border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)',
            background: isActive ? '#10b981' : 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
        }),
        footer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        },
        totalSection: {
            textAlign: 'left'
        },
        totalLabel: {
            fontSize: '11px',
            color: '#64748b',
            textTransform: 'uppercase'
        },
        totalValue: {
            fontSize: '24px',
            fontWeight: '800',
            color: '#22c55e'
        },
        actions: {
            display: 'flex',
            gap: '10px'
        },
        btnCancel: {
            padding: '12px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: '600',
            cursor: 'pointer'
        },
        btnConfirm: {
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: canSubmit() ? 'linear-gradient(135deg, #059669, #10b981)' : '#475569',
            color: 'white',
            fontWeight: '700',
            cursor: canSubmit() ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit() ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
        }
    };

    // Render specific inputs based on logic type
    const renderSpecificInputs = () => {
        switch (logicType) {
            case 'AREA':
                return (
                    <div style={styles.inputRow}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Panjang (meter)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                style={styles.input}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Lebar (meter)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                style={styles.input}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                );

            case 'LINEAR':
                return (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Panjang (meter)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            style={styles.input}
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                );

            case 'MATRIX':
                return (
                    <div>
                        <label style={styles.label}>Pilih Ukuran</label>
                        <div style={styles.sizeGrid}>
                            {product.prices && Object.keys(product.prices).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSizeKey(key)}
                                    style={styles.sizeBtn(sizeKey === key)}
                                >
                                    <div style={{ fontSize: '14px' }}>{key}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                        {formatRupiah(product.prices[key])}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'MANUAL':
                return (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Harga Manual</label>
                        <input
                            type="number"
                            value={manualPrice}
                            onChange={(e) => setManualPrice(e.target.value)}
                            style={styles.input}
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                );

            default: // UNIT, UNIT_SHEET
                return null; // No dimension inputs needed
        }
    };

    // ========== ADVANCED PRICING MODEL INTEGRATION ==========
    // If product has ADVANCED pricing, use the specialized form
    if (product.pricing_model === 'ADVANCED') {
        const advancedModalContent = (
            <div style={styles.overlay} onClick={onClose}>
                <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                    <AdvancedProductForm
                        product={product}
                        onSubmit={(formPayload) => {
                            // CRITICAL: Calculate fallback unit price if undefined
                            const safeQty = formPayload.qty || 1;
                            const safeTotalPrice = formPayload.total_price || 0;

                            // Use provided unit price OR calculate from total/qty
                            const finalUnitPrice = formPayload.unit_price_final !== undefined
                                ? formPayload.unit_price_final
                                : Math.floor(safeTotalPrice / safeQty);

                            console.log('🔍 ADVANCED Payload Debug:', {
                                from_form: formPayload.unit_price_final,
                                calculated: finalUnitPrice,
                                total: safeTotalPrice,
                                qty: safeQty
                            });

                            // CRITICAL: Merge product metadata with transaction data
                            // useTransaction.js requires full product object with id, name, etc.
                            const fullCartItem = {
                                // Include full product object for validation
                                product: product,

                                // Transaction data from AdvancedProductForm
                                qty: safeQty,
                                total_price: safeTotalPrice,
                                unit_price_final: finalUnitPrice,  // GUARANTEED not undefined

                                // Production notes and financial breakdown
                                notes: formPayload.notes || '',
                                revenue_print: formPayload.revenue_print || 0,
                                revenue_finish: formPayload.revenue_finish || 0,
                                detail_options: formPayload.detail_options || null,

                                // Empty arrays for compatibility with legacy structure
                                dimensions: {},
                                finishings: []
                            };

                            console.log('🎯 ADVANCED Cart Item:', fullCartItem);

                            // Send merged payload to cart
                            onAddToCart(fullCartItem);
                            onClose();
                        }}
                    />
                </div>
            </div>
        );
        return createPortal(advancedModalContent, document.body);
    }

    // ========== LEGACY PRICING MODELS ==========
    const modalContent = (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.subtitle}>Spesifikasi Produk</div>
                </div>

                {/* Specification Section */}
                <div style={styles.section}>
                    <div style={styles.sectionLabel}>📐 Spesifikasi</div>

                    {/* Type-specific inputs */}
                    {renderSpecificInputs()}

                    {/* Quantity (Universal) */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Jumlah (Qty)</label>
                        <div style={styles.qtyControl}>
                            <button
                                style={styles.qtyBtn}
                                onClick={() => setQty(Math.max(1, qty - 1))}
                            >−</button>
                            <span style={styles.qtyValue}>{qty}</span>
                            <button
                                style={styles.qtyBtn}
                                onClick={() => setQty(qty + 1)}
                            >+</button>
                        </div>
                    </div>
                </div>

                {/* Finishing Section (if available) */}
                {category?.finishings?.length > 0 && (
                    <div style={styles.section}>
                        <div style={styles.sectionLabel}>✨ Finishing / Opsi Tambahan</div>
                        <div style={styles.finishingGrid}>
                            {category.finishings.map(fin => (
                                <button
                                    key={fin.id}
                                    onClick={() => toggleFinishing(fin)}
                                    style={styles.finishingBtn(selectedFinishings.find(f => f.id === fin.id))}
                                >
                                    {fin.name} {fin.price > 0 && `+${formatRupiah(fin.price)}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <div style={styles.totalSection}>
                        <div style={styles.totalLabel}>Total Harga</div>
                        <div style={styles.totalValue}>{formatRupiah(preview.subtotal || 0)}</div>
                    </div>
                    <div style={styles.actions}>
                        <button style={styles.btnCancel} onClick={onClose}>
                            Batal
                        </button>
                        <button
                            style={styles.btnConfirm}
                            onClick={handleSubmit}
                            disabled={!canSubmit()}
                        >
                            🛒 Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
