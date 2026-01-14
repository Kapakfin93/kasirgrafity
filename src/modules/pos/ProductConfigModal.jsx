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

    // GEN 2 State
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null); // For 2-step selection (Sticker)
    const [finishingGroupSelections, setFinishingGroupSelections] = useState({});

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setLength('');
            setWidth('');
            setQty(1);
            setSizeKey(null);
            setManualPrice('');
            setSelectedFinishings([]);
            setSelectedVariant(null);
            setSelectedMaterial(null);
            setFinishingGroupSelections({});

            // Auto-select first size for MATRIX
            if (category?.logic_type === 'MATRIX' && product.prices) {
                const firstKey = Object.keys(product.prices)[0];
                setSizeKey(firstKey);
            }

            // Auto-select first variant for GEN 2 LINEAR (FLAT ONLY)
            // If Nested (Sticker), we DO NOT auto-select to force user choice
            const isNested = product.variants && product.variants.length > 0 && product.variants[0].options;
            if (product.input_mode === 'LINEAR' && product.variants && product.variants.length > 0 && !isNested) {
                setSelectedVariant(product.variants[0]);
            }

            // Set min qty for GEN 2 products
            if (product.min_qty) {
                setQty(product.min_qty);
            }
        }
    }, [product, category]);

    if (!isOpen || !product) return null;

    const logicType = category?.logic_type || 'UNIT';
    const inputMode = product.input_mode || logicType; // Gen 2 input_mode takes precedence

    // GEN 2: Wholesale Price Tier Lookup
    const getTieredPrice = (quantity) => {
        if (!product.calc_engine || product.calc_engine !== 'TIERED') return null;
        if (!product.advanced_features?.wholesale_rules) return null;

        const tier = product.advanced_features.wholesale_rules.find(
            rule => quantity >= rule.min && quantity <= rule.max
        );

        return tier?.price || product.base_price || 0;
    };

    // Calculate preview price
    const getPreview = () => {
        // GEN 2: AREA with Variants (Spanduk)
        if (inputMode === 'AREA' && product.variants && selectedVariant) {
            const lengthVal = parseFloat(length) || 0;
            const widthVal = parseFloat(width) || 0;
            const area = lengthVal * widthVal;
            let basePrice = area * selectedVariant.price;

            // Add finishing groups (per m² for AREA)
            Object.values(finishingGroupSelections).forEach(selection => {
                if (selection && selection.price) {
                    basePrice += selection.price * area;
                }
            });

            return { subtotal: basePrice * qty };
        }

        // GEN 2: MATRIX with nested price_list (Poster)
        if (inputMode === 'MATRIX' && selectedVariant && selectedVariant.price_list && sizeKey) {
            const unitPrice = selectedVariant.price_list[sizeKey] || 0;
            let total = unitPrice * qty;

            // Add finishing groups (per unit for MATRIX)
            Object.values(finishingGroupSelections).forEach(selection => {
                if (selection && selection.price) {
                    total += selection.price * qty;
                }
            });

            return { subtotal: total, unitPrice };
        }

        // GEN 2: LINEAR with Variants (Kain & Stiker)
        if (inputMode === 'LINEAR' && product.variants && selectedVariant) {
            const lengthVal = parseFloat(length) || 0;
            // Support both flat variants (price_per_meter) and nested (child option)
            const price = selectedVariant.price_per_meter || selectedVariant.price || 0;
            let basePrice = lengthVal * price;

            // Add finishing groups (per meter for LINEAR)
            Object.values(finishingGroupSelections).forEach(selection => {
                if (selection && selection.price) {
                    basePrice += selection.price * lengthVal; // Per meter
                }
            });

            return { subtotal: basePrice * qty };
        }

        // GEN 2: TIERED Pricing (Wholesale Rules)
        if (product.calc_engine === 'TIERED') {
            const unitPrice = getTieredPrice(qty);
            let total = unitPrice * qty;

            // Add finishing groups (per unit for TIERED)
            Object.values(finishingGroupSelections).forEach(selection => {
                if (selection && selection.price) {
                    total += selection.price * qty;
                }
            });

            return { subtotal: total, unitPrice };
        }

        // Fallback to legacy calculation
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
        // GEN 2: AREA with Variants
        if (inputMode === 'AREA' && product.variants) {
            const hasVariant = selectedVariant !== null;
            const hasLength = parseFloat(length) > 0;
            const hasWidth = parseFloat(width) > 0;
            return product && hasVariant && hasLength && hasWidth && qty > 0;
        }

        // GEN 2: MATRIX with nested price_list
        if (inputMode === 'MATRIX' && product.variants && product.variants[0]?.price_list) {
            const hasVariant = selectedVariant !== null;
            const hasSize = sizeKey !== null;
            return product && hasVariant && hasSize && qty > 0;
        }

        // GEN 2: LINEAR with Variants
        if (inputMode === 'LINEAR' && product.variants) {
            const hasVariant = selectedVariant !== null;
            const hasLength = parseFloat(length) > 0;
            const hasQty = qty > 0;
            return product && hasVariant && hasLength && hasQty;
        }

        // GEN 2: TIERED
        if (product.calc_engine === 'TIERED') {
            const meetsMinOrder = product.min_qty ? qty >= product.min_qty : true;
            return product && qty > 0 && meetsMinOrder;
        }

        // Legacy validation
        switch (logicType) {
            case 'AREA': return product && parseFloat(length) > 0 && parseFloat(width) > 0;
            case 'LINEAR': return product && parseFloat(length) > 0;
            case 'MATRIX': return product && sizeKey;
            case 'MANUAL': return product && parseFloat(manualPrice) > 0;
            default: return product && qty > 0;
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
            finishings: selectedFinishings,
            // Gen 2 Metadata
            selectedVariant: selectedVariant, // Important for receipt
            selectedMaterial: selectedMaterial // Important for receipt (Sticker Parent)
        });

        onClose();
    };

    // Toggle finishing selection
    const toggleFinishing = (finishing) => {
        setSelectedFinishings(prev => {
            const exists = prev.find(f => f.id === finishing.id);
            if (exists) return prev.filter(f => f.id !== finishing.id);
            return [...prev, finishing];
        });
    };

    // STYLES
    const styles = {
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modal: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)' },
        header: { marginBottom: '20px' },
        productName: { fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '4px' },
        subtitle: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' },
        section: { background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' },
        sectionLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' },
        inputRow: { display: 'flex', gap: '12px', marginBottom: '12px' },
        inputGroup: { flex: 1 },
        label: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' },
        input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)', background: 'rgba(30, 41, 59, 0.8)', color: 'white', fontSize: '16px', fontWeight: '600', textAlign: 'center' },
        sizeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
        sizeBtn: (isActive) => ({ padding: '12px', borderRadius: '10px', border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)', background: isActive ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(30, 41, 59, 0.8)', color: 'white', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none' }),
        qtyControl: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' },
        qtyBtn: { width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(100, 116, 139, 0.3)', background: 'rgba(30, 41, 59, 0.8)', color: 'white', fontSize: '20px', cursor: 'pointer' },
        qtyValue: { fontSize: '24px', fontWeight: '800', color: 'white', minWidth: '60px', textAlign: 'center' },
        finishingGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
        finishingBtn: (isActive) => ({ padding: '8px 12px', borderRadius: '8px', border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)', background: isActive ? '#10b981' : 'rgba(30, 41, 59, 0.8)', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }),
        footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' },
        totalSection: { textAlign: 'left' },
        totalLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' },
        totalValue: { fontSize: '24px', fontWeight: '800', color: '#22c55e' },
        actions: { display: 'flex', gap: '10px' },
        btnCancel: { padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(100, 116, 139, 0.3)', background: 'transparent', color: '#94a3b8', fontWeight: '600', cursor: 'pointer' },
        btnConfirm: { padding: '12px 24px', borderRadius: '10px', border: 'none', background: canSubmit() ? 'linear-gradient(135deg, #059669, #10b981)' : '#475569', color: 'white', fontWeight: '700', cursor: canSubmit() ? 'pointer' : 'not-allowed', boxShadow: canSubmit() ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none' }
    };

    // Render specific inputs based on logic type
    const renderSpecificInputs = () => {
        switch (inputMode) {
            case 'AREA':
                // GEN 2: AREA (Spanduk)
                if (product.variants && product.variants.length > 0) {
                    return (
                        <>
                            <div>
                                <label style={styles.label}>Pilih Material</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(variant => (
                                        <button
                                            key={variant.label}
                                            onClick={() => setSelectedVariant(variant)}
                                            style={styles.sizeBtn(selectedVariant?.label === variant.label)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{variant.label}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
                                                {formatRupiah(variant.price)}/m²
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ ...styles.inputRow, marginTop: '12px' }}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Panjang (meter)</label>
                                    <input type="number" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} style={styles.input} placeholder="0.00" autoFocus />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Lebar (meter)</label>
                                    <input type="number" step="0.01" value={width} onChange={(e) => setWidth(e.target.value)} style={styles.input} placeholder="0.00" />
                                </div>
                            </div>
                        </>
                    );
                }
                // Legacy AREA
                return (
                    <div style={styles.inputRow}>
                        <div style={styles.inputGroup}><label style={styles.label}>Panjang</label><input type="number" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} style={styles.input} /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Lebar</label><input type="number" step="0.01" value={width} onChange={(e) => setWidth(e.target.value)} style={styles.input} /></div>
                    </div>
                );

            case 'LINEAR':
                // Check if this is a NESTED Gen 2 product (Sticker: Material -> Width)
                const isNested = product.variants && product.variants.length > 0 && product.variants[0].options;

                if (isNested) {
                    return (
                        <>
                            {/* Step 1: Material Selector */}
                            <div>
                                <label style={styles.label}>1. Pilih Bahan</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(material => (
                                        <button
                                            key={material.label}
                                            onClick={() => {
                                                setSelectedMaterial(material);
                                                setSelectedVariant(null); // Reset child selection
                                            }}
                                            style={styles.sizeBtn(selectedMaterial?.label === material.label)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{material.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Width Selector (Shown only after material selected) */}
                            {selectedMaterial && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={styles.label}>2. Pilih Lebar</label>
                                    <div style={styles.sizeGrid}>
                                        {selectedMaterial.options.map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => setSelectedVariant(opt)}
                                                style={styles.sizeBtn(selectedVariant?.label === opt.label)}
                                            >
                                                <div style={{ fontSize: '14px' }}>{opt.label}</div>
                                                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                                                    {formatRupiah(opt.price_per_meter)}/m
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Length Input (Shown only after width selected) */}
                            {selectedVariant && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={styles.label}>3. Panjang Cetak (meter)</label>
                                    <input
                                        type="number"
                                        step={product.step_qty || 0.5}
                                        value={length}
                                        onChange={(e) => setLength(e.target.value)}
                                        style={styles.input}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </>
                    );
                }

                // GEN 2: FLAT LINEAR (Kain)
                if (product.variants && product.variants.length > 0) {
                    return (
                        <>
                            <div>
                                <label style={styles.label}>Pilih Lebar Material</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(variant => (
                                        <button
                                            key={variant.label}
                                            onClick={() => setSelectedVariant(variant)}
                                            style={styles.sizeBtn(selectedVariant?.label === variant.label)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{variant.label}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
                                                {formatRupiah(variant.price_per_meter)}/m
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <label style={styles.label}>Panjang Cetak (meter)</label>
                                <input type="number" step="0.5" value={length} onChange={(e) => setLength(e.target.value)} style={styles.input} placeholder="0.00" autoFocus />
                            </div>
                        </>
                    );
                }

                // Legacy LINEAR
                return (<div style={styles.inputGroup}><label style={styles.label}>Panjang (meter)</label><input type="number" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} style={styles.input} /></div>);

            case 'MATRIX':
                // GEN 2 MATRIX (Poster)
                if (product.variants && product.variants[0].price_list) {
                    return (
                        <>
                            <div>
                                <label style={styles.label}>Pilih Material</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(variant => (
                                        <button
                                            key={variant.label}
                                            onClick={() => { setSelectedVariant(variant); setSizeKey(null); }}
                                            style={styles.sizeBtn(selectedVariant?.label === variant.label)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{variant.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedVariant && selectedVariant.price_list && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={styles.label}>Pilih Ukuran</label>
                                    <div style={styles.sizeGrid}>
                                        {Object.keys(selectedVariant.price_list).map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSizeKey(size)}
                                                style={styles.sizeBtn(sizeKey === size)}
                                            >
                                                <div style={{ fontSize: '14px' }}>{size}</div>
                                                <div style={{ fontSize: '11px', opacity: 0.7 }}>{formatRupiah(selectedVariant.price_list[size])}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    );
                }
                // Legacy MATRIX
                return (<div><label style={styles.label}>Pilih Ukuran</label><div style={styles.sizeGrid}>{product.prices && Object.keys(product.prices).map(key => (<button key={key} onClick={() => setSizeKey(key)} style={styles.sizeBtn(sizeKey === key)}>{key}</button>))}</div></div>);

            case 'MANUAL':
                return (<div style={styles.inputGroup}><label style={styles.label}>Harga Manual</label><input type="number" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} style={styles.input} /></div>);

            default: return null;
        }
    };

    // Advanced Form Render
    if (product.pricing_model === 'ADVANCED') {
        const advancedModalContent = (
            <div style={styles.overlay} onClick={onClose}>
                <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                    <AdvancedProductForm
                        product={product}
                        onSubmit={(formPayload) => {
                            onAddToCart({ ...formPayload, product });
                            onClose();
                        }}
                    />
                </div>
            </div>
        );
        return createPortal(advancedModalContent, document.body);
    }

    // Main Render
    const modalContent = (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.subtitle}>Spesifikasi Produk</div>
                </div>
                <div style={styles.section}>
                    <div style={styles.sectionLabel}>📐 Spesifikasi</div>
                    {renderSpecificInputs()}
                    {!(inputMode === 'LINEAR' && product.variants && product.variants.length > 0) && (
                        <div style={{ marginTop: '16px' }}>
                            <label style={styles.label}>Jumlah (Qty)</label>
                            <div style={styles.qtyControl}>
                                <button style={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                                <span style={styles.qtyValue}>{qty}</span>
                                <button style={styles.qtyBtn} onClick={() => setQty(qty + 1)}>+</button>
                            </div>
                        </div>
                    )}
                </div>
                {product.finishing_groups && product.finishing_groups.length > 0 && (
                    <div style={styles.section}>
                        <div style={styles.sectionLabel}>✨ Finishing / Opsi Tambahan</div>
                        {product.finishing_groups.map(group => (
                            <div key={group.id} style={{ marginBottom: '16px' }}>
                                <label style={{ ...styles.label, marginBottom: '8px', display: 'block' }}>{group.title}</label>
                                <div style={styles.finishingGrid}>
                                    {group.options.map(opt => {
                                        const isSelected = finishingGroupSelections[group.id]?.label === opt.label;
                                        return (
                                            <button
                                                key={opt.label}
                                                onClick={() => setFinishingGroupSelections({ ...finishingGroupSelections, [group.id]: opt })}
                                                style={styles.finishingBtn(isSelected)}
                                            >
                                                {opt.label} {opt.price > 0 && `+${formatRupiah(opt.price)}`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={styles.footer}>
                    <div style={styles.totalSection}>
                        <div style={styles.totalLabel}>Total Harga</div>
                        <div style={styles.totalValue}>{formatRupiah(preview.subtotal || 0)}</div>
                    </div>
                    <div style={styles.actions}>
                        <button style={styles.btnCancel} onClick={onClose}>Batal</button>
                        <button style={styles.btnConfirm} onClick={handleSubmit} disabled={!canSubmit()}>🛒 Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}