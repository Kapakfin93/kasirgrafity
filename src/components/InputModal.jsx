import { useState } from 'react';
import AdvancedProductForm from './forms/AdvancedProductForm';

export function InputModal({ isOpen, onClose, onSubmit, product }) {
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');

    if (!isOpen || !product) return null;

    // ========== DEBUG LOGS ==========
    console.log('🔍 MODAL OPENED WITH PRODUCT:', product.name);
    console.log('📊 Product Object:', product);
    console.log('🏷️ PRICING MODEL:', product.pricing_model);
    console.log('🚀 ADVANCED FEATURES:', product.advanced_features);
    console.log('✅ Is Advanced Condition Met?', product.pricing_model === 'ADVANCED');
    console.log('🔢 Base Price:', product.base_price);
    // ================================

    // ========== ADVANCED PRICING MODEL (NEW) ==========
    if (product.pricing_model === 'ADVANCED') {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
                    <div className="modal-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--theme-border)'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '700',
                            color: 'var(--theme-text-primary)'
                        }}>
                            {product.name}
                        </h3>
                        <button
                            onClick={onClose}
                            className="close-btn"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'var(--theme-text-secondary)',
                                fontSize: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <AdvancedProductForm
                        product={product}
                        onSubmit={(payload) => {
                            onSubmit(payload);
                            onClose();
                        }}
                    />
                </div>
            </div>
        );
    }

    // ========== LEGACY PRICING MODELS (LINEAR & AREA) ==========
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            length: parseFloat(length),
            width: parseFloat(width),
            height: parseFloat(height)
        });
        // Reset
        setLength('');
        setWidth('');
        setHeight('');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Input Ukuran: {product.name}</h3>
                <form onSubmit={handleSubmit}>
                    {product.pricing_model === 'LINEAR' && (
                        <div className="form-group">
                            <label>Panjang (meter)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                autoFocus
                                value={length}
                                onChange={e => setLength(e.target.value)}
                            />
                        </div>
                    )}

                    {product.pricing_model === 'AREA' && (
                        <>
                            <div className="form-group">
                                <label>Lebar (meter)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Tinggi (meter)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Batal</button>
                        <button type="submit" className="btn-confirm">Masuk Nota</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

