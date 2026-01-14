/**
 * ProductConfigModal - Dynamic Specification Modal (GEN 3.2 FINAL)
 * Supports: AREA, LINEAR (Flat/Nested), MATRIX, UNIT (With Variants)
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

    // GEN 2/3 State
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
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

            // Auto-select logic
            const isNested = product.variants && product.variants.length > 0 && product.variants[0].options;

            // For UNIT & FLAT LINEAR: Auto-select first variant
            if ((product.input_mode === 'UNIT' || product.input_mode === 'LINEAR') &&
                product.variants && product.variants.length > 0 && !isNested) {
                setSelectedVariant(product.variants[0]);
            }

            if (product.min_qty) setQty(product.min_qty);
        }
    }, [product, category]);

    if (!isOpen || !product) return null;

    const logicType = category?.logic_type || 'UNIT';
    const inputMode = product.input_mode || logicType;

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
        let baseTotal = 0;
        let unitPrice = 0;

        // 1. AREA (Spanduk)
        if (inputMode === 'AREA' && product.variants && selectedVariant) {
            const area = (parseFloat(length) || 0) * (parseFloat(width) || 0);
            let pricePerM2 = selectedVariant.price;

            // Add finishing (per m2)
            Object.values(finishingGroupSelections).forEach(sel => {
                if (sel?.price) pricePerM2 += sel.price;
            });

            baseTotal = pricePerM2 * area * qty;
            return { subtotal: baseTotal };
        }

        // 2. MATRIX (Poster)
        if (inputMode === 'MATRIX' && selectedVariant && selectedVariant.price_list && sizeKey) {
            unitPrice = selectedVariant.price_list[sizeKey] || 0;
            baseTotal = unitPrice * qty;

            // Add finishing (per unit)
            Object.values(finishingGroupSelections).forEach(sel => {
                if (sel?.price) baseTotal += sel.price * qty;
            });
            return { subtotal: baseTotal, unitPrice };
        }

        // 3. LINEAR (Stiker/Kain)
        if (inputMode === 'LINEAR' && product.variants && selectedVariant) {
            const len = parseFloat(length) || 0;
            const pricePerM = selectedVariant.price_per_meter || selectedVariant.price || 0;
            let totalPerM = pricePerM;

            // Add finishing (per meter)
            Object.values(finishingGroupSelections).forEach(sel => {
                if (sel?.price) totalPerM += sel.price;
            });

            baseTotal = totalPerM * len * qty;
            return { subtotal: baseTotal };
        }

        // 4. UNIT / TIERED (Office Products)
        if (inputMode === 'UNIT' || product.calc_engine === 'TIERED') {
            // Priority: Selected Variant Price > Tiered Price > Base Price
            let baseUnit = 0;

            if (selectedVariant) {
                baseUnit = selectedVariant.price;
            } else {
                baseUnit = getTieredPrice(qty) || product.base_price || 0;
            }

            baseTotal = baseUnit * qty;

            // Add finishing (per unit)
            Object.values(finishingGroupSelections).forEach(sel => {
                if (sel?.price) baseTotal += sel.price * qty;
            });

            return { subtotal: baseTotal, unitPrice: baseUnit };
        }

        // Legacy Fallback
        if (calculatePreview) {
            return calculatePreview({
                product, qty, dimensions: { length: parseFloat(length) || 0, width: parseFloat(width) || 0, sizeKey },
                manualPrice: parseFloat(manualPrice) || 0, finishings: selectedFinishings
            });
        }
        return { subtotal: 0 };
    };

    const preview = getPreview();

    // Validation
    const canSubmit = () => {
        if (inputMode === 'AREA' && product.variants) return selectedVariant && parseFloat(length) > 0 && parseFloat(width) > 0;
        if (inputMode === 'MATRIX' && product.variants) return selectedVariant && sizeKey;
        if (inputMode === 'LINEAR' && product.variants) return selectedVariant && parseFloat(length) > 0;
        if (inputMode === 'UNIT') return qty > 0 && (product.variants ? selectedVariant : true);
        return qty > 0;
    };

    const handleSubmit = () => {
        if (!canSubmit()) return;
        onAddToCart({
            product, qty,
            dimensions: { length: parseFloat(length) || 0, width: parseFloat(width) || 0, sizeKey },
            manualPrice: parseFloat(manualPrice) || 0,
            finishings: selectedFinishings,
            selectedVariant, selectedMaterial,
            finishingGroupSelections // Pass this for receipt details
        });
        onClose();
    };

    // Render Specific Inputs
    const renderSpecificInputs = () => {
        switch (inputMode) {
            case 'AREA': // Spanduk
                return (
                    <>
                        {product.variants && (
                            <div>
                                <label style={styles.label}>Pilih Material</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(v => (
                                        <button key={v.label} onClick={() => setSelectedVariant(v)} style={styles.sizeBtn(selectedVariant?.label === v.label)}>
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{v.label}</div>
                                            {v.specs && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: selectedVariant?.label === v.label ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                                                    marginTop: '4px',
                                                    marginBottom: '4px',
                                                    fontStyle: 'italic',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {v.specs}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{formatRupiah(v.price)}/m²</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div style={{ ...styles.inputRow, marginTop: '12px' }}>
                            <div style={styles.inputGroup}><label style={styles.label}>Panjang (m)</label><input type="number" value={length} onChange={e => setLength(e.target.value)} style={styles.input} autoFocus /></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Lebar (m)</label><input type="number" value={width} onChange={e => setWidth(e.target.value)} style={styles.input} /></div>
                        </div>
                    </>
                );

            case 'LINEAR': // Stiker/Kain
                const isNested = product.variants?.[0]?.options;
                if (isNested) {
                    return (
                        <>
                            <div><label style={styles.label}>1. Pilih Bahan</label><div style={styles.sizeGrid}>{product.variants.map(m => (
                                <button key={m.label} onClick={() => { setSelectedMaterial(m); setSelectedVariant(null) }} style={styles.sizeBtn(selectedMaterial?.label === m.label)}>
                                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{m.label}</div>
                                    {m.specs && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: selectedMaterial?.label === m.label ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                                            marginTop: '4px',
                                            fontStyle: 'italic'
                                        }}>
                                            {m.specs}
                                        </div>
                                    )}
                                </button>
                            ))}</div></div>
                            {selectedMaterial && <div style={{ marginTop: '12px' }}><label style={styles.label}>2. Pilih Lebar</label><div style={styles.sizeGrid}>{selectedMaterial.options.map(o => (<button key={o.label} onClick={() => setSelectedVariant(o)} style={styles.sizeBtn(selectedVariant?.label === o.label)}><div style={{ fontSize: '14px' }}>{o.label}</div><div style={{ fontSize: '10px' }}>{formatRupiah(o.price_per_meter)}/m</div></button>))}</div></div>}
                            {selectedVariant && <div style={{ marginTop: '12px' }}><label style={styles.label}>3. Panjang (m)</label><input type="number" value={length} onChange={e => setLength(e.target.value)} style={styles.input} autoFocus /></div>}
                        </>
                    );
                }
                return (
                    <>
                        {product.variants && <div><label style={styles.label}>Pilih Varian</label><div style={styles.sizeGrid}>{product.variants.map(v => (<button key={v.label} onClick={() => setSelectedVariant(v)} style={styles.sizeBtn(selectedVariant?.label === v.label)}><div style={{ fontSize: '13px', fontWeight: '700' }}>{v.label}</div><div style={{ fontSize: '10px' }}>{formatRupiah(v.price_per_meter)}/m</div></button>))}</div></div>}
                        <div style={{ marginTop: '12px' }}><label style={styles.label}>Panjang (m)</label><input type="number" value={length} onChange={e => setLength(e.target.value)} style={styles.input} autoFocus /></div>
                    </>
                );

            case 'MATRIX': // Poster / Nota NCR
                return (
                    <>
                        {product.variants?.[0]?.price_list && (
                            <>
                                <div><label style={styles.label}>Pilih Material / Tipe</label><div style={styles.sizeGrid}>{product.variants.map(v => (
                                    <button key={v.label} onClick={() => { setSelectedVariant(v); setSizeKey(null) }} style={styles.sizeBtn(selectedVariant?.label === v.label)}>
                                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{v.label}</div>
                                        {v.specs && (
                                            <div style={{
                                                fontSize: '10px',
                                                color: selectedVariant?.label === v.label ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                                                marginTop: '4px',
                                                marginBottom: '4px',
                                                fontStyle: 'italic',
                                                lineHeight: '1.3'
                                            }}>
                                                {v.specs}
                                            </div>
                                        )}
                                    </button>
                                ))}</div></div>
                                {selectedVariant && <div style={{ marginTop: '12px' }}><label style={styles.label}>Pilih Ukuran</label><div style={styles.sizeGrid}>{Object.keys(selectedVariant.price_list).map(s => (<button key={s} onClick={() => setSizeKey(s)} style={styles.sizeBtn(sizeKey === s)}><div style={{ fontSize: '14px' }}>{s}</div><div style={{ fontSize: '11px' }}>{formatRupiah(selectedVariant.price_list[s])}</div></button>))}</div></div>}
                            </>
                        )}
                    </>
                );

            case 'UNIT': // OFFICE (Nota, Yasin, dll)
                return (
                    <>
                        {product.variants && product.variants.length > 0 && (
                            <div>
                                <label style={styles.label}>Pilih Tipe / Varian</label>
                                <div style={styles.sizeGrid}>
                                    {product.variants.map(v => (
                                        <button
                                            key={v.label}
                                            onClick={() => setSelectedVariant(v)}
                                            style={styles.sizeBtn(selectedVariant?.label === v.label)}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '700' }}>{v.label}</div>

                                            {/* Specs Subtitle */}
                                            {v.specs && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: selectedVariant?.label === v.label ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                                                    marginTop: '4px',
                                                    marginBottom: '4px',
                                                    fontStyle: 'italic',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {v.specs}
                                                </div>
                                            )}

                                            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                                                {formatRupiah(v.price)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Jika TIERED tapi tidak ada variants (misal Nota Grosir doang), tampilkan info */}
                        {product.calc_engine === 'TIERED' && !product.variants && (
                            <div style={{ marginBottom: '10px', color: '#22c55e', fontSize: '12px', fontStyle: 'italic' }}>
                                * Harga Grosir aktif (makin banyak makin murah)
                            </div>
                        )}
                    </>
                );

            case 'MANUAL':
                return (<div style={styles.inputGroup}><label style={styles.label}>Harga Manual</label><input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} style={styles.input} /></div>);

            default: return null;
        }
    };

    // STYLES (Compressed for brevity, functionality remains)
    const styles = {
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modal: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)' },
        header: { marginBottom: '20px' }, productName: { fontSize: '20px', fontWeight: '800', color: 'white' }, subtitle: { fontSize: '12px', color: '#64748b' },
        section: { background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' },
        sectionLabel: { fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase' },
        inputRow: { display: 'flex', gap: '12px' }, inputGroup: { flex: 1 }, label: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' },
        input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)', background: 'rgba(30, 41, 59, 0.8)', color: 'white', textAlign: 'center', fontSize: '16px' },
        sizeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }, // 2 Columns for text variants
        sizeBtn: (isActive) => ({ padding: '12px', borderRadius: '10px', border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)', background: isActive ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(30, 41, 59, 0.8)', color: 'white', cursor: 'pointer', textAlign: 'center' }),
        qtyControl: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }, qtyBtn: { width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.8)', color: 'white', border: '1px solid rgba(100,116,139,0.3)', cursor: 'pointer' },
        finishingGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, finishingBtn: (isActive) => ({ padding: '8px 12px', borderRadius: '8px', border: isActive ? 'none' : '1px solid rgba(100, 116, 139, 0.3)', background: isActive ? '#10b981' : 'rgba(30, 41, 59, 0.8)', color: 'white', fontSize: '12px', cursor: 'pointer' }),
        footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' },
        totalValue: { fontSize: '24px', fontWeight: '800', color: '#22c55e' },
        btnConfirm: { padding: '12px 24px', borderRadius: '10px', border: 'none', background: canSubmit() ? 'linear-gradient(135deg, #059669, #10b981)' : '#475569', color: 'white', fontWeight: '700', cursor: canSubmit() ? 'pointer' : 'not-allowed' },
        btnCancel: { background: 'transparent', border: '1px solid #64748b', color: '#94a3b8', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer' }
    };

    return createPortal(
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}><div style={styles.productName}>{product.name}</div><div style={styles.subtitle}>Spesifikasi Produk</div></div>

                <div style={styles.section}>
                    <div style={styles.sectionLabel}>📐 Spesifikasi</div>
                    {renderSpecificInputs()}
                    {!(inputMode === 'LINEAR' && isNested) && (
                        <div style={{ marginTop: '16px' }}>
                            <label style={styles.label}>Jumlah (Qty)</label>
                            <div style={styles.qtyControl}>
                                <button style={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                                <span style={{ fontSize: '24px', fontWeight: '800', color: 'white', minWidth: '60px', textAlign: 'center' }}>{qty}</span>
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
                                <label style={{ ...styles.label, marginBottom: '8px' }}>{group.title}</label>
                                <div style={styles.finishingGrid}>
                                    {group.options.map(opt => {
                                        const isSelected = finishingGroupSelections[group.id]?.label === opt.label;
                                        return (
                                            <button key={opt.label} onClick={() => setFinishingGroupSelections({ ...finishingGroupSelections, [group.id]: opt })} style={styles.finishingBtn(isSelected)}>
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
                    <div><div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL HARGA</div><div style={styles.totalValue}>{formatRupiah(preview.subtotal || 0)}</div></div>
                    <div style={{ display: 'flex', gap: '10px' }}><button style={styles.btnCancel} onClick={onClose}>Batal</button><button style={styles.btnConfirm} onClick={handleSubmit} disabled={!canSubmit()}>🛒 Simpan</button></div>
                </div>
            </div>
        </div>,
        document.body
    );
}