/**
 * TextileConfigurator Component
 * Specialized configurator for Textile/Kain products
 * Flow: Jenis Kain → Width → Panjang → Finishing
 */

import React, { useState } from 'react';
import { formatRupiah } from '../../../core/formatters';
import { ActionBar } from './shared/ActionBar';
import { finishings as allFinishings } from '../../../data';

export function TextileConfigurator({ category, onAddItem }) {
    // Get finishings for TEXTILE category
    const textileFinishings = allFinishings.filter(f => f.category_id === 'TEXTILE');

    // Step 1: Jenis Kain
    const jenisKain = [
        {
            id: 'lokal',
            label: 'Kain Lokal',
            description: 'Kain lokal berkualitas',
            widths: [
                { id: '90', label: '90cm', price: 35000 },
                { id: '120', label: '120cm', price: 45000 }
            ],
            hasFinishing: true
        },
        {
            id: 'impor',
            label: 'Kain Impor',
            description: 'Kain impor premium',
            widths: [
                { id: '90', label: '90cm', price: 55000 },
                { id: '150', label: '150cm', price: 90000 },
                { id: '200', label: '200cm', price: 120000 }
            ],
            hasFinishing: true
        },
        {
            id: 'dtf',
            label: 'DTF',
            description: 'Direct to Film',
            widths: [
                { id: '60', label: '60cm', price: 45000 }
            ],
            hasFinishing: false
        }
    ];

    const [selectedJenis, setSelectedJenis] = useState(null);
    const [selectedWidth, setSelectedWidth] = useState(null);
    const [panjang, setPanjang] = useState(1);
    const [selectedFinishings, setSelectedFinishings] = useState([]);

    // Get current jenis and width objects
    const currentJenis = jenisKain.find(j => j.id === selectedJenis);
    const currentWidth = currentJenis?.widths.find(w => w.id === selectedWidth);

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

    const calculateFinishingCost = (meters) => {
        const selectedFinishingObjs = textileFinishings.filter(f => selectedFinishings.includes(f.id));
        return selectedFinishingObjs.reduce((sum, f) => sum + (f.price * meters), 0);
    };

    const getSelectedFinishingNames = () => {
        return textileFinishings
            .filter(f => selectedFinishings.includes(f.id))
            .map(f => f.name);
    };

    // Calculate price
    const basePrice = currentWidth ? currentWidth.price : 0;
    const finishingCost = currentJenis?.hasFinishing ? calculateFinishingCost(panjang) : 0;
    const subtotal = (basePrice * panjang) + finishingCost;

    // Check if can submit
    const canSubmit = selectedJenis && selectedWidth && panjang > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;

        // ===== RAW DATA ONLY - NO PRICE CALCULATION =====
        const rawData = {
            product: {
                id: `TEXTILE_${selectedJenis.toUpperCase()}_${selectedWidth}`,
                name: `${currentJenis.label} (L: ${currentWidth.label})`,
                price: currentWidth.price // Pass raw per-meter price for buildCartItem
            },
            qty: Number(panjang), // ENSURE NUMBER
            dimensions: {
                length: Number(panjang) // ENSURE NUMBER
            },
            finishings: currentJenis?.hasFinishing ? selectedFinishings.filter(id => id).map(id => {
                const f = textileFinishings.find(opt => opt.id === id);
                return f || null;
            }).filter(Boolean) : []
        };

        // Let buildCartItem handle ALL validation, calculation, and description
        onAddItem(rawData);

        // Reset form
        resetForm();
    };

    return (
        <div className="configurator-container">
            <div className="configurator-content">
                {/* Header */}
                <div className="config-header">
                    <h2>Textile & DTF</h2>
                    <p className="config-description">Pilih jenis kain, ukuran lebar, dan panjang</p>
                </div>

                {/* Step 1: Jenis Kain */}
                <div className="config-section">
                    <h3>1. Pilih Jenis Kain</h3>
                    <div className="jenis-grid">
                        {jenisKain.map(jenis => (
                            <div
                                key={jenis.id}
                                className={`jenis-card ${selectedJenis === jenis.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedJenis(jenis.id);
                                    setSelectedWidth(null); // Reset width when changing jenis
                                    setSelectedFinishings([]); // Reset finishing
                                }}
                            >
                                <div className="jenis-label">{jenis.label}</div>
                                <div className="jenis-desc">{jenis.description}</div>
                                {selectedJenis === jenis.id && <div className="check-mark">✓</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 2: Width Selection */}
                {selectedJenis && currentJenis && (
                    <div className="config-section">
                        <h3>2. Pilih Lebar Kain</h3>
                        <div className="width-grid">
                            {currentJenis.widths.map(width => (
                                <div
                                    key={width.id}
                                    className={`width-card ${selectedWidth === width.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedWidth(width.id)}
                                >
                                    <div className="width-label">{width.label}</div>
                                    <div className="width-price">{formatRupiah(width.price)}/meter</div>
                                    {selectedWidth === width.id && <div className="check-mark">✓</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Panjang */}
                {selectedWidth && (
                    <div className="config-section">
                        <h3>3. Input Panjang</h3>
                        <div className="panjang-input">
                            <button onClick={() => setPanjang(Math.max(0.5, panjang - 0.5))}>−</button>
                            <input
                                type="number"
                                value={panjang}
                                onChange={(e) => setPanjang(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                                min="0.5"
                                step="0.5"
                            />
                            <button onClick={() => setPanjang(panjang + 0.5)}>+</button>
                            <span className="unit-label">meter</span>
                        </div>
                        <p className="helper-text">Minimal 0.5 meter, increment 0.5m</p>
                    </div>
                )}

                {/* Step 4: Finishing (if applicable) */}
                {selectedWidth && currentJenis?.hasFinishing && textileFinishings.length > 0 && (
                    <div className="config-section">
                        <h3>4. Finishing (Opsional)</h3>
                        <div className="finishing-grid">
                            {textileFinishings.map(finishing => (
                                <div
                                    key={finishing.id}
                                    className={`finishing-card ${selectedFinishings.includes(finishing.id) ? 'selected' : ''}`}
                                    onClick={() => handleFinishingToggle(finishing.id)}
                                >
                                    <div className="finishing-name">{finishing.name}</div>
                                    <div className="finishing-price">+{formatRupiah(finishing.price)}/m</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* DTF Note */}
                {selectedWidth && !currentJenis?.hasFinishing && (
                    <div className="config-section">
                        <div className="info-box">
                            ℹ️ DTF tidak memiliki opsi finishing
                        </div>
                    </div>
                )}

                {/* Price Summary */}
                {selectedWidth && (
                    <div className="price-summary">
                        <div className="summary-row">
                            <span>Harga Dasar ({panjang}m × {formatRupiah(basePrice)}):</span>
                            <strong>{formatRupiah(basePrice * panjang)}</strong>
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
                breakdown={selectedWidth ? `${panjang}m × ${formatRupiah(basePrice)}` : ''}
                canAdd={canSubmit}
                onAdd={handleSubmit}
            />
        </div>
    );
}
