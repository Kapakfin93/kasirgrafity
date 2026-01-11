import React from 'react';

export function ProductGrid({ products, selectedId, onSelect, logicType }) {
    const getPriceDisplay = (prod) => {
        if (prod.price) return `Rp ${prod.price.toLocaleString('id-ID')}`;
        if (prod.prices) {
            const values = Object.values(prod.prices);
            const min = Math.min(...values);
            const max = Math.max(...values);
            return `Rp ${min.toLocaleString('id-ID')} - ${max.toLocaleString('id-ID')}`;
        }
        return 'Harga Custom';
    };

    return (
        <div className="product-grid-container">
            <div className="product-grid-header">
                <h3>Pilih Produk</h3>
                {selectedId && (
                    <span className="selected-indicator">
                        ✓ {products.find(p => p.id === selectedId)?.name}
                    </span>
                )}
            </div>

            <div className="product-grid-items">
                {products.map(prod => (
                    <div
                        key={prod.id}
                        className={`product-grid-card ${selectedId === prod.id ? 'selected' : ''}`}
                        onClick={() => onSelect(prod)}
                    >
                        <div className="product-card-header">
                            <span className="product-name">{prod.name}</span>
                            {logicType && <span className="product-badge">{logicType}</span>}
                        </div>
                        <div className="product-card-price">{getPriceDisplay(prod)}</div>
                        {selectedId === prod.id && (
                            <div className="product-card-check">✓</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
