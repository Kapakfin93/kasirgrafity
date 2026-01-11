export function ProductGrid({
    categories,
    products,
    selectedCategory,
    onSelectCategory,
    onProductClick
}) {
    const filteredProducts = products.filter(p => p.category_id === selectedCategory);

    return (
        <div className="product-section">
            <div className="category-tabs">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => onSelectCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="product-grid">
                {filteredProducts.map(product => (
                    <button
                        key={product.id}
                        className="product-card"
                        onClick={() => onProductClick(product)}
                    >
                        <span className="product-name">{product.name}</span>
                        <span className="product-price">
                            {product.base_price.toLocaleString('id-ID')}
                            <span className="unit-label">
                                /{product.pricing_model === 'AREA' ? 'm²' :
                                    product.pricing_model === 'LINEAR' ? 'm' : 'pcs'}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
