import React from 'react';

/**
 * Sidebar - Category Navigation
 * Now uses dynamic categories from store (UUID-based)
 */
export function Sidebar({ categories = [], selectedCategoryId, onSelectCategory }) {
    // Group categories by logic_type for visual organization
    const getGroupIcon = (logicType) => {
        switch (logicType) {
            case 'AREA': return '🚩';
            case 'MATRIX': return '🖼️';
            case 'LINEAR': return '👕';
            case 'UNIT_SHEET': return '🖨️';
            case 'UNIT': return '📦';
            case 'MANUAL': return '✏️';
            default: return '📋';
        }
    };

    return (
        <aside className="sidebar-nav">
            <div className="nav-header">
                <h2>KATEGORI</h2>
            </div>

            {/* Dynamic Category List */}
            <div className="category-list">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`nav-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                        onClick={() => onSelectCategory(cat.id)}
                    >
                        <span className="nav-icon">{getGroupIcon(cat.logic_type)}</span>
                        <span className="nav-label">{cat.name}</span>
                    </button>
                ))}
            </div>

            {categories.length === 0 && (
                <div className="empty-categories">
                    <p>⏳ Memuat kategori...</p>
                </div>
            )}
        </aside>
    );
}
