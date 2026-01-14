import { useState, useEffect } from 'react';

/**
 * JOGLO POS V2.5 - ADVANCED PRICING FORM
 * 
 * Handles complex products with:
 * - Wholesale pricing tiers
 * - Dynamic finishing options (radio/checkbox/text_input)
 * - Real-time price calculations
 * - Financial breakdown for reporting
 * 
 * @param {Object} product - Product with advanced_features schema
 * @param {Function} onSubmit - Callback with structured payload
 */
export default function AdvancedProductForm({ product, onSubmit }) {
    // ========== STATE MANAGEMENT ==========
    const minOrder = product.advanced_features?.min_order || 1;
    const [qty, setQty] = useState(minOrder);
    const [selectedOptions, setSelectedOptions] = useState({});
    const [customInputs, setCustomInputs] = useState({});

    // Initialize selected options for required finishing groups
    useEffect(() => {
        const initialSelections = {};
        product.advanced_features?.finishing_groups?.forEach((group, idx) => {
            if (group.required && group.type === 'radio') {
                // Auto-select first option for required radio groups
                initialSelections[`group_${idx}`] = 0; // Index of first option
            }
        });
        setSelectedOptions(initialSelections);
    }, [product]);

    // ========== PRICING ALGORITHM ==========

    /**
     * STEP A: Calculate base price from wholesale rules
     */
    const getWholesalePrice = () => {
        const rules = product.advanced_features?.wholesale_rules;

        // No rules = flat pricing
        if (!rules || rules.length === 0) {
            return product.base_price;
        }

        // Find matching tier based on quantity
        const matchingRule = rules.find(rule => qty >= rule.min && qty <= rule.max);
        return matchingRule ? matchingRule.price : product.base_price;
    };

    /**
     * STEP B: Calculate finishing costs
     * Returns { totalFinishingPerUnit, finishingDetails }
     */
    const calculateFinishingCosts = () => {
        let totalFinishingPerUnit = 0;
        const finishingDetails = [];
        const groups = product.advanced_features?.finishing_groups || [];

        groups.forEach((group, groupIdx) => {
            const groupKey = `group_${groupIdx}`;

            if (group.type === 'radio') {
                // Single selection
                const selectedIdx = selectedOptions[groupKey];
                if (selectedIdx !== undefined && group.options[selectedIdx]) {
                    const option = group.options[selectedIdx];
                    totalFinishingPerUnit += option.price;
                    finishingDetails.push(`${group.title}: ${option.label}`);
                }
            } else if (group.type === 'checkbox') {
                // Multiple selections
                const selected = selectedOptions[groupKey] || [];
                selected.forEach(optionIdx => {
                    const option = group.options[optionIdx];
                    if (option) {
                        totalFinishingPerUnit += option.price;
                        finishingDetails.push(`${group.title}: ${option.label}`);
                    }
                });
            } else if (group.type === 'text_input') {
                // CRITICAL: Text input uses price_add PER UNIT (multiplied by qty)
                // But for unit cost calculation, we just add the base price
                const inputValue = customInputs[groupKey];
                if (inputValue && inputValue.trim()) {
                    totalFinishingPerUnit += group.price_add;
                    finishingDetails.push(`${group.title}: ${inputValue}`);
                }
            }
        });

        return { totalFinishingPerUnit, finishingDetails };
    };

    /**
     * STEP C: Calculate totals
     */
    const calculatePricing = () => {
        const basePrice = getWholesalePrice();
        const { totalFinishingPerUnit, finishingDetails } = calculateFinishingCosts();

        const unitPriceFinal = basePrice + totalFinishingPerUnit;
        const totalPrice = unitPriceFinal * qty;

        // Financial breakdown for owner reports
        const revenuePrint = basePrice * qty;
        const revenueFinish = totalPrice - revenuePrint;

        return {
            basePrice,
            totalFinishingPerUnit,
            unitPriceFinal,
            totalPrice,
            revenuePrint,
            revenueFinish,
            finishingDetails
        };
    };

    const pricing = calculatePricing();

    // ========== EVENT HANDLERS ==========

    const handleQtyChange = (e) => {
        const value = parseInt(e.target.value) || minOrder;
        setQty(Math.max(minOrder, value));
    };

    const handleRadioChange = (groupIdx, optionIdx) => {
        setSelectedOptions(prev => ({
            ...prev,
            [`group_${groupIdx}`]: optionIdx
        }));
    };

    const handleCheckboxChange = (groupIdx, optionIdx) => {
        setSelectedOptions(prev => {
            const groupKey = `group_${groupIdx}`;
            const current = prev[groupKey] || [];
            const isSelected = current.includes(optionIdx);

            return {
                ...prev,
                [groupKey]: isSelected
                    ? current.filter(i => i !== optionIdx)
                    : [...current, optionIdx]
            };
        });
    };

    const handleTextInputChange = (groupIdx, value) => {
        setCustomInputs(prev => ({
            ...prev,
            [`group_${groupIdx}`]: value
        }));
    };

    const handleSubmit = () => {
        const { finishingDetails, ...pricingData } = pricing;

        const payload = {
            product_id: product.id,
            product_name: product.name,
            qty,
            total_price: pricingData.totalPrice,

            // Financial breakdown
            revenue_print: pricingData.revenuePrint,
            revenue_finish: pricingData.revenueFinish,

            // Production notes
            notes: finishingDetails.join(', '),

            // Raw data for reconstruction
            detail_options: {
                base_price: pricingData.basePrice,
                finishing_per_unit: pricingData.totalFinishingPerUnit,
                unit_price_final: pricingData.unitPriceFinal,
                selected_options: selectedOptions,
                custom_inputs: customInputs
            }
        };

        onSubmit(payload);
    };

    // Validation: Check if required fields are filled
    const isValid = () => {
        const groups = product.advanced_features?.finishing_groups || [];

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const groupKey = `group_${i}`;

            if (group.required) {
                if (group.type === 'radio' && selectedOptions[groupKey] === undefined) {
                    return false;
                }
                if (group.type === 'text_input' && !customInputs[groupKey]?.trim()) {
                    return false;
                }
            }
        }

        return qty >= minOrder;
    };

    /**
     * Check if an option should be disabled due to min_qty requirement
     */
    const isOptionDisabled = (option) => {
        return option.min_qty && qty < option.min_qty;
    };

    // ========== RENDER ==========

    return (
        <div className="advanced-product-form" style={{
            background: 'var(--theme-bg-card)',
            borderRadius: '16px',
            padding: '24px',
            color: 'var(--theme-text-primary)'
        }}>
            {/* PRODUCT HEADER */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    margin: '0 0 8px 0',
                    color: 'var(--theme-text-primary)'
                }}>
                    {product.name}
                </h3>
                <div style={{
                    fontSize: '13px',
                    color: 'var(--theme-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#a78bfa',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '11px',
                        letterSpacing: '0.5px'
                    }}>
                        🚀 ADVANCED
                    </span>
                    <span>Min. Order: {minOrder} pcs</span>
                </div>
            </div>

            {/* QUANTITY INPUT */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--theme-text-secondary)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Jumlah (Qty)
                </label>
                <input
                    type="number"
                    value={qty}
                    onChange={handleQtyChange}
                    min={minOrder}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--theme-bg-input)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: '10px',
                        color: 'var(--theme-text-primary)',
                        fontSize: '16px',
                        fontWeight: '600'
                    }}
                />
            </div>

            {/* WHOLESALE RULES DISPLAY */}
            {product.advanced_features?.wholesale_rules && product.advanced_features.wholesale_rules.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--theme-text-secondary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        📊 Harga Grosir (Wholesale Tiers)
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '10px'
                    }}>
                        {product.advanced_features.wholesale_rules.map((rule, idx) => {
                            const isActive = qty >= rule.min && qty <= rule.max;
                            return (
                                <div key={idx} style={{
                                    padding: '12px',
                                    background: isActive
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: `2px solid ${isActive ? '#22c55e' : 'var(--theme-border)'}`,
                                    borderRadius: '10px',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--theme-text-secondary)',
                                        marginBottom: '4px',
                                        fontWeight: '600'
                                    }}>
                                        {rule.min} - {rule.max} pcs
                                    </div>
                                    <div style={{
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        color: isActive ? '#22c55e' : 'var(--theme-text-primary)',
                                        fontFamily: 'JetBrains Mono, monospace'
                                    }}>
                                        Rp {rule.price.toLocaleString('id-ID')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FINISHING GROUPS */}
            {product.advanced_features?.finishing_groups?.map((group, groupIdx) => (
                <div key={groupIdx} style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--theme-text-secondary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {group.title} {group.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>

                    {/* RADIO BUTTONS */}
                    {group.type === 'radio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {group.options.map((option, optionIdx) => {
                                const disabled = isOptionDisabled(option);
                                const isSelected = selectedOptions[`group_${groupIdx}`] === optionIdx;

                                return (
                                    <button
                                        key={optionIdx}
                                        onClick={() => !disabled && handleRadioChange(groupIdx, optionIdx)}
                                        disabled={disabled}
                                        style={{
                                            padding: '14px 16px',
                                            background: isSelected
                                                ? 'rgba(56, 189, 248, 0.2)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: `2px solid ${isSelected ? '#38bdf8' : 'var(--theme-border)'}`,
                                            borderRadius: '10px',
                                            color: disabled ? '#64748b' : 'var(--theme-text-primary)',
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: disabled ? '0.5' : '1',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontWeight: '600' }}>
                                            {isSelected && '✓ '}{option.label}
                                            {disabled && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    marginLeft: '8px',
                                                    color: '#94a3b8'
                                                }}>
                                                    (Min {option.min_qty})
                                                </span>
                                            )}
                                        </span>
                                        {option.price !== 0 && (
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                color: option.price > 0 ? '#22c55e' : '#f59e0b',
                                                fontFamily: 'JetBrains Mono, monospace'
                                            }}>
                                                {option.price > 0 ? '+' : ''}Rp {option.price.toLocaleString('id-ID')}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* CHECKBOXES */}
                    {group.type === 'checkbox' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {group.options.map((option, optionIdx) => {
                                const disabled = isOptionDisabled(option);
                                const isSelected = (selectedOptions[`group_${groupIdx}`] || []).includes(optionIdx);

                                return (
                                    <button
                                        key={optionIdx}
                                        onClick={() => !disabled && handleCheckboxChange(groupIdx, optionIdx)}
                                        disabled={disabled}
                                        style={{
                                            padding: '14px 16px',
                                            background: isSelected
                                                ? 'rgba(139, 92, 246, 0.2)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: `2px solid ${isSelected ? '#8b5cf6' : 'var(--theme-border)'}`,
                                            borderRadius: '10px',
                                            color: disabled ? '#64748b' : 'var(--theme-text-primary)',
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: disabled ? '0.5' : '1',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontWeight: '600' }}>
                                            {isSelected && '☑ '}{option.label}
                                            {disabled && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    marginLeft: '8px',
                                                    color: '#94a3b8'
                                                }}>
                                                    (Min {option.min_qty})
                                                </span>
                                            )}
                                        </span>
                                        {option.price !== 0 && (
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                color: option.price > 0 ? '#22c55e' : '#f59e0b',
                                                fontFamily: 'JetBrains Mono, monospace'
                                            }}>
                                                {option.price > 0 ? '+' : ''}Rp {option.price.toLocaleString('id-ID')}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* TEXT INPUT */}
                    {group.type === 'text_input' && (
                        <div>
                            <input
                                type="text"
                                value={customInputs[`group_${groupIdx}`] || ''}
                                onChange={(e) => handleTextInputChange(groupIdx, e.target.value)}
                                placeholder={group.placeholder || 'Masukkan data...'}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'var(--theme-bg-input)',
                                    border: '1px solid var(--theme-border)',
                                    borderRadius: '10px',
                                    color: 'var(--theme-text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                            {group.note && (
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '12px',
                                    color: 'var(--theme-text-secondary)',
                                    fontStyle: 'italic'
                                }}>
                                    💡 {group.note}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* PRICE SUMMARY */}
            <div style={{
                marginTop: '32px',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderRadius: '12px',
                border: '2px solid rgba(34, 197, 94, 0.3)'
            }}>
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '13px',
                        color: 'var(--theme-text-secondary)'
                    }}>
                        <span>Harga Dasar ({qty} pcs)</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            Rp {pricing.revenuePrint.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: 'var(--theme-text-secondary)'
                    }}>
                        <span>Finishing</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            Rp {pricing.revenueFinish.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>
                <div style={{
                    paddingTop: '12px',
                    borderTop: '2px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: 'var(--theme-text-primary)'
                    }}>
                        TOTAL HARGA
                    </span>
                    <span style={{
                        fontSize: '24px',
                        fontWeight: '900',
                        color: '#22c55e',
                        fontFamily: 'JetBrains Mono, monospace',
                        textShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
                    }}>
                        Rp {pricing.totalPrice.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
                onClick={handleSubmit}
                disabled={!isValid()}
                style={{
                    width: '100%',
                    padding: '16px',
                    marginTop: '20px',
                    background: isValid()
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'rgba(148, 163, 184, 0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: isValid() ? 'pointer' : 'not-allowed',
                    opacity: isValid() ? '1' : '0.5',
                    transition: 'all 0.3s',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                    if (isValid()) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 10px 30px rgba(34, 197, 94, 0.4)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                {isValid() ? '✓ Simpan ke Keranjang' : '⚠ Lengkapi Data'}
            </button>
        </div>
    );
}
