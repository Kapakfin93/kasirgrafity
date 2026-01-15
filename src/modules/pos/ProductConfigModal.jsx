import React, { useState, useEffect, useMemo } from 'react';
import { X, ShoppingCart, Info, FileText, Check } from 'lucide-react';

export default function ProductConfigModal({ isOpen, onClose, product, onAddToCart }) {
    const [qty, setQty] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [matrixSelection, setMatrixSelection] = useState({ step1: null, step2: null });
    const [selectedFinishings, setSelectedFinishings] = useState({});
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && product) {
            setQty(product.min_qty || 1);
            setNotes('');
            setSelectedFinishings({});
            if (product.input_mode === 'UNIT' && product?.variants?.length > 0) {
                setSelectedVariant(product.variants[0]);
            }
            if (product.input_mode === 'MATRIX') {
                setMatrixSelection({ step1: null, step2: null });
            }
        }
    }, [isOpen, product]);

    const safeProduct = product || {};
    const isMatrix = safeProduct.input_mode === 'MATRIX';

    const currentBasePrice = useMemo(() => {
        if (!product) return 0;
        if (isMatrix) {
            if (!matrixSelection.step1) return safeProduct?.base_price || 0;
            const variant1 = safeProduct?.variants?.find(v => v.label === matrixSelection.step1);
            if (!variant1) return safeProduct?.base_price || 0;
            if (matrixSelection.step2 && variant1?.price_list) {
                return variant1.price_list[matrixSelection.step2] || safeProduct?.base_price || 0;
            }
            return safeProduct?.base_price || 0;
        } else {
            return selectedVariant ? (selectedVariant?.price || safeProduct?.base_price || 0) : (safeProduct?.base_price || 0);
        }
    }, [product, isMatrix, selectedVariant, matrixSelection, safeProduct]);

    const getTieredPrice = (base, quantity) => {
        if (!safeProduct.advanced_features?.wholesale_rules) return base;
        const rules = safeProduct.advanced_features.wholesale_rules;
        const rule = rules.find(r => quantity >= r.min && quantity <= r.max);
        return rule ? rule.price : base;
    };

    const finalUnitPrice = getTieredPrice(currentBasePrice, qty);

    const finishingTotal = useMemo(() => {
        if (!safeProduct?.finishing_groups) return 0;
        let total = 0;
        safeProduct.finishing_groups.forEach(group => {
            const selected = selectedFinishings[group?.id];
            if (selected) {
                if (Array.isArray(selected)) {
                    selected.forEach(optLabel => {
                        const opt = group?.options?.find(o => o.label === optLabel);
                        if (opt) total += opt?.price || 0;
                    });
                } else {
                    const opt = group?.options?.find(o => o.label === selected);
                    if (opt) total += opt?.price || 0;
                }
            }
        });
        return total;
    }, [safeProduct, selectedFinishings]);

    const grandTotal = (finalUnitPrice + finishingTotal) * qty;

    const handleFinishingChange = (groupId, type, value) => {
        setSelectedFinishings(prev => {
            if (type === 'radio') {
                return { ...prev, [groupId]: value };
            } else {
                const curr = prev[groupId] || [];
                return {
                    ...prev,
                    [groupId]: curr.includes(value) ? curr.filter(x => x !== value) : [...curr, value]
                };
            }
        });
    };

    const handleSave = () => {
        if (isMatrix && (!matrixSelection.step1 || !matrixSelection.step2)) {
            alert("Mohon lengkapi pilihan varian (Langkah 1 & 2)");
            return;
        }

        const details = {
            variant: isMatrix ? `${matrixSelection.step1} | ${matrixSelection.step2}` : selectedVariant?.label || 'Standard',
            finishings: selectedFinishings,
            unitPrice: finalUnitPrice,
            basePriceOriginal: currentBasePrice,
            notes: notes
        };

        // Build prices object for MATRIX mode (cart validator needs this)
        let pricesObj = null;
        if (isMatrix && safeProduct.variants) {
            const firstVariant = safeProduct.variants[0];
            if (firstVariant?.price_list) {
                pricesObj = firstVariant.price_list;
            }
        }

        // Build finishings array for cart validator
        const finishingsArray = [];
        if (safeProduct?.finishing_groups) {
            safeProduct.finishing_groups.forEach(group => {
                const selected = selectedFinishings[group?.id];
                if (selected) {
                    if (Array.isArray(selected)) {
                        selected.forEach(optLabel => {
                            const opt = group?.options?.find(o => o.label === optLabel);
                            if (opt) finishingsArray.push({ id: opt.label, name: opt.label, price: opt.price || 0 });
                        });
                    } else {
                        const opt = group?.options?.find(o => o.label === selected);
                        if (opt) finishingsArray.push({ id: opt.label, name: opt.label, price: opt.price || 0 });
                    }
                }
            });
        }

        // CRITICAL FIX: Complete data contract for useTransaction validator
        onAddToCart({
            product: {
                ...safeProduct,
                price: finalUnitPrice + finishingTotal,
                prices: pricesObj,
                pricing_model: safeProduct.input_mode === 'MATRIX' ? 'MATRIX' : 'UNIT'
            },
            qty,
            dimensions: isMatrix ? { sizeKey: matrixSelection.step2 } : {},
            finishings: finishingsArray,
            final_price: finalUnitPrice + finishingTotal,
            selected_details: details
        });
        onClose();
    };

    if (!isOpen || !product) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)', padding: '1rem' }}>
            <div style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: '1200px', borderRadius: '2rem', border: '1px solid rgba(148,163,184,0.3)', boxShadow: '0 0 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'row', height: '90vh', overflow: 'hidden' }}>

                {/* LEFT COLUMN: OPTIONS */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    <header style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(148,163,184,0.1)', paddingBottom: '1.5rem' }}>
                        <span style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: 'rgba(6,182,212,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(6,182,212,0.3)', marginBottom: '0.75rem', display: 'inline-block' }}>
                            {product.categoryId?.replace('_', ' ')}
                        </span>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'white' }}>{product.name}</h2>
                    </header>

                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '1rem', height: '2px', backgroundColor: '#06b6d4' }}></span> Pilih Tipe & Spesifikasi
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            {isMatrix ? (
                                product.variants?.map((v, i) => {
                                    const isSelected = matrixSelection.step1 === v.label;
                                    return (
                                        <button key={i} onClick={() => setMatrixSelection(prev => ({ ...prev, step1: v.label, step2: null }))}
                                            style={{ padding: '1.25rem', borderRadius: '1.5rem', border: isSelected ? '2px solid #06b6d4' : '2px solid #1e293b', textAlign: 'left', transition: 'all 0.3s', backgroundColor: isSelected ? '#1e293b' : 'rgba(30,41,59,0.2)', cursor: 'pointer', position: 'relative' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: isSelected ? 'white' : '#94a3b8' }}>{v.label}</div>
                                            {v.specs && <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem', color: '#64748b' }}>{v.specs}</div>}
                                            {isSelected && <Check size={20} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: '#06b6d4' }} />}
                                        </button>
                                    )
                                })
                            ) : (
                                product.variants?.map((v, i) => {
                                    const isSelected = selectedVariant?.label === v.label;
                                    return (
                                        <button key={i} onClick={() => setSelectedVariant(v)}
                                            style={{ padding: '1.25rem', borderRadius: '1.5rem', border: isSelected ? '2px solid #06b6d4' : '2px solid #1e293b', textAlign: 'left', transition: 'all 0.3s', backgroundColor: isSelected ? '#1e293b' : 'rgba(30,41,59,0.2)', cursor: 'pointer', position: 'relative' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: isSelected ? 'white' : '#94a3b8' }}>{v.label}</div>
                                            {v.specs && <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem', color: '#64748b' }}>{v.specs}</div>}
                                            <div style={{ marginTop: '0.75rem', fontWeight: 'bold', color: '#22d3ee' }}>Rp {v.price?.toLocaleString()}</div>
                                            {isSelected && <Check size={20} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: '#06b6d4' }} />}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* MATRIX STEP 2 */}
                    {isMatrix && matrixSelection.step1 && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Pilih Ukuran / Detail</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                {Object.keys(product.variants?.find(v => v.label === matrixSelection.step1)?.price_list || {}).map((opt, i) => {
                                    const isSelected = matrixSelection.step2 === opt;
                                    const priceDisp = product.variants.find(v => v.label === matrixSelection.step1).price_list[opt];
                                    return (
                                        <button key={i} onClick={() => setMatrixSelection(prev => ({ ...prev, step2: opt }))}
                                            style={{ padding: '1rem', borderRadius: '1rem', border: isSelected ? '2px solid #10b981' : '2px solid #1e293b', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s', backgroundColor: isSelected ? '#1e293b' : 'rgba(30,41,59,0.2)', cursor: 'pointer' }}>
                                            <span style={{ fontWeight: 'bold', color: isSelected ? '#10b981' : '#94a3b8' }}>{opt}</span>
                                            <span style={{ fontSize: '0.75rem', backgroundColor: '#020617', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', color: '#64748b' }}>Rp {priceDisp?.toLocaleString()}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* FINISHING */}
                    {product.finishing_groups?.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '2rem' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Finishing & Opsi Tambahan</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {product.finishing_groups.map(group => (
                                    <div key={group.id}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '0.75rem' }}>{group.title}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {group.options?.map((opt, i) => {
                                                const isSelected = group.type === 'radio' ? selectedFinishings[group.id] === opt.label : selectedFinishings[group.id]?.includes(opt.label);
                                                return (
                                                    <button key={i} onClick={() => handleFinishingChange(group.id, group.type, opt.label)}
                                                        style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: isSelected ? '1px solid #06b6d4' : '1px solid #1e293b', fontSize: '0.875rem', transition: 'all 0.3s', backgroundColor: isSelected ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.3)', color: isSelected ? '#22d3ee' : '#64748b', cursor: 'pointer' }}>
                                                        {opt.label} {opt.price > 0 && <span style={{ marginLeft: '0.25rem', opacity: 0.6, fontSize: '0.625rem' }}>+{(opt.price / 1000)}k</span>}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: CALCULATION */}
                <div style={{ width: '420px', backgroundColor: '#020617', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid rgba(148,163,184,0.1)', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.5rem', color: '#64748b', backgroundColor: '#1e293b', borderRadius: '9999px', border: 'none', cursor: 'pointer', transition: 'color 0.3s' }}>
                        <X size={24} />
                    </button>

                    <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem', display: 'block' }}>Jumlah Order</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#1e293b', padding: '0.5rem', borderRadius: '1.5rem', border: '1px solid rgba(148,163,184,0.1)' }}>
                                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', backgroundColor: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                                <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ flex: 1, backgroundColor: 'transparent', textAlign: 'center', color: 'white', fontSize: '2rem', fontWeight: '900', border: 'none', outline: 'none' }} />
                                <button onClick={() => setQty(q => q + 1)} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', backgroundColor: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                            </div>
                        </div>

                        <div>
                            <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={14} /> Catatan Khusus
                            </label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Nama file, Nama punggung, Request warna..."
                                style={{ width: '100%', height: '8rem', backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '1.5rem', padding: '1rem', color: '#cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'none', transition: 'all 0.3s' }}></textarea>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(148,163,184,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Harga Dasar Satuan</span><span>Rp {finalUnitPrice.toLocaleString()}</span></div>
                            {finishingTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Ekstra Finishing</span><span style={{ color: '#22d3ee' }}>+ Rp {finishingTotal.toLocaleString()}</span></div>}
                        </div>
                        <div style={{ background: 'linear-gradient(to bottom right, #1e293b, #020617)', padding: '1.5rem', borderRadius: '1.75rem', border: '1px solid rgba(148,163,184,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                            <div style={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>Total Estimasi</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', background: 'linear-gradient(to right, #22d3ee, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Rp {grandTotal.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            <button onClick={onClose} style={{ padding: '1rem', borderRadius: '1.5rem', border: '1px solid #334155', color: '#94a3b8', fontWeight: 'bold', backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.3s' }}>Batal</button>
                            <button onClick={handleSave} disabled={isMatrix && (!matrixSelection.step1 || !matrixSelection.step2)} style={{ padding: '1rem', borderRadius: '1.5rem', background: 'linear-gradient(to right, #06b6d4, #10b981)', color: 'black', fontWeight: '900', fontSize: '1.125rem', boxShadow: '0 0 30px rgba(6,182,212,0.3)', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s' }}>
                                <ShoppingCart size={20} /> Simpan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}