import React, { useState, useMemo } from 'react'
import { categories } from '../data/categories'
import { products } from '../data/products'
import { formatRupiah } from '../utils/format'

export default function ProductSection({ onProductClick }) {
    const [selectedCategory, setSelectedCategory] = useState(categories[0].id)

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.category_id === selectedCategory)
    }, [selectedCategory])

    return (
        <div className="product-section">
            {/* CATEGORY TABS */}
            <div className="category-grid">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* PRODUCT GRID */}
            <div className="product-grid">
                {filteredProducts.map(product => (
                    <button
                        key={product.id}
                        className="product-card"
                        onClick={() => onProductClick(product)}
                    >
                        <div className="prod-name">{product.name}</div>
                        <div className="prod-price">
                            {product.pricing_model === 'UNIT'
                                ? formatRupiah(product.base_price)
                                : `${formatRupiah(product.base_price)} / ${product.pricing_model === 'LINEAR' ? 'm' : 'm²'}`
                            }
                        </div>
                    </button>
                ))}
            </div>

            <style>{`
        .product-section { padding: var(--spacing-md); }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        .cat-btn {
          padding: var(--spacing-md);
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-weight: bold;
          color: var(--color-text-muted);
          transition: all 0.1s;
        }
        .cat-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--spacing-md);
        }
        .product-card {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: var(--spacing-md);
          text-align: left;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .product-card:active {
          transform: scale(0.98);
        }
        .product-card:hover {
          border-color: var(--color-primary);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .prod-name {
          font-weight: 600;
          color: var(--color-text-main);
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .prod-price {
          font-size: 0.9rem;
          color: var(--color-text-muted);
        }
      `}</style>
        </div>
    )
}
