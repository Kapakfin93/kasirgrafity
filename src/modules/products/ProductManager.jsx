/**
 * ProductManager.jsx - PHASE 2: Product Management Page
 * Admin/Owner page to manage products, categories, and finishings
 * Uses useProductStore for CRUD operations
 */

import React, { useEffect, useState } from 'react';
import { useProductStore } from '../../stores/useProductStore';
import { usePermissions } from '../../hooks/usePermissions';
import { formatRupiah } from '../../core/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';

// ============================================
// PRODUCT FORM MODAL (with In-Context Creation)
// ============================================
function ProductFormModal({
    isOpen,
    onClose,
    product,
    categories,
    onSave,
    onAddCategory,      // NEW: Callback to open category modal
    onAddFinishing,     // NEW: Callback to open finishing modal
    allFinishings       // NEW: All finishings for preview
}) {
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        categoryId: '',
        prices: null, // For MATRIX type
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                price: product.price || 0,
                categoryId: product.categoryId || '',
                prices: product.prices || null,
            });
        } else {
            setFormData({
                name: '',
                price: 0,
                categoryId: categories[0]?.id || '',
                prices: null,
            });
        }
    }, [product, categories, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Nama produk tidak boleh kosong!');
            return;
        }
        if (!formData.categoryId) {
            alert('Pilih kategori!');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(formData, product?.id);
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Gagal menyimpan produk!');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get selected category to check logic_type
    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const isMatrixType = selectedCategory?.logic_type === 'MATRIX';

    // Get finishings for selected category
    const categoryFinishings = (allFinishings || []).filter(
        f => f.categoryId === formData.categoryId
    );

    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay-level-1" onClick={onClose}>
            <div className="modal-content product-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{product ? '✏️ Edit Produk' : '➕ Tambah Produk'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="product-form">
                    {/* Category Selector with [+] Button */}
                    <div className="form-group">
                        <label>📁 Kategori</label>
                        <div className="input-with-action">
                            <select
                                value={formData.categoryId}
                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                                disabled={!!product} // Cannot change category when editing
                            >
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name} ({cat.logic_type})
                                    </option>
                                ))}
                            </select>
                            {!product && onAddCategory && (
                                <button
                                    type="button"
                                    className="btn-inline-add"
                                    onClick={onAddCategory}
                                    title="Tambah Kategori Baru"
                                >
                                    ➕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Finishings Preview Section */}
                    {formData.categoryId && (
                        <div className="form-group finishings-preview-section">
                            <label>🔧 Finishing Tersedia</label>
                            <div className="finishings-preview">
                                {categoryFinishings.length === 0 ? (
                                    <span className="no-finishings">Belum ada finishing untuk kategori ini</span>
                                ) : (
                                    <div className="finishing-chips">
                                        {categoryFinishings.map(fin => (
                                            <span key={fin.id} className="finishing-chip">
                                                {fin.name}
                                                {fin.price > 0 && (
                                                    <small> +{formatRupiah(fin.price)}</small>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {onAddFinishing && (
                                    <button
                                        type="button"
                                        className="btn-add-finishing-inline"
                                        onClick={() => onAddFinishing(formData.categoryId)}
                                    >
                                        ➕ Tambah Finishing
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Product Name */}
                    <div className="form-group">
                        <label>📦 Nama Produk</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Flexi 280gr Standard"
                            required
                        />
                    </div>

                    {/* Price - Different input for MATRIX vs others */}
                    {isMatrixType ? (
                        <div className="form-group">
                            <label>💰 Harga per Ukuran (MATRIX)</label>
                            <div className="matrix-prices">
                                {['A2', 'A1', 'A0'].map(size => (
                                    <div key={size} className="matrix-price-row">
                                        <span className="size-label">{size}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.prices?.[size] || 0}
                                            onChange={e => setFormData({
                                                ...formData,
                                                prices: {
                                                    ...formData.prices,
                                                    [size]: parseInt(e.target.value) || 0
                                                }
                                            })}
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>💰 Harga (Rp)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                            <span className="form-hint">
                                {formatRupiah(formData.price)}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="btn-save" disabled={isSubmitting}>
                            {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// CATEGORY FORM MODAL
// ============================================
function CategoryFormModal({ isOpen, onClose, category, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        logic_type: 'UNIT',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const LOGIC_TYPES = [
        { value: 'AREA', label: '📐 AREA (m² × harga)', desc: 'Banner, Spanduk' },
        { value: 'LINEAR', label: '📏 LINEAR (meter × harga)', desc: 'Kain, Textile' },
        { value: 'MATRIX', label: '🎯 MATRIX (A0/A1/A2)', desc: 'Poster' },
        { value: 'UNIT', label: '📦 UNIT (per item)', desc: 'Merchandise' },
        { value: 'UNIT_SHEET', label: '🖨️ UNIT_SHEET (per lembar)', desc: 'A3+ Digital' },
        { value: 'MANUAL', label: '✏️ MANUAL (input bebas)', desc: 'Custom' },
    ];

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                logic_type: category.logic_type || 'UNIT',
            });
        } else {
            setFormData({ name: '', logic_type: 'UNIT' });
        }
    }, [category, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Nama kategori tidak boleh kosong!');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(formData, category?.id);
            onClose();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Gagal menyimpan kategori!');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay-level-2" onClick={onClose}>
            <div className="modal-content category-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{category ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="category-form">
                    {/* Category Name */}
                    <div className="form-group">
                        <label>📁 Nama Kategori</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Banner / Spanduk"
                            required
                        />
                    </div>

                    {/* Logic Type */}
                    <div className="form-group">
                        <label>⚙️ Tipe Perhitungan Harga</label>
                        <select
                            value={formData.logic_type}
                            onChange={e => setFormData({ ...formData, logic_type: e.target.value })}
                            disabled={!!category} // Cannot change logic_type when editing
                        >
                            {LOGIC_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <span className="form-hint">
                            {LOGIC_TYPES.find(t => t.value === formData.logic_type)?.desc}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="btn-save" disabled={isSubmitting}>
                            {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// FINISHING FORM MODAL
// ============================================
function FinishingFormModal({ isOpen, onClose, finishing, categories, categoryId, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        categoryId: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (finishing) {
            setFormData({
                name: finishing.name || '',
                price: finishing.price || 0,
                categoryId: finishing.categoryId || categoryId || '',
            });
        } else {
            setFormData({
                name: '',
                price: 0,
                categoryId: categoryId || categories[0]?.id || '',
            });
        }
    }, [finishing, categoryId, categories, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Nama finishing tidak boleh kosong!');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(formData, finishing?.id);
            onClose();
        } catch (error) {
            console.error('Error saving finishing:', error);
            alert('Gagal menyimpan finishing!');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay modal-overlay-level-2" onClick={onClose}>
            <div className="modal-content finishing-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{finishing ? '✏️ Edit Finishing' : '➕ Tambah Finishing'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="finishing-form">
                    {/* Category Selector */}
                    <div className="form-group">
                        <label>📁 Kategori</label>
                        <select
                            value={formData.categoryId}
                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                            required
                            disabled={!!finishing}
                        >
                            <option value="">-- Pilih Kategori --</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Finishing Name */}
                    <div className="form-group">
                        <label>🔧 Nama Finishing</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Laminasi Doff"
                            required
                        />
                    </div>

                    {/* Price */}
                    <div className="form-group">
                        <label>💰 Harga (Rp)</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                        <span className="form-hint">{formatRupiah(formData.price)}</span>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="btn-save" disabled={isSubmitting}>
                            {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT: ProductManager
// ============================================
export function ProductManager() {
    const { isOwner } = usePermissions();
    const {
        categories,
        loading,
        error,
        initialize,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addFinishing,
        updateFinishing,
        deleteFinishing,
    } = useProductStore();

    // UI State
    const [activeTab, setActiveTab] = useState('products'); // products | categories | finishings
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [productModal, setProductModal] = useState({ isOpen: false, product: null });
    const [categoryModal, setCategoryModal] = useState({ isOpen: false, category: null });
    const [finishingModal, setFinishingModal] = useState({ isOpen: false, finishing: null, categoryId: null });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // Load data on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Permission check
    if (!isOwner) {
        return (
            <div className="access-denied">
                <h2>❌ Akses Ditolak</h2>
                <p>Hanya Owner yang bisa mengakses halaman ini.</p>
            </div>
        );
    }

    // Get all products from all categories (flattened)
    const allProducts = categories.flatMap(cat =>
        (cat.products || []).map(p => ({
            ...p,
            categoryId: cat.id,
            categoryName: cat.name,
            logicType: cat.logic_type,
        }))
    );

    // Get all finishings from all categories (flattened)
    const allFinishings = categories.flatMap(cat =>
        (cat.finishings || []).map(f => ({
            ...f,
            categoryId: cat.id,
            categoryName: cat.name,
        }))
    );

    // Filter products
    const filteredProducts = allProducts.filter(p => {
        const matchesCategory = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Filter finishings
    const filteredFinishings = allFinishings.filter(f => {
        const matchesCategory = selectedCategoryId === 'all' || f.categoryId === selectedCategoryId;
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // ============================================
    // HANDLERS
    // ============================================

    const handleSaveProduct = async (data, productId) => {
        if (productId) {
            // Update existing
            await updateProduct(productId, data);
        } else {
            // Add new
            await addProduct(data.categoryId, data);
        }
    };

    const handleDeleteProduct = (product) => {
        setConfirmModal({
            isOpen: true,
            title: '🗑️ Hapus Produk',
            message: (
                <span>
                    Yakin ingin menghapus produk <strong>"{product.name}"</strong>?
                    <br /><br />
                    <em style={{ color: '#94a3b8', fontSize: '12px' }}>
                        (Data akan di-soft delete dan bisa dikembalikan)
                    </em>
                </span>
            ),
            onConfirm: async () => {
                await deleteProduct(product.id);
                setConfirmModal({ isOpen: false });
            },
        });
    };

    const handleSaveCategory = async (data, categoryId) => {
        if (categoryId) {
            await updateCategory(categoryId, data);
        } else {
            await addCategory(data);
        }
    };

    const handleDeleteCategory = (category) => {
        const productCount = category.products?.length || 0;
        setConfirmModal({
            isOpen: true,
            title: '🗑️ Hapus Kategori',
            message: (
                <span>
                    Yakin ingin menghapus kategori <strong>"{category.name}"</strong>?
                    {productCount > 0 && (
                        <>
                            <br /><br />
                            <span style={{ color: '#ef4444' }}>
                                ⚠️ Kategori ini memiliki {productCount} produk!
                            </span>
                        </>
                    )}
                </span>
            ),
            onConfirm: async () => {
                await deleteCategory(category.id);
                setConfirmModal({ isOpen: false });
            },
        });
    };

    const handleSaveFinishing = async (data, finishingId) => {
        if (finishingId) {
            await updateFinishing(finishingId, data);
        } else {
            await addFinishing(data.categoryId, data);
        }
    };

    const handleDeleteFinishing = (finishing) => {
        setConfirmModal({
            isOpen: true,
            title: '🗑️ Hapus Finishing',
            message: (
                <span>
                    Yakin ingin menghapus finishing <strong>"{finishing.name}"</strong>?
                </span>
            ),
            onConfirm: async () => {
                await deleteFinishing(finishing.id);
                setConfirmModal({ isOpen: false });
            },
        });
    };

    // Get price display (handles MATRIX type)
    const getProductPriceDisplay = (product) => {
        if (product.prices) {
            // MATRIX type - show range
            const values = Object.values(product.prices).filter(v => v > 0);
            if (values.length === 0) return '-';
            const min = Math.min(...values);
            const max = Math.max(...values);
            return min === max ? formatRupiah(min) : `${formatRupiah(min)} - ${formatRupiah(max)}`;
        }
        return formatRupiah(product.price || 0);
    };

    // Get logic type badge
    const getLogicTypeBadge = (logicType) => {
        const badges = {
            AREA: { bg: '#dbeafe', color: '#1d4ed8', icon: '📐' },
            LINEAR: { bg: '#dcfce7', color: '#15803d', icon: '📏' },
            MATRIX: { bg: '#fef3c7', color: '#b45309', icon: '🎯' },
            UNIT: { bg: '#f3e8ff', color: '#7c3aed', icon: '📦' },
            UNIT_SHEET: { bg: '#fce7f3', color: '#be185d', icon: '🖨️' },
            MANUAL: { bg: '#e2e8f0', color: '#475569', icon: '✏️' },
        };
        const badge = badges[logicType] || badges.MANUAL;
        return (
            <span
                className="logic-badge"
                style={{ background: badge.bg, color: badge.color }}
            >
                {badge.icon} {logicType}
            </span>
        );
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading && categories.length === 0) {
        return (
            <div className="product-manager loading">
                <div className="loading-spinner">⏳ Memuat data...</div>
            </div>
        );
    }

    return (
        <div className="product-manager">
            {/* Header */}
            <div className="pm-header">
                <div className="pm-title">
                    <h1>📦 Kelola Produk & Inventaris</h1>
                    <p className="subtitle">Manage products, categories, and finishings</p>
                </div>

                <div className="pm-actions">
                    {activeTab === 'products' && (
                        <button
                            className="btn-primary"
                            onClick={() => setProductModal({ isOpen: true, product: null })}
                        >
                            ➕ Tambah Produk
                        </button>
                    )}
                    {activeTab === 'categories' && (
                        <button
                            className="btn-primary"
                            onClick={() => setCategoryModal({ isOpen: true, category: null })}
                        >
                            ➕ Tambah Kategori
                        </button>
                    )}
                    {activeTab === 'finishings' && (
                        <button
                            className="btn-primary"
                            onClick={() => setFinishingModal({ isOpen: true, finishing: null, categoryId: selectedCategoryId !== 'all' ? selectedCategoryId : null })}
                        >
                            ➕ Tambah Finishing
                        </button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="pm-tabs">
                <button
                    className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    📦 Produk ({allProducts.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    📁 Kategori ({categories.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'finishings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finishings')}
                >
                    🔧 Finishing ({allFinishings.length})
                </button>
            </div>

            {/* Filters */}
            <div className="pm-filters">
                <div className="filter-group">
                    <label>Filter Kategori:</label>
                    <select
                        value={selectedCategoryId}
                        onChange={e => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="all">Semua Kategori</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Cari:</label>
                    <input
                        type="text"
                        placeholder="Ketik nama..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="pm-content">
                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                    <div className="products-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nama Produk</th>
                                    <th>Kategori</th>
                                    <th>Tipe</th>
                                    <th>Harga</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-row">
                                            {searchQuery ? '🔍 Tidak ada hasil pencarian' : '📦 Belum ada produk'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map(product => (
                                        <tr key={product.id}>
                                            <td className="product-name">
                                                <strong>{product.name}</strong>
                                            </td>
                                            <td>{product.categoryName}</td>
                                            <td>{getLogicTypeBadge(product.logicType)}</td>
                                            <td className="price-cell">
                                                {getProductPriceDisplay(product)}
                                            </td>
                                            <td className="action-cell">
                                                <button
                                                    className="btn-edit"
                                                    onClick={() => setProductModal({ isOpen: true, product })}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDeleteProduct(product)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CATEGORIES TAB */}
                {activeTab === 'categories' && (
                    <div className="categories-grid">
                        {categories.map(category => (
                            <div key={category.id} className="category-card">
                                <div className="category-header">
                                    <h3>{category.name}</h3>
                                    {getLogicTypeBadge(category.logic_type)}
                                </div>
                                <div className="category-stats">
                                    <span>📦 {category.products?.length || 0} produk</span>
                                    <span>🔧 {category.finishings?.length || 0} finishing</span>
                                </div>
                                <div className="category-actions">
                                    <button
                                        className="btn-edit"
                                        onClick={() => setCategoryModal({ isOpen: true, category })}
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDeleteCategory(category)}
                                    >
                                        🗑️ Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* FINISHINGS TAB */}
                {activeTab === 'finishings' && (
                    <div className="finishings-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nama Finishing</th>
                                    <th>Kategori</th>
                                    <th>Harga</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFinishings.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="empty-row">
                                            {searchQuery ? '🔍 Tidak ada hasil pencarian' : '🔧 Belum ada finishing'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredFinishings.map(finishing => (
                                        <tr key={finishing.id}>
                                            <td className="finishing-name">
                                                <strong>{finishing.name}</strong>
                                            </td>
                                            <td>{finishing.categoryName}</td>
                                            <td className="price-cell">
                                                {finishing.price === 0 ? (
                                                    <span className="free-badge">GRATIS</span>
                                                ) : (
                                                    formatRupiah(finishing.price)
                                                )}
                                            </td>
                                            <td className="action-cell">
                                                <button
                                                    className="btn-edit"
                                                    onClick={() => setFinishingModal({ isOpen: true, finishing, categoryId: finishing.categoryId })}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDeleteFinishing(finishing)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODALS */}
            <ProductFormModal
                isOpen={productModal.isOpen}
                onClose={() => setProductModal({ isOpen: false, product: null })}
                product={productModal.product}
                categories={categories}
                onSave={handleSaveProduct}
                onAddCategory={() => setCategoryModal({ isOpen: true, category: null })}
                onAddFinishing={(catId) => setFinishingModal({ isOpen: true, finishing: null, categoryId: catId })}
                allFinishings={allFinishings}
            />

            <CategoryFormModal
                isOpen={categoryModal.isOpen}
                onClose={() => setCategoryModal({ isOpen: false, category: null })}
                category={categoryModal.category}
                onSave={handleSaveCategory}
            />

            <FinishingFormModal
                isOpen={finishingModal.isOpen}
                onClose={() => setFinishingModal({ isOpen: false, finishing: null, categoryId: null })}
                finishing={finishingModal.finishing}
                categories={categories}
                categoryId={finishingModal.categoryId}
                onSave={handleSaveFinishing}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Hapus"
                cancelText="Batal"
                confirmColor="#ef4444"
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ isOpen: false })}
            />
        </div>
    );
}

export default ProductManager;
