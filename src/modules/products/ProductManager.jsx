/**
 * ProductManager.jsx - PHASE 2: Product Management Page
 * Admin/Owner page to manage products, categories, and finishings
 * Uses useProductStore for CRUD operations
 */

import React, { useEffect, useState } from "react";
import { useProductStore } from "../../stores/useProductStore";
import { usePermissions } from "../../hooks/usePermissions";
import { formatRupiah } from "../../core/formatters";
import { ConfirmModal } from "../../components/ConfirmModal";
import db from "../../data/db/schema"; // ✅ For data injection button
import { ArrowLeft, Mountain, Scroll, Image as ImageIcon } from "lucide-react";
import CategoryFormModal from "./components/CategoryFormModal";
import FinishingFormModal from "./components/FinishingFormModal";
import ProductFormModal from "./components/ProductFormModal";

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
  const [activeTab, setActiveTab] = useState("products"); // products | categories | finishings
  const [viewMode, setViewMode] = useState("PILLARS"); // 'PILLARS' | 'TABLE'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [productModal, setProductModal] = useState({
    isOpen: false,
    product: null,
  });
  const [categoryModal, setCategoryModal] = useState({
    isOpen: false,
    category: null,
  });
  const [finishingModal, setFinishingModal] = useState({
    isOpen: false,
    finishing: null,
    categoryId: null,
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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
  const allProducts = categories.flatMap((cat) =>
    (cat.products || []).map((p) => ({
      ...p,
      categoryId: cat.id,
      categoryName: cat.name,
      logicType: cat.logic_type,
    })),
  );

  // Get all finishings from all categories (flattened)
  const allFinishings = categories.flatMap((cat) =>
    (cat.finishings || []).map((f) => ({
      ...f,
      categoryId: cat.id,
      categoryName: cat.name,
    })),
  );

  // Filter products (use activeCategoryFilter in TABLE mode, otherwise use selectedCategoryId)
  const effectiveCategoryFilter =
    viewMode === "TABLE" && activeCategoryFilter
      ? activeCategoryFilter
      : selectedCategoryId;

  const filteredProducts = allProducts.filter((p) => {
    const matchesCategory =
      effectiveCategoryFilter === "all" ||
      p.categoryId === effectiveCategoryFilter;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter finishings
  const filteredFinishings = allFinishings.filter((f) => {
    const matchesCategory =
      selectedCategoryId === "all" || f.categoryId === selectedCategoryId;
    const matchesSearch = f.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================
  const handleSelectCategory = (categoryId) => {
    setActiveCategoryFilter(categoryId);
    setViewMode("TABLE");
  };

  const handleBackToPillars = () => {
    setViewMode("PILLARS");
    setActiveCategoryFilter(null);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleSaveProduct = async (data, productId) => {
    if (productId) {
      // Update existing
      const result = await updateProduct(productId, data);
      if (result && !result.success) {
        alert(`Gagal menyimpan: ${result.error}`);
        throw new Error(result.error); // throw to stop modal from closing
      }
    } else {
      // Add new
      await addProduct(data.categoryId, data);
    }
  };

  const handleDeleteProduct = (product) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ Hapus Produk",
      message: (
        <span>
          Yakin ingin menghapus produk <strong>"{product.name}"</strong>?
          <br />
          <br />
          <em style={{ color: "#94a3b8", fontSize: "12px" }}>
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
      title: "🗑️ Hapus Kategori",
      message: (
        <span>
          Yakin ingin menghapus kategori <strong>"{category.name}"</strong>?
          {productCount > 0 && (
            <>
              <br />
              <br />
              <span style={{ color: "#ef4444" }}>
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
      title: "🗑️ Hapus Finishing",
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

  // ============================================
  // TEMPORARY DATA INJECTION (BOOKLET FIX)
  // ============================================
  const fixBookletData = async () => {
    if (!confirm("Update Data Print Dokumen ke Format Baru?")) return;

    try {
      // 1. DELETE OLD DATA
      await db.products.delete("master_print_dokumen");

      // 2. INJECT NEW DATA
      await db.products.add({
        id: "master_print_dokumen",
        categoryId: "DIGITAL_A3_PRO", // Ensure this Category ID matches your DB!
        name: "PRINT DOKUMEN (A4/F4 HVS)",
        input_mode: "BOOKLET",
        calc_engine: "BOOKLET",
        base_price: 0,
        min_qty: 1,

        // VARIAN KERTAS
        variants: [
          { label: "HVS 70gr", price: 200, specs: "Putih Standar" },
          { label: "HVS 80gr", price: 250, specs: "Putih Tebal" },
          { label: "Bookpaper 72gr", price: 300, specs: "Krem Novel" },
          { label: "Art Paper 120gr", price: 500, specs: "Glossy" },
        ],

        // ONGKOS CETAK (PER KLIK)
        print_modes: [
          {
            id: "single_sided",
            label: "1 Sisi (Hitam Putih)",
            price: 300,
            description: "Teks Hitam Standard",
          },
          {
            id: "duplex_bw",
            label: "Bolak-Balik (Hitam Putih)",
            price: 500,
            description: "Hemat (Rp 250/muka)",
          },
          {
            id: "duplex_color",
            label: "Bolak-Balik (Full Color)",
            price: 1500,
            description: "Warna Tajam",
          },
        ],

        // FINISHING
        finishing_groups: [
          {
            id: "fin_binding",
            title: "Jilid / Binding",
            type: "radio",
            price_mode: "PER_JOB",
            required: false,
            options: [
              { label: "Tanpa Jilid", price: 0 },
              { label: "Staples Pojok", price: 2000 },
              { label: "Jilid Lakban", price: 3000 },
              { label: "Softcover", price: 15000 },
            ],
          },
          {
            id: "fin_cover",
            title: "Cover Depan",
            type: "radio",
            price_mode: "PER_JOB",
            options: [
              { label: "Tanpa Cover", price: 0 },
              { label: "Mika Bening", price: 3000 },
            ],
          },
        ],
        is_active: 1,
        is_archived: 0,
      });

      alert("✅ SUKSES! Data Print Dokumen sudah diperbarui.");
      window.location.reload(); // Refresh to see changes
    } catch (error) {
      console.error(error);
      alert("❌ GAGAL: " + error.message);
    }
  };

  // Get price display (SMART VERSION - handles all input modes)
  const getProductPriceDisplay = (product) => {
    // 1. If product uses Variants (Linear/Area/Matrix)
    if (
      ["LINEAR", "AREA", "MATRIX"].includes(product.input_mode) &&
      product.variants?.length > 0
    ) {
      let prices = [];

      if (product.input_mode === "MATRIX") {
        // For Matrix, dig deeper into price_list objects
        product.variants.forEach((v) => {
          if (v.price_list) {
            prices.push(...Object.values(v.price_list));
          }
        });
      } else {
        // For Linear/Area, just take the price field
        prices = product.variants.map((v) => v.price).filter((p) => p > 0);
      }

      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        // Show range if different, otherwise single price
        return min === max
          ? formatRupiah(min)
          : `${formatRupiah(min)} - ${formatRupiah(max)}`;
      }
    }

    // 2. Legacy support: Check old MATRIX format (product.prices)
    if (product.prices) {
      const values = Object.values(product.prices).filter((v) => v > 0);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        return min === max
          ? formatRupiah(min)
          : `${formatRupiah(min)} - ${formatRupiah(max)}`;
      }
    }

    // 3. Fallback to Base Price
    return formatRupiah(product.base_price || product.price || 0);
  };

  // Get logic type badge
  const getLogicTypeBadge = (logicType) => {
    const badges = {
      AREA: { bg: "#dbeafe", color: "#1d4ed8", icon: "📐" },
      LINEAR: { bg: "#dcfce7", color: "#15803d", icon: "📏" },
      MATRIX: { bg: "#fef3c7", color: "#b45309", icon: "🎯" },
      UNIT: { bg: "#f3e8ff", color: "#7c3aed", icon: "📦" },
      UNIT_SHEET: { bg: "#fce7f3", color: "#be185d", icon: "🖨️" },
      MANUAL: { bg: "#e2e8f0", color: "#475569", icon: "✏️" },
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
          <p className="subtitle">
            Manage products, categories, and finishings
          </p>
        </div>

        <div className="pm-actions">
          {/* TEMPORARY DATA INJECTION BUTTON */}
          <button
            className="btn-warning"
            onClick={fixBookletData}
            style={{
              backgroundColor: "#f59e0b",
              color: "#000",
              fontWeight: "bold",
              marginRight: "10px",
            }}
            title="Update PRINT DOKUMEN ke schema baru (additive pricing)"
          >
            🛠️ FIX DATA BOOKLET
          </button>

          {activeTab === "products" && viewMode === "TABLE" && (
            <button
              className="btn-primary"
              onClick={() =>
                setProductModal({
                  isOpen: true,
                  product: null,
                  preselectedCategory: activeCategoryFilter,
                })
              }
            >
              ➕ Tambah Produk{" "}
              {categories.find((c) => c.id === activeCategoryFilter)?.name}
            </button>
          )}
          {activeTab === "categories" && (
            <button
              className="btn-primary"
              onClick={() => setCategoryModal({ isOpen: true, category: null })}
            >
              ➕ Tambah Kategori
            </button>
          )}
          {activeTab === "finishings" && (
            <button
              className="btn-primary"
              onClick={() =>
                setFinishingModal({
                  isOpen: true,
                  finishing: null,
                  categoryId:
                    selectedCategoryId !== "all" ? selectedCategoryId : null,
                })
              }
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
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          📦 Produk ({allProducts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          📁 Kategori ({categories.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "finishings" ? "active" : ""}`}
          onClick={() => setActiveTab("finishings")}
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
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Cari:</label>
          <input
            type="text"
            placeholder="Ketik nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="pm-content">
        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <>
            {viewMode === "PILLARS" ? (
              /* CATEGORY PILLARS VIEW (Entry Point) */
              <div className="category-pillars-view">
                <div className="pillars-header">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">
                    📂 Pilih Kategori Produk
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Kelola produk berdasarkan kategori untuk menghindari
                    kesalahan input
                  </p>
                </div>

                <div className="category-pillars-grid">
                  {categories.map((category) => {
                    const productCount = allProducts.filter(
                      (p) => p.categoryId === category.id,
                    ).length;

                    // Icon mapping
                    const getCategoryIcon = (catId) => {
                      switch (catId) {
                        case "CAT_OUTDOOR":
                          return <Mountain className="w-12 h-12" />;
                        case "CAT_ROLLS":
                          return <Scroll className="w-12 h-12" />;
                        case "CAT_POSTER":
                          return <ImageIcon className="w-12 h-12" />;
                        default:
                          return <ImageIcon className="w-12 h-12" />;
                      }
                    };

                    return (
                      <div
                        key={category.id}
                        className="category-pillar-card group"
                        onClick={() => handleSelectCategory(category.id)}
                      >
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-400/20 transition-all duration-500"></div>

                        {/* Content */}
                        <div className="relative z-10">
                          {/* Icon */}
                          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 inline-flex group-hover:scale-110 transition-transform duration-300">
                            <div className="text-cyan-400">
                              {getCategoryIcon(category.id)}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-black text-white uppercase tracking-wide mb-2">
                            {category.name}
                          </h3>

                          {/* Description */}
                          <p className="text-cyan-400/70 text-sm mb-4 line-clamp-2">
                            {category.description}
                          </p>

                          {/* Product Count Badge */}
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-400 mb-4">
                            <span className="text-cyan-400">
                              {productCount}
                            </span>{" "}
                            produk
                          </div>

                          {/* Action Button */}
                          <button className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm tracking-wide uppercase hover:scale-[1.02] transition-transform shadow-lg shadow-cyan-500/25">
                            Kelola Produk →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* TABLE VIEW (Domain-Filtered) */
              <div className="domain-table-view">
                {/* Back Button & Domain Header */}
                <div className="domain-header">
                  <button onClick={handleBackToPillars} className="back-btn">
                    <ArrowLeft size={20} />
                    <span>Kembali ke Kategori</span>
                  </button>
                  <div className="domain-title">
                    <h2 className="text-xl font-bold text-cyan-400">
                      📂{" "}
                      {
                        categories.find((c) => c.id === activeCategoryFilter)
                          ?.name
                      }
                    </h2>
                    <p className="text-slate-500 text-sm">
                      {filteredProducts.length} produk dalam kategori ini
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() =>
                      setProductModal({
                        isOpen: true,
                        product: null,
                        preselectedCategory: activeCategoryFilter,
                      })
                    }
                  >
                    ➕ Tambah Produk{" "}
                    {
                      categories.find((c) => c.id === activeCategoryFilter)
                        ?.name
                    }
                  </button>
                </div>

                {/* Products Table */}
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
                            {searchQuery
                              ? "🔍 Tidak ada hasil pencarian"
                              : "📦 Belum ada produk di kategori ini"}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => (
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
                                onClick={() =>
                                  setProductModal({ isOpen: true, product })
                                }
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
              </div>
            )}
          </>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === "categories" && (
          <div className="categories-grid">
            {categories.map((category) => (
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
        {activeTab === "finishings" && (
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
                      {searchQuery
                        ? "🔍 Tidak ada hasil pencarian"
                        : "🔧 Belum ada finishing"}
                    </td>
                  </tr>
                ) : (
                  filteredFinishings.map((finishing) => (
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
                          onClick={() =>
                            setFinishingModal({
                              isOpen: true,
                              finishing,
                              categoryId: finishing.categoryId,
                            })
                          }
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
        preselectedCategory={productModal.preselectedCategory}
        onAddFinishing={(catId) =>
          setFinishingModal({
            isOpen: true,
            finishing: null,
            categoryId: catId,
          })
        }
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
        onClose={() =>
          setFinishingModal({
            isOpen: false,
            finishing: null,
            categoryId: null,
          })
        }
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
