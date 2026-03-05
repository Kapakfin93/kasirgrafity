import React, { useEffect, useState } from "react";
import { useProductStore } from "../../../stores/useProductStore";
import { formatRupiah } from "../../../core/formatters";
import { Edit, Plus } from "lucide-react";

function ProductFormModal({
  isOpen,
  onClose,
  product,
  categories,
  onSave,
  onAddCategory, // Callback to open category modal
  preselectedCategory, // NEW: Auto-select category in TABLE mode
}) {
  const { isSaving } = useProductStore();
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    categoryId: "",
    prices: null, // For MATRIX type
    input_mode: "",
    variants: null, // For LINEAR/AREA types
    finishing_groups: [], // For finishing options
    price_tiers: null, // For SHEET/TIERED types
    advanced_features: null, // For TIERED products (wholesale_rules)
    print_modes: null, // For BOOKLET type
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'pricing' | 'finishing'

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || 0,
        categoryId: product.categoryId || "",
        prices: product.prices || null,
        input_mode: product.input_mode || "",
        calc_engine: product.calc_engine || "", // ✅ WAJIB
        variants: product.variants || null,
        finishing_groups: product.finishing_groups || [],
        price_tiers: product.price_tiers || null,
        advanced_features: product.advanced_features || null,
        print_modes: product.print_modes || null,
      });
    } else {
      const defaultEngine =
        product?.calc_engine ||
        categories
          .find((c) => c.id === preselectedCategory)
          ?.logic_type?.toUpperCase() ||
        "UNIT";

      setFormData({
        name: "",
        price: 0,
        categoryId: preselectedCategory || categories[0]?.id || "",
        prices: null,
        input_mode: "",
        calc_engine: defaultEngine, // ✅ Explicit engine selection
        variants: null,
        finishing_groups: [],
        price_tiers: null,
        advanced_features: null,
        print_modes: null,
      });
    }
  }, [product, categories, isOpen, preselectedCategory]);

  // ✅ MATRIX READ GUARD: Fetch latest prices from Supabase for MATRIX products
  useEffect(() => {
    if (!product || !product.variants) return;

    // Perbolehkan jika MATRIX_FIXED ATAU jika produk mengandung nama "Nota" / "NCR"
    const isNota =
      product.name?.toLowerCase().includes("nota") ||
      product.name?.toLowerCase().includes("ncr");

    if (product.calc_engine !== "MATRIX_FIXED" && !isNota) {
      return;
    }
    (async () => {
      const { fetchMatrixPricesFromSupabase } =
        await import("../../../services/matrixPriceService");
      const updatedVariants = [...product.variants];
      let hasUpdates = false;
      for (let i = 0; i < updatedVariants.length; i++) {
        const variant = updatedVariants[i];
        if (variant.id) {
          const matrixPrices = await fetchMatrixPricesFromSupabase(
            product.id,
            variant.id,
          );
          if (matrixPrices && Object.keys(matrixPrices).length > 0) {
            // ✅ STRICT OVERRIDE: Use Supabase data, BLOCK fallback
            updatedVariants[i] = { ...variant, price_list: matrixPrices };
            hasUpdates = true;
            console.log(
              `✅ MATRIX READ SOURCE = SUPABASE | ${product.id} | ${variant.id}`,
            );
          }
        }
      }
      if (hasUpdates) {
        setFormData((prev) => ({ ...prev, variants: updatedVariants }));
      }
    })();
  }, [product, isOpen]);
  // jogo jogo //
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama produk tidak boleh kosong!");
      return;
    }
    if (!formData.categoryId) {
      alert("Pilih kategori!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, product?.id);
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Gagal menyimpan produk!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected category to check logic_type
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const isMatrixType = selectedCategory?.logic_type === "MATRIX";

  // Check if product has LINEAR or AREA mode with variants
  const hasVariantPricing =
    (formData.input_mode === "LINEAR" || formData.input_mode === "AREA") &&
    formData.variants?.length > 0 &&
    formData.calc_engine !== "MATRIX";

  // ============================================
  // FINISHING GROUPS HELPERS
  // ============================================

  const updateGroup = (groupIndex, field, value) => {
    const newGroups = [...formData.finishing_groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], [field]: value };
    setFormData({ ...formData, finishing_groups: newGroups });
  };

  const deleteGroup = (groupIndex) => {
    const newGroups = formData.finishing_groups.filter(
      (_, i) => i !== groupIndex,
    );
    setFormData({ ...formData, finishing_groups: newGroups });
  };

  const addNewGroup = () => {
    const newGroup = {
      id: `fin_${Date.now()}`,
      title: "Finishing Baru",
      type: "radio",
      price_mode: "FIXED",
      options: [{ label: "Opsi 1", price: 0 }],
    };
    setFormData({
      ...formData,
      finishing_groups: [...formData.finishing_groups, newGroup],
    });
  };

  const updateOption = (groupIndex, optionIndex, field, value) => {
    const newGroups = [...formData.finishing_groups];
    newGroups[groupIndex].options[optionIndex] = {
      ...newGroups[groupIndex].options[optionIndex],
      [field]: value,
    };
    setFormData({ ...formData, finishing_groups: newGroups });
  };

  const deleteOption = (groupIndex, optionIndex) => {
    const newGroups = [...formData.finishing_groups];
    newGroups[groupIndex].options = newGroups[groupIndex].options.filter(
      (_, i) => i !== optionIndex,
    );
    setFormData({ ...formData, finishing_groups: newGroups });
  };

  const addOption = (groupIndex) => {
    const newGroups = [...formData.finishing_groups];
    newGroups[groupIndex].options.push({
      label: "Opsi Baru",
      price: 0,
    });
    setFormData({ ...formData, finishing_groups: newGroups });
  };

  // ============================================
  // NUMBER FORMATTING HELPER
  // ============================================
  const formatNumber = (num) => {
    // JARING PENGAMAN: Cek dulu apakah angkanya valid
    if (num === undefined || num === null || isNaN(num)) {
      return "0"; // Kalau kosong, anggap saja 0 (Jangan error)
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // ============================================
  // VARIANT CRUD HELPERS
  // ============================================
  const deleteVariant = (variantIndex) => {
    const newVariants = formData.variants.filter((_, i) => i !== variantIndex);
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    const newVariant = {
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label: "Varian Baru",
      price: 0,
      specs: "",
    };
    const newVariants = [...(formData.variants || []), newVariant];
    setFormData({ ...formData, variants: newVariants });
  };

  const updateVariant = (variantIndex, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      [field]: value,
    };
    setFormData({ ...formData, variants: newVariants });
  };

  // ============================================
  // PRICE TIER HELPERS (FOR SHEET/TIERED)
  // ============================================
  const updateTier = (tierIndex, field, value) => {
    // Check if using price_tiers or wholesale_rules
    if (formData.price_tiers) {
      const newTiers = [...formData.price_tiers];
      newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: Number(value) };
      setFormData({ ...formData, price_tiers: newTiers });
    } else if (formData.advanced_features?.wholesale_rules) {
      const newRules = [...formData.advanced_features.wholesale_rules];
      newRules[tierIndex] = { ...newRules[tierIndex], [field]: Number(value) };
      setFormData({
        ...formData,
        advanced_features: {
          ...formData.advanced_features,
          wholesale_rules: newRules,
        },
      });
    }
  };

  const deleteTier = (tierIndex) => {
    if (formData.price_tiers) {
      const newTiers = formData.price_tiers.filter((_, i) => i !== tierIndex);
      setFormData({ ...formData, price_tiers: newTiers });
    } else if (formData.advanced_features?.wholesale_rules) {
      const newRules = formData.advanced_features.wholesale_rules.filter(
        (_, i) => i !== tierIndex,
      );
      setFormData({
        ...formData,
        advanced_features: {
          ...formData.advanced_features,
          wholesale_rules: newRules,
        },
      });
    }
  };

  const addTier = () => {
    if (formData.price_tiers || !formData.advanced_features) {
      const newTier = { min_qty: 1, max_qty: 10, price: 0 };
      const newTiers = [...(formData.price_tiers || []), newTier];
      setFormData({ ...formData, price_tiers: newTiers });
    } else if (formData.advanced_features?.wholesale_rules) {
      const newRule = { min: 1, max: 10, price: 0 };
      setFormData({
        ...formData,
        advanced_features: {
          ...formData.advanced_features,
          wholesale_rules: [
            ...formData.advanced_features.wholesale_rules,
            newRule,
          ],
        },
      });
    }
  };

  // ============================================
  // PRINT MODES HELPERS (FOR BOOKLET)
  // ============================================
  const updatePrintMode = (modeIndex, field, value) => {
    const newModes = [...formData.print_modes];
    newModes[modeIndex] = { ...newModes[modeIndex], [field]: value };
    setFormData({ ...formData, print_modes: newModes });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay-level-1" onClick={onClose}>
      <div
        className="modal-content product-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{product ? "✏️ Edit Produk" : "➕ Tambah Produk"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-700 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "general"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "pricing"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            💰 Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finishing")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "finishing"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🔧 Finishing
          </button>
          {/* MODE CETAK TAB (Only for BOOKLET) */}
          {formData.input_mode === "BOOKLET" && (
            <button
              type="button"
              onClick={() => setActiveTab("printmodes")}
              className={`px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === "printmodes"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ⚙️ Mode Cetak
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          {/* TAB CONTENT: GENERAL */}
          {activeTab === "general" && (
            <div className="tab-content">
              {/* Category Selector with [+] Button */}
              <div className="form-group">
                <label>📁 Kategori</label>
                <div className="input-with-action">
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    required
                    disabled={!!product} // Cannot change category when editing
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => (
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

              {/* Engine Selector (Explicitly for new products) */}
              <div className="form-group">
                <label>⚙️ Mesin Kalkulasi (Calc Engine)</label>
                <select
                  value={formData.calc_engine}
                  onChange={(e) =>
                    setFormData({ ...formData, calc_engine: e.target.value })
                  }
                  required
                  disabled={!!product} // Cannot change engine when editing
                >
                  <option value="UNIT">Per Satuan (Unit)</option>
                  <option value="AREA">Per Meter Persegi (m²)</option>
                  <option value="LINEAR_METER">Per Meter Lari</option>
                  <option value="MATRIX">Matrix (Ukuran × Bahan)</option>
                  <option value="BOOKLET">Per Halaman (Jilid)</option>
                  <option value="MANUAL">Input Manual Kasir</option>
                </select>
                <p className="form-hint text-xs text-slate-500 mt-1">
                  Menentukan bagaimana harga dihitung di kasir (tidak bisa
                  diubah setelah disimpan).
                </p>
              </div>

              {/* Product Name */}
              <div className="form-group">
                <label>📦 Nama Produk</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Flexi 280gr Standard"
                  required
                />
              </div>

              {/* Finishing preview removed - now in Finishing tab */}
            </div>
          )}

          {/* TAB CONTENT: PRICING */}
          {activeTab === "pricing" && (
            <div className="tab-content">
              {/* PRIORITY 1: TIERED MODE (Hybrid: Variants + Tiers) */}
              {/* MODIFIED: Check TIERED string OR Structural Traits (Variants + Tiers) */}
              {(formData.input_mode === "TIERED" ||
                // Fallback for legacy data: treat as TIERED if it behaves like one
                (formData.variants?.length > 0 &&
                  (formData.price_tiers?.length > 0 ||
                    formData.advanced_features?.wholesale_rules?.length >
                      0))) &&
              formData.calc_engine !== "MATRIX" ? (
                <div className="space-y-6">
                  {/* SECTION A: Variant Editor (Always Visible for TIERED) */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-cyan-400 font-bold flex items-center gap-2">
                          <Edit size={16} /> 1. Varian / Tipe Produk
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Contoh: Softcover, Hardcover, Kalender Meja, dll.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="text-xs bg-cyan-600 text-white px-3 py-2 rounded-lg hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 flex items-center gap-1 font-bold transition-colors"
                      >
                        + Tambah Varian
                      </button>
                    </div>

                    {!formData.variants || formData.variants.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                        <p className="text-slate-500 text-sm mb-2">
                          Produk ini belum memiliki varian tipe.
                        </p>
                        <p className="text-xs text-slate-600">
                          Klik tombol "+ Tambah Varian" di atas jika produk ini
                          punya tipe beda harga (misal: Softcover vs Hardcover).
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {formData.variants.map((variant, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-center bg-slate-900 p-3 rounded-lg border border-slate-700/50 animate-in fade-in slide-in-from-top-2"
                            >
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 mb-1 block">
                                  Nama Varian
                                </label>
                                <input
                                  type="text"
                                  value={variant.label}
                                  onChange={(e) =>
                                    updateVariant(idx, "label", e.target.value)
                                  }
                                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 font-medium focus:border-cyan-500 outline-none"
                                  placeholder="Contoh: Softcover 180"
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-[10px] text-slate-500 mb-1 block">
                                  Harga Dasar (Rp)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2 top-2 text-xs text-slate-500">
                                    Rp
                                  </span>
                                  <input
                                    type="text"
                                    value={
                                      variant.price
                                        ? new Intl.NumberFormat("id-ID").format(
                                            variant.price,
                                          )
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const rawValue = Number(
                                        e.target.value.replace(/\D/g, ""),
                                      );
                                      updateVariant(
                                        idx,
                                        "price",
                                        isNaN(rawValue) ? 0 : rawValue,
                                      );
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-2 py-1 text-right text-yellow-400 font-mono text-sm focus:border-cyan-500 outline-none"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="pt-5">
                                <button
                                  type="button"
                                  onClick={() => deleteVariant(idx)}
                                  className="text-slate-600 hover:text-red-500 text-xl px-2 transition-colors"
                                  title="Hapus Varian"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          💡 Harga dasar untuk setiap tipe/varian produk
                        </p>
                      </>
                    )}
                  </div>

                  {/* SECTION B: Tier Table (Always Show for TIERED) */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                      <Edit size={16} />{" "}
                      {formData.variants?.length > 0
                        ? "2. Aturan Harga Grosir (Tiers)"
                        : "Aturan Harga Grosir (Tiers)"}
                    </h3>
                    <div className="space-y-3">
                      {(
                        formData.price_tiers ||
                        formData.advanced_features?.wholesale_rules ||
                        []
                      ).map((tier, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700/50"
                        >
                          {/* Min Qty */}
                          <div className="w-24">
                            <label className="text-[10px] text-slate-500 mb-1 block">
                              Min Qty
                            </label>
                            <input
                              type="number"
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                              value={tier.min_qty || tier.min || 0}
                              onChange={(e) =>
                                updateTier(
                                  index,
                                  tier.min_qty !== undefined
                                    ? "min_qty"
                                    : "min",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          {/* Max Qty */}
                          <div className="w-24">
                            <label className="text-[10px] text-slate-500 mb-1 block">
                              Max Qty
                            </label>
                            <input
                              type="number"
                              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                              value={tier.max_qty || tier.max || 0}
                              onChange={(e) =>
                                updateTier(
                                  index,
                                  tier.max_qty !== undefined
                                    ? "max_qty"
                                    : "max",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          {/* Price */}
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 mb-1 block">
                              Harga Satuan (Rp)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-yellow-400 font-mono text-sm focus:border-cyan-500 outline-none"
                              // REVISI: Cek 'price' ATAU 'value' (biar tidak 0)
                              value={tier.price ?? tier.value ?? 0}
                              onChange={(e) =>
                                // REVISI: Deteksi otomatis mau update 'price' atau 'value'
                                updateTier(
                                  index,
                                  tier.value !== undefined ? "value" : "price",
                                  e.target.value,
                                )
                              }
                            />
                            <span className="text-[10px] text-slate-600 mt-1 block text-right">
                              {/* REVISI: Tampilkan format angka yang benar */}
                              {formatNumber(tier.price ?? tier.value)}
                            </span>
                          </div>
                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => deleteTier(index)}
                            className="text-slate-600 hover:text-red-500 text-xl px-2 transition-colors"
                            title="Hapus Tier"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add Tier Button */}
                    <button
                      type="button"
                      onClick={addTier}
                      className="mt-3 w-full py-2 border border-dashed border-cyan-500/30 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors text-sm"
                    >
                      ➕ Tambah Tier Baru
                    </button>
                    <p className="text-xs text-slate-400 mt-3">
                      {formData.variants?.length > 0
                        ? "💡 Harga grosir akan menggantikan harga dasar saat Qty tercapai"
                        : "💡 Harga berdasarkan jumlah pesanan (quantity-based pricing)"}
                    </p>
                  </div>
                </div>
              ) : /* PRIORITY 2: LINEAR/AREA with variants */
              hasVariantPricing ? (
                /* VARIANT PRICING TABLE (For LINEAR/AREA) */
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                  <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
                    <Edit size={16} /> Edit Harga Varian
                  </h3>
                  <div className="space-y-3">
                    {formData.variants.map((variant, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex-1 space-y-2">
                          {/* Variant Label - Editable */}
                          <input
                            type="text"
                            value={variant.label}
                            onChange={(e) =>
                              updateVariant(index, "label", e.target.value)
                            }
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 font-medium focus:border-cyan-500 outline-none"
                            placeholder="Label Varian"
                          />
                          {/* Specs - Editable */}
                          <input
                            type="text"
                            value={variant.specs || ""}
                            onChange={(e) =>
                              updateVariant(index, "specs", e.target.value)
                            }
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-400 focus:border-cyan-500 outline-none"
                            placeholder="Specs (contoh: Outdoor Standard)"
                          />
                        </div>
                        {/* Price Input */}
                        <div className="w-32">
                          <label className="text-[10px] text-slate-500 mb-1 block">
                            Harga Satuan (Rp)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-yellow-400 font-mono text-sm focus:border-cyan-500 outline-none"
                            value={
                              variant.price
                                ? new Intl.NumberFormat("id-ID").format(
                                    variant.price,
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const rawValue = Number(
                                e.target.value.replace(/\D/g, ""),
                              );
                              updateVariant(
                                index,
                                "price",
                                isNaN(rawValue) ? 0 : rawValue,
                              );
                            }}
                          />
                        </div>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteVariant(index)}
                          className="text-slate-600 hover:text-red-500 text-xl px-2 transition-colors mt-1"
                          title="Hapus Varian"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Variant Button */}
                  <button
                    type="button"
                    onClick={addVariant}
                    className="mt-3 w-full py-2 border border-dashed border-cyan-500/30 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors text-sm"
                  >
                    ➕ Tambah Varian Baru
                  </button>
                  <p className="text-xs text-slate-500 mt-3">
                    💡{" "}
                    {formData.input_mode === "LINEAR"
                      ? "Harga per meter lari"
                      : "Harga per meter persegi (m²)"}
                  </p>
                </div>
              ) : /* PRIORITY 3: SHEET mode with tiers */
              formData.input_mode === "SHEET" &&
                (formData.price_tiers?.length > 0 ||
                  formData.advanced_features?.wholesale_rules?.length > 0) &&
                formData.calc_engine !== "MATRIX" ? (
                /* SHEET PRICING (Legacy TIERED without variants) */
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                  <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                    <Edit size={16} /> Edit Harga Bertingkat (Sheet)
                  </h3>
                  <div className="space-y-3">
                    {(
                      formData.price_tiers ||
                      formData.advanced_features?.wholesale_rules ||
                      []
                    ).map((tier, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700/50"
                      >
                        {/* Min Qty */}
                        <div className="w-24">
                          <label className="text-[10px] text-slate-500 mb-1 block">
                            Min Qty
                          </label>
                          <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                            value={tier.min_qty || tier.min || 0}
                            onChange={(e) =>
                              updateTier(
                                index,
                                tier.min_qty !== undefined ? "min_qty" : "min",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        {/* Max Qty */}
                        <div className="w-24">
                          <label className="text-[10px] text-slate-500 mb-1 block">
                            Max Qty
                          </label>
                          <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                            value={tier.max_qty || tier.max || 0}
                            onChange={(e) =>
                              updateTier(
                                index,
                                tier.max_qty !== undefined ? "max_qty" : "max",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        {/* Price */}
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 mb-1 block">
                            Harga Satuan (Rp)
                          </label>
                          <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-yellow-400 font-mono text-sm focus:border-cyan-500 outline-none"
                            value={tier.price}
                            onChange={(e) =>
                              updateTier(index, "price", e.target.value)
                            }
                          />
                          <span className="text-[10px] text-slate-600 mt-1 block text-right">
                            {formatNumber(tier.price)}
                          </span>
                        </div>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteTier(index)}
                          className="text-slate-600 hover:text-red-500 text-xl px-2 transition-colors"
                          title="Hapus Tier"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add Tier Button */}
                  <button
                    type="button"
                    onClick={addTier}
                    className="mt-3 w-full py-2 border border-dashed border-cyan-500/30 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors text-sm"
                  >
                    ➕ Tambah Tier Baru
                  </button>
                  <p className="text-xs text-slate-500 mt-3">
                    💡 Harga berdasarkan jumlah pesanan (quantity-based pricing)
                  </p>
                </div>
              ) : /* PRIORITY 4: MATRIX products */
              (formData.input_mode === "MATRIX" ||
                  formData.calc_engine === "MATRIX") &&
                formData.variants?.length > 0 ? (
                /* DEEP MATRIX EDITOR (For POSTER with price_list) */
                <div className="space-y-6">
                  {/* MATRIX EDITOR - NOW FULLY EDITABLE */}
                  {/* MATRIX EDITOR - NOW TRULY EDITABLE */}
                  <div>
                    <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                      <Edit size={16} /> Edit Harga Matrix (Per Ukuran & Bahan)
                    </h3>
                    {formData.variants.map((variant, vIndex) => (
                      <div
                        key={vIndex}
                        className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-3 relative group"
                      >
                        {/* HEADER: EDITABLE LABEL & SPECS */}
                        <div className="flex gap-2 mb-3 pr-8">
                          <input
                            type="text"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-cyan-400 font-bold focus:border-cyan-500 outline-none"
                            placeholder="Nama Bahan (contoh: Art Paper)"
                            value={variant.label}
                            onChange={(e) => {
                              const newVariants = [...formData.variants];
                              newVariants[vIndex] = {
                                ...newVariants[vIndex],
                                label: e.target.value,
                                name: e.target.value, // Sync name too
                              };
                              setFormData({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                          <input
                            type="text"
                            className="w-1/3 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 text-sm focus:border-cyan-500 outline-none"
                            placeholder="Specs (opsional)"
                            value={variant.specs || ""}
                            onChange={(e) => {
                              const newVariants = [...formData.variants];
                              newVariants[vIndex] = {
                                ...newVariants[vIndex],
                                specs: e.target.value,
                              };
                              setFormData({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                        </div>

                        {/* DELETE BUTTON (Floating Top Right) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Hapus bahan ini?")) {
                              const newVariants = formData.variants.filter(
                                (_, i) => i !== vIndex,
                              );
                              setFormData({
                                ...formData,
                                variants: newVariants,
                              });
                            }
                          }}
                          className="absolute top-2 right-2 text-slate-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus Bahan"
                        >
                          🗑️
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {
                            /* LOGIC UPDATE: Handle Existing Keys + Phantom Keys for Nota */
                            (() => {
                              // 1. Safely retrieve existing data from DB/State
                              const existingData = variant.price_list || {};
                              let renderKeys = Object.keys(existingData);

                              // 2. STRICT CONDITION: Only inject keys if product is specifically 'Nota' or 'NCR'
                              // This prevents "pollution" of other products (like Banner/Sticker)
                              const isNotaTarget =
                                formData.name?.toLowerCase().includes("nota") ||
                                formData.name?.toLowerCase().includes("ncr") ||
                                formData.categoryId === "STATIONERY";

                              if (isNotaTarget) {
                                // Those are the "Phantom Slots" required for UX
                                const requiredFolioKeys = [
                                  "FOLIO_1_4",
                                  "FOLIO_1_3",
                                  "FOLIO_1_2",
                                  "FOLIO_1_1",
                                ];
                                // Merge unique keys (maintain existing data + add missing slots)
                                renderKeys = Array.from(
                                  new Set([
                                    ...renderKeys,
                                    ...requiredFolioKeys,
                                  ]),
                                );
                              }

                              // ⚠️ If New Material & No Keys yet, show default hints or empty
                              if (renderKeys.length === 0 && isNotaTarget) {
                                // Force keys for new material in Nota
                                renderKeys = [
                                  "FOLIO_1_4",
                                  "FOLIO_1_3",
                                  "FOLIO_1_2",
                                  "FOLIO_1_1",
                                ];
                              } else if (renderKeys.length === 0) {
                                // For generic matrix (A3/Indoor), maybe show SIDE_1 / SIDE_2 default?
                                // Or fetch product_sizes?
                                // For now, let's look at the product name to guess.
                                // Or just show "SIDE_1" and "SIDE_2" as default start.
                                renderKeys = ["SIDE_1", "SIDE_2"];
                              }

                              // 3. Render the Loop using the computed keys
                              return renderKeys.map((key) => {
                                // ALIASING: Ensure variables match the original code's expectation
                                const materialName = key; // The key acts as the identifier
                                const price = existingData[key] || 0; // Use DB price OR 0 if it's a new phantom slot

                                return (
                                  <div
                                    key={materialName}
                                    className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700/50"
                                  >
                                    <span className="text-xs text-slate-300">
                                      {materialName === "FOLIO_1_4"
                                        ? "1/4 Folio (10x16)"
                                        : materialName === "FOLIO_1_3"
                                          ? "1/3 Folio (10x21)"
                                          : materialName === "FOLIO_1_2"
                                            ? "1/2 Folio (16x21)"
                                            : materialName === "FOLIO_1_1"
                                              ? "1 Folio (21x33)"
                                              : materialName === "FOLIO_1"
                                                ? "1 Folio (21x33)"
                                                : materialName === "SIDE_1"
                                                  ? "1 Sisi"
                                                  : materialName === "SIDE_2"
                                                    ? "2 Sisi"
                                                    : materialName}
                                    </span>
                                    <input
                                      type="text"
                                      className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-yellow-400 text-sm focus:border-cyan-500 outline-none"
                                      value={
                                        price
                                          ? new Intl.NumberFormat(
                                              "id-ID",
                                            ).format(price)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const rawValue = Number(
                                          e.target.value.replace(/\D/g, ""),
                                        );
                                        const newVariants = [
                                          ...formData.variants,
                                        ];
                                        // Update nested price_list
                                        // Ensure price_list object exists before assignment
                                        if (!newVariants[vIndex].price_list) {
                                          newVariants[vIndex].price_list = {};
                                        }
                                        newVariants[vIndex].price_list[
                                          materialName
                                        ] = isNaN(rawValue) ? 0 : rawValue;
                                        setFormData({
                                          ...formData,
                                          variants: newVariants,
                                        });
                                      }}
                                    />
                                  </div>
                                );
                              });
                            })()
                          }
                        </div>
                      </div>
                    ))}

                    {/* ADD NEW MATERIAL BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          variants: [
                            ...formData.variants,
                            {
                              label: "",
                              name: "",
                              specs: "",
                              price: 0,
                              price_list: {},
                              is_active: true,
                              // id will be undefined, triggering Insert logic
                            },
                          ],
                        });
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                      <Plus size={20} /> Tambah Bahan Baru
                    </button>

                    <p className="text-xs text-slate-500 mt-3">
                      💡 Harga per lembar sesuai ukuran dan bahan kertas
                    </p>

                    {/* SMALL RESET LINK - Bottom, unobtrusive */}
                    <div className="mt-4 pt-4 border-t border-slate-700/30">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (
                            confirm(
                              "Yakin ingin reset ke mode Varian kosong? Data Matrix akan dihapus.",
                            )
                          ) {
                            setFormData((prev) => ({
                              ...prev,
                              input_mode: "TIERED",
                              variants: [],
                              price_tiers: [],
                            }));
                          }
                        }}
                        className="text-xs text-slate-500 hover:text-red-400 underline transition-colors"
                      >
                        ↻ Reset ke Mode Varian (Hybrid)
                      </button>
                    </div>
                  </div>
                </div>
              ) : isMatrixType ? (
                /* LEGACY MATRIX PRICING (Old format) */
                <div className="form-group">
                  <label>💰 Harga per Ukuran (MATRIX)</label>
                  <div className="matrix-prices">
                    {(() => {
                      // 1. Definisikan Ukuran Standar
                      let visibleSizes = ["A2", "A1", "A0"];

                      // 2. Deteksi Jika Produk adalah NOTA / NCR
                      // Kita cek nama produk (lowercase) atau kategori ID
                      const isNota =
                        formData.name?.toLowerCase().includes("nota") ||
                        formData.name?.toLowerCase().includes("ncr") ||
                        formData.categoryId === "STATIONERY";

                      // 3. Jika Nota, Gunakan Ukuran Folio
                      if (isNota) {
                        visibleSizes = [
                          "FOLIO_1_4",
                          "FOLIO_1_3",
                          "FOLIO_1_2",
                          "FOLIO_1_1",
                        ];
                      }

                      // 4. Render Mapping
                      return visibleSizes.map((size) => (
                        <div key={size} className="matrix-price-row">
                          <span className="size-label">{size}</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.prices?.[size] || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                prices: {
                                  ...formData.prices,
                                  [size]: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                /* STANDARD SINGLE PRICE (For UNIT/MERCHANDISE) */
                <>
                  <div className="form-group">
                    <label>💰 Harga (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                    <span className="form-hint">
                      {formatRupiah(formData.price)}
                    </span>
                  </div>

                  {/* CONVERT TO HYBRID BUTTON */}
                  <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 border-dashed rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-cyan-400 font-bold text-sm">
                        ✨ Mode Varian & Grosir
                      </h4>
                      <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                        Produk ini punya banyak tipe (Standard, Premium, dll)
                        atau harga bertingkat?
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // FORCE CONVERT TO TIERED
                        setFormData({
                          ...formData,
                          input_mode: "TIERED",
                          variants: formData.variants || [], // Initialize array if null
                          price_tiers: formData.price_tiers || [], // Initialize tiers
                        });
                      }}
                      className="bg-cyan-900/50 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-500/30 px-4 py-2 rounded-lg transition-all text-xs font-bold shadow-lg"
                    >
                      🔄 Aktifkan Mode Varian
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB CONTENT: FINISHING */}
          {activeTab === "finishing" && (
            <div className="tab-content">
              <div className="space-y-6">
                {/* 1. LIST EXISTING GROUPS */}
                {formData.finishing_groups?.length > 0 ? (
                  formData.finishing_groups.map((group, gIndex) => (
                    <div
                      key={gIndex}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-4"
                    >
                      {/* Group Header */}
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-800">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={group.title}
                            onChange={(e) =>
                              updateGroup(gIndex, "title", e.target.value)
                            }
                            className="bg-transparent text-cyan-400 font-bold text-lg focus:outline-none focus:border-b border-cyan-500 w-full"
                            placeholder="Nama Grup Finishing"
                          />
                          <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                            <span>Mode Harga:</span>
                            <select
                              value={group.price_mode}
                              onChange={(e) =>
                                updateGroup(
                                  gIndex,
                                  "price_mode",
                                  e.target.value,
                                )
                              }
                              className="bg-slate-800 border border-slate-600 text-slate-300 rounded px-2 py-1 text-xs focus:border-cyan-500 outline-none"
                            >
                              <option value="FIXED">Per Pcs (Fixed)</option>
                              <option value="PER_METER">Per Meter Lari</option>
                              <option value="PER_SQM">Per Meter Persegi</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteGroup(gIndex)}
                          className="text-red-500 hover:text-red-400 text-xs font-medium ml-4 px-3 py-1 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                        >
                          🗑️ Hapus Grup
                        </button>
                      </div>

                      {/* Options List */}
                      <div className="space-y-2">
                        {group.options?.map((opt, oIndex) => (
                          <div
                            key={oIndex}
                            className="flex gap-2 items-center bg-slate-800/50 p-2 rounded-lg"
                          >
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) =>
                                updateOption(
                                  gIndex,
                                  oIndex,
                                  "label",
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                              placeholder="Nama Opsi (e.g., Glossy, Doff)"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Rp</span>
                              <input
                                type="text"
                                value={
                                  opt.price
                                    ? new Intl.NumberFormat("id-ID").format(
                                        opt.price,
                                      )
                                    : ""
                                }
                                onChange={(e) => {
                                  const rawValue = Number(
                                    e.target.value.replace(/\D/g, ""),
                                  );
                                  updateOption(
                                    gIndex,
                                    oIndex,
                                    "price",
                                    isNaN(rawValue) ? 0 : rawValue,
                                  );
                                }}
                                className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-yellow-400 text-right font-mono focus:border-cyan-500 outline-none"
                                placeholder="0"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteOption(gIndex, oIndex)}
                              className="text-slate-600 hover:text-red-500 text-xl font-bold px-2 transition-colors"
                              title="Hapus Opsi"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {/* Add Option Button */}
                        <button
                          type="button"
                          onClick={() => addOption(gIndex)}
                          className="mt-2 w-full py-2 text-xs text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-dashed border-cyan-500/30 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          ➕ Tambah Opsi
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
                    <p className="text-slate-500 text-sm mb-4">
                      ℹ️ Belum ada grup finishing untuk produk ini
                    </p>
                    <p className="text-slate-600 text-xs">
                      Klik tombol di bawah untuk membuat grup baru
                    </p>
                  </div>
                )}

                {/* 2. ADD NEW GROUP BUTTON */}
                <button
                  type="button"
                  onClick={addNewGroup}
                  className="w-full py-4 border-2 border-dashed border-slate-600 text-slate-400 rounded-xl hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  ➕ Buat Grup Finishing Baru
                </button>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PRINT MODES (BOOKLET only) */}
          {activeTab === "printmodes" && formData.input_mode === "BOOKLET" && (
            <div className="tab-content">
              <div className="space-y-4">
                <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-xl p-4">
                  <h3 className="text-cyan-400 font-bold mb-2 flex items-center gap-2">
                    ⚙️ Mode Cetak / Print Modes
                  </h3>
                  <p className="text-xs text-slate-400">
                    Edit harga tinta/klik per lembar untuk setiap mode cetak.
                    Harga kertas ada di tab Pricing (Variants).
                  </p>
                </div>

                {formData.print_modes && formData.print_modes.length > 0 ? (
                  <div className="space-y-3">
                    {formData.print_modes.map((mode, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800 p-4 rounded-xl border border-slate-700"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Label */}
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Label
                            </label>
                            <input
                              type="text"
                              value={mode.label}
                              onChange={(e) =>
                                updatePrintMode(idx, "label", e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                              placeholder="Contoh: 1 Sisi (Hitam Putih)"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Harga Cetak per Lembar (Rp)
                            </label>
                            <input
                              type="text"
                              value={
                                mode.price
                                  ? new Intl.NumberFormat("id-ID").format(
                                      mode.price,
                                    )
                                  : ""
                              }
                              onChange={(e) => {
                                const rawValue = Number(
                                  e.target.value.replace(/\D/g, ""),
                                );
                                updatePrintMode(
                                  idx,
                                  "price",
                                  isNaN(rawValue) ? 0 : rawValue,
                                );
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-right text-yellow-400 font-mono text-sm focus:border-cyan-500 outline-none"
                              placeholder="0"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Deskripsi
                            </label>
                            <input
                              type="text"
                              value={mode.description || ""}
                              onChange={(e) =>
                                updatePrintMode(
                                  idx,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-400 focus:border-cyan-500 outline-none"
                              placeholder="Hemat, Rp 250/muka"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
                    <p className="text-slate-500 text-sm">
                      ℹ️ Belum ada print modes untuk produk ini
                    </p>
                  </div>
                )}

                <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-3">
                  <p className="text-xs text-amber-400">
                    💡 <strong>Catatan:</strong> ID mode cetak tidak bisa
                    diubah. Hanya Label, Price, dan Description yang bisa
                    diedit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={isSaving || isSubmitting}
            >
              {isSaving || isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
