import React, { useState } from 'react';
import { ActionBar } from './shared/ActionBar';

export function ManualConfigurator({ category, inputState, updateInput, onAddItem, previewCalc }) {
    const [itemName, setItemName] = useState('');
    const { qty, manualPrice } = inputState;

    const preview = previewCalc ? previewCalc() : { subtotal: 0 };
    const canAdd = itemName.trim() && manualPrice && preview.subtotal > 0;

    // Handle Submit - SEND RAW DATA ONLY
    const handleSubmit = () => {
        if (!canAdd) return;

        // ===== RAW DATA ONLY - NO PROCESSING =====
        const rawData = {
            product: {
                id: 'MANUAL',
                name: itemName.trim(),
                price: 0 // Not used for manual
            },
            qty: qty,
            dimensions: {},
            finishings: [],
            manualPrice: parseFloat(manualPrice)
        };

        // Let buildCartItem handle ALL validation, calculation, and description
        onAddItem(rawData);

        // Reset form
        setItemName('');
        updateInput({ manualPrice: '' });
    };

    return (
        <div className="configurator">
            <div className="config-header">
                <h2>{category.name}</h2>
                <div className="logic-badge">MANUAL</div>
            </div>

            <div className="manual-form">
                <div className="form-row">
                    <label>Nama Item</label>
                    <input
                        type="text"
                        placeholder="Masukkan nama item..."
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="input-text"
                    />
                </div>

                <div className="form-row">
                    <label>Harga Manual (Rp)</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={manualPrice}
                        onChange={(e) => updateInput({ manualPrice: e.target.value })}
                        className="input-number"
                    />
                </div>

                <div className="form-row">
                    <label>Quantity</label>
                    <div className="qty-control">
                        <button onClick={() => updateInput({ qty: Math.max(1, qty - 1) })}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => updateInput({ qty: qty + 1 })}>+</button>
                    </div>
                </div>
            </div>

            <ActionBar
                canAdd={canAdd}
                onAdd={handleSubmit}
                total={preview.subtotal}
                breakdown={preview.breakdown}
            />
        </div>
    );
}
