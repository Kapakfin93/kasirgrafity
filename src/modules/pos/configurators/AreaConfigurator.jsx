import React from 'react';
import { ProductGrid } from './shared/ProductGrid';
import { ActionBar } from './shared/ActionBar';
import { FinishingRadioGrid } from '../FinishingRadioGrid';
import { useFinishingSelection } from '../../../hooks/useFinishingSelection';

export function AreaConfigurator({ category, inputState, updateInput, onAddItem, previewCalc }) {
    const { product, qty, length, width } = inputState;

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
    const canAdd = product && length && width && preview.subtotal > 0;

    // Handle Submit - SEND RAW DATA ONLY
    const handleSubmit = () => {
        if (!canAdd) return;

        // ===== RAW DATA ONLY - NO PROCESSING =====
        const rawData = {
            product: product,
            qty: qty,
            dimensions: {
                length: parseFloat(length),
                width: parseFloat(width)
            },
            finishings: selectedFinishings
        };

        // Let buildCartItem handle ALL validation, calculation, and description
        onAddItem(rawData);
    };

    return (
        <div className="configurator">
            <div className="config-header">
                <h2>{category.name}</h2>
                <div className="logic-badge">AREA</div>
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
                    <div className="dims-row">
                        <label>
                            Panjang (m)
                            <input
                                type="number" step="any"
                                value={length || ''}
                                onChange={e => updateInput({ length: e.target.value })}
                                autoFocus
                                onFocus={e => e.target.select()}
                            />
                        </label>
                        <label>
                            Lebar (m)
                            <input
                                type="number" step="any"
                                value={width || ''}
                                onChange={e => updateInput({ width: e.target.value })}
                                onFocus={e => e.target.select()}
                            />
                        </label>
                    </div>

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
