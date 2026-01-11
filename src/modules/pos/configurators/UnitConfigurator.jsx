import React from 'react';
import { ProductGrid } from './shared/ProductGrid';
import { ActionBar } from './shared/ActionBar';
import { FinishingRadioGrid } from '../FinishingRadioGrid';
import { useFinishingSelection } from '../../../hooks/useFinishingSelection';

export function UnitConfigurator({ category, inputState, updateInput, onAddItem, previewCalc }) {
    const { product, qty } = inputState;

    // Use shared finishing selection logic
    const { selectedFinishings, toggleFinishing, getSelectedIds } = useFinishingSelection(
        inputState.selectedFinishings || []
    );

    // Sync with parent state
    React.useEffect(() => {
        updateInput({ selectedFinishings });
    }, [selectedFinishings]);

    const handleProductSelect = (prod) => updateInput({ product: prod });

    const preview = previewCalc ? previewCalc() : { subtotal: 0 };
    const canAdd = product && preview.subtotal > 0;

    // Handle Submit - SEND RAW DATA ONLY
    const handleSubmit = () => {
        if (!canAdd) return;

        // ===== RAW DATA ONLY - NO PROCESSING =====
        const rawData = {
            product: product,
            qty: qty,
            dimensions: {}, // No dimensions for UNIT/UNIT_SHEET
            finishings: selectedFinishings
        };

        // Let buildCartItem handle ALL validation, calculation, and description
        onAddItem(rawData);
    };

    return (
        <div className="configurator">
            <div className="config-header">
                <h2>{category.name}</h2>
                <div className="logic-badge">{category.logic_type}</div>
            </div>

            <div className="section-label">Pilih Produk</div>
            <ProductGrid
                products={category.products}
                selectedId={product?.id}
                onSelect={handleProductSelect}
                logicType={category.logic_type}
            />

            {product && (
                <div className="dynamic-inputs">
                    <div className="qty-row">
                        <label>Quantity</label>
                        <div className="qty-control">
                            <button onClick={() => updateInput({ qty: Math.max(1, qty - 1) })}>-</button>
                            <span>{qty}</span>
                            <button onClick={() => updateInput({ qty: qty + 1 })}>+</button>
                        </div>
                    </div>
                </div>
            )}

            {product && category.finishings?.length > 0 && (
                <FinishingRadioGrid
                    finishings={category.finishings}
                    selectedIds={getSelectedIds()}
                    onToggle={toggleFinishing}
                />
            )}

            <ActionBar
                total={preview.subtotal}
                breakdown={preview.breakdown}
                canAdd={canAdd}
                onAdd={handleSubmit}
            />
        </div>
    );
}
