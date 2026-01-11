/**
 * PosterConfigurator Component
 * Specialized configurator for Poster products
 * Flow: Size → Print Type (Indoor/UV) → Material → Quantity → Finishing
 */

import React, { useState } from 'react';
import { formatRupiah } from '../../../core/formatters';
import { ActionBar } from './shared/ActionBar';
import { finishings as allFinishings } from '../../../data';

export function PosterConfigurator({ category, onAddItem }) {
    // Get finishings for POSTER category
    const posterFinishings = allFinishings.filter(f => f.category_id === 'POSTER');

    // Create product object with finishings
    const product = {
        id: 'POSTER',
        name: 'Poster',
        categoryId: 'POSTER',
        finishings: posterFinishings
    };
    // Step 1: Size selection
    const sizes = [
        { id: 'A2', label: 'A2', dimensions: '42 × 59 cm' },
        { id: 'A1', label: 'A1', dimensions: '59 × 84 cm' },
        { id: 'A0', label: 'A0', dimensions: '84 × 118 cm' },
    ];

    // Step 2: Print type (Indoor or UV)
    const printTypes = [
        { id: 'indoor', label: 'Indoor', description: 'Untuk dalam ruangan' },
        { id: 'uv', label: 'UV', description: 'Tahan cuaca outdoor' },
    ];

    // Step 3: Materials (bahan) - depends on print type
    const materials = {
        indoor: [
            { id: 'albatros_indoor', label: 'Albatros' },
            { id: 'luster_indoor', label: 'Luster Photo' },
            { id: 'photopaper_indoor', label: 'Photopaper Premium' },
        ],
        uv: [
            { id: 'albatros_uv', label: 'Albatros UV' },
            { id: 'luster_uv', label: 'Luster UV' },
            { id: 'photopaper_uv', label: 'Photopaper UV' },
        ],
    };

    // Price matrix (Size × Print Type × Material)
    const priceMatrix = {
        indoor: {
            albatros_indoor: { A2: 25000, A1: 50000, A0: 100000 },
            luster_indoor: { A2: 30000, A1: 60000, A0: 120000 },
            photopaper_indoor: { A2: 35000, A1: 70000, A0: 140000 },
        },
        uv: {
            albatros_uv: { A2: 40000, A1: 75000, A0: 150000 },
            luster_uv: { A2: 45000, A1: 85000, A0: 170000 },
            photopaper_uv: { A2: 50000, A1: 95000, A0: 190000 },
        },
    };

    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedPrintType, setSelectedPrintType] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedFinishings, setSelectedFinishings] = useState([]);

    // Finishing functions
    const handleFinishingToggle = (finishingId) => {
        setSelectedFinishings(current => {
            if (current.includes(finishingId)) {
                return current.filter(id => id !== finishingId);
            } else {
                return [...current, finishingId];
            }
        });
    };

    const calculateFinishingCost = (qty) => {
        if (!product.finishings) return 0;
        const selectedFinishingObjs = product.finishings.filter(f => selectedFinishings.includes(f.id));
        return selectedFinishingObjs.reduce((sum, f) => sum + (f.price * qty), 0);
    };

    const getSelectedFinishingNames = () => {
        if (!product.finishings) return [];
        return product.finishings
            .filter(f => selectedFinishings.includes(f.id))
            .map(f => f.name);
    };

    // Calculate price
    const basePrice = selectedSize && selectedPrintType && selectedMaterial
        ? priceMatrix[selectedPrintType][selectedMaterial][selectedSize] || 0
        : 0;

    const finishingCost = calculateFinishingCost(quantity);
    const subtotal = (basePrice * quantity) + finishingCost;

    // Check if can submit
    const canSubmit = selectedSize && selectedPrintType && selectedMaterial && quantity > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;

        const sizeInfo = sizes.find(s => s.id === selectedSize);
        const printTypeInfo = printTypes.find(pt => pt.id === selectedPrintType);
        const materialInfo = materials[selectedPrintType].find(m => m.id === selectedMaterial);

        // ===== RAW DATA ONLY - NO PRICE CALCULATION =====
        const rawData = {
            product: {
                id: product.id,
                name: `${product.name} ${printTypeInfo.label} ${materialInfo.label}`,
                // NO price - buildCartItem will lookup from matrix
                priceMatrix: priceMatrix // Pass matrix for buildCartItem to lookup
            },
            qty: quantity,
            dimensions: {
                sizeKey: selectedSize, // RAW ID like 'A2', 'A3'
                printType: selectedPrintType,
                material: selectedMaterial
            },
            finishings: selectedFinishings.filter(id => id).map(id => {
                const f = product.finishings?.find(opt => opt.id === id);
                return f || null;
            }).filter(Boolean)
        };

        // Let buildCartItem handle ALL validation, matrix lookup, and description
        onAddItem(rawData);
    };

    return (
        <div className="configurator-container">
            <div className="configurator-content">
                {/* Header */}
                <div className="config-header">
                    <h2>{product.name}</h2>
                    <p className="config-description">Pilih ukuran, jenis print, dan bahan</p>
                </div>

                {/* Step 1: Size Selection */}
                <div className="config-section">
                    <h3>1. Pilih Ukuran</h3>
                    <div className="size-grid">
                        {sizes.map(size => (
                            <div
                                key={size.id}
                                className={`size-card ${selectedSize === size.id ? 'selected' : ''}`}
                                onClick={() => setSelectedSize(size.id)}
                            >
                                <div className="size-label">{size.label}</div>
                                <div className="size-dimensions">{size.dimensions}</div>
                                {selectedSize === size.id && <div className="check-mark">✓</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 2: Print Type */}
                {selectedSize && (
                    <div className="config-section">
                        <h3>2. Pilih Jenis Print</h3>
                        <div className="print-type-grid">
                            {printTypes.map(type => (
                                <div
                                    key={type.id}
                                    className={`print-type-card ${selectedPrintType === type.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedPrintType(type.id);
                                        setSelectedMaterial(null); // Reset material when changing print type
                                    }}
                                >
                                    <div className="print-type-label">{type.label}</div>
                                    <div className="print-type-desc">{type.description}</div>
                                    {selectedPrintType === type.id && <div className="check-mark">✓</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Material Selection */}
                {selectedPrintType && (
                    <div className="config-section">
                        <h3>3. Pilih Bahan</h3>
                        <div className="material-grid">
                            {materials[selectedPrintType].map(material => {
                                const price = priceMatrix[selectedPrintType][material.id][selectedSize];
                                return (
                                    <div
                                        key={material.id}
                                        className={`material-card ${selectedMaterial === material.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedMaterial(material.id)}
                                    >
                                        <div className="material-label">{material.label}</div>
                                        <div className="material-price">{formatRupiah(price)}/lembar</div>
                                        {selectedMaterial === material.id && <div className="check-mark">✓</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 4: Quantity */}
                {selectedMaterial && (
                    <div className="config-section">
                        <h3>4. Jumlah (Quantity)</h3>
                        <div className="quantity-input">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                            />
                            <button onClick={() => setQuantity(quantity + 1)}>+</button>
                            <span className="qty-label">lembar</span>
                        </div>
                    </div>
                )}

                {/* Step 5: Finishing (Optional) */}
                {selectedMaterial && product.finishings && product.finishings.length > 0 && (
                    <div className="config-section">
                        <h3>5. Finishing (Opsional)</h3>
                        <div className="finishing-grid">
                            {product.finishings.map(finishing => (
                                <div
                                    key={finishing.id}
                                    className={`finishing-card ${selectedFinishings.includes(finishing.id) ? 'selected' : ''}`}
                                    onClick={() => handleFinishingToggle(finishing.id)}
                                >
                                    <div className="finishing-name">{finishing.name}</div>
                                    <div className="finishing-price">+{formatRupiah(finishing.price)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Price Summary */}
                {selectedMaterial && (
                    <div className="price-summary">
                        <div className="summary-row">
                            <span>Harga Dasar ({quantity} lembar):</span>
                            <strong>{formatRupiah(basePrice * quantity)}</strong>
                        </div>
                        {finishingCost > 0 && (
                            <div className="summary-row">
                                <span>Finishing:</span>
                                <strong>{formatRupiah(finishingCost)}</strong>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span>TOTAL:</span>
                            <strong>{formatRupiah(subtotal)}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <ActionBar
                total={subtotal}
                breakdown={selectedMaterial ? `${quantity} lembar × ${formatRupiah(basePrice)}` : ''}
                canAdd={canSubmit}
                onAdd={handleSubmit}
            />
        </div>
    );
}
