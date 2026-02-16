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
import {
  Edit,
  ArrowLeft,
  Mountain,
  Scroll,
  Image as ImageIcon,
  Plus,
} from "lucide-react";

// ============================================
// PRODUCT FORM MODAL (with In-Context Creation)
// ============================================
function ProductFormModal({
  isOpen,
  onClose,
  product,
  categories,
  onSave,
  onAddCategory, // Callback to open category modal
  preselectedCategory, // NEW: Auto-select category in TABLE mode
}) {
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
      setFormData({
        name: "",
        price: 0,
        categoryId: preselectedCategory || categories[0]?.id || "",
        prices: null,
        input_mode: "",
        calc_engine: "", // ✅ WAJIB
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
        await import("../../services/matrixPriceService");
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
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan"}
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
    name: "",
    logic_type: "UNIT",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const LOGIC_TYPES = [
    { value: "AREA", label: "📐 AREA (m² × harga)", desc: "Banner, Spanduk" },
    {
      value: "LINEAR",
      label: "📏 LINEAR (meter × harga)",
      desc: "Kain, Textile",
    },
    { value: "MATRIX", label: "🎯 MATRIX (A0/A1/A2)", desc: "Poster" },
    { value: "UNIT", label: "📦 UNIT (per item)", desc: "Merchandise" },
    {
      value: "UNIT_SHEET",
      label: "🖨️ UNIT_SHEET (per lembar)",
      desc: "A3+ Digital",
    },
    { value: "MANUAL", label: "✏️ MANUAL (input bebas)", desc: "Custom" },
  ];

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        logic_type: category.logic_type || "UNIT",
      });
    } else {
      setFormData({ name: "", logic_type: "UNIT" });
    }
  }, [category, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama kategori tidak boleh kosong!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, category?.id);
      onClose();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Gagal menyimpan kategori!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay-level-2" onClick={onClose}>
      <div
        className="modal-content category-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{category ? "✏️ Edit Kategori" : "➕ Tambah Kategori"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="category-form">
          {/* Category Name */}
          <div className="form-group">
            <label>📁 Nama Kategori</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Contoh: Banner / Spanduk"
              required
            />
          </div>

          {/* Logic Type */}
          <div className="form-group">
            <label>⚙️ Tipe Perhitungan Harga</label>
            <select
              value={formData.logic_type}
              onChange={(e) =>
                setFormData({ ...formData, logic_type: e.target.value })
              }
              disabled={!!category} // Cannot change logic_type when editing
            >
              {LOGIC_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {LOGIC_TYPES.find((t) => t.value === formData.logic_type)?.desc}
            </span>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan"}
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
function FinishingFormModal({
  isOpen,
  onClose,
  finishing,
  categories,
  categoryId,
  onSave,
}) {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    categoryId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (finishing) {
      setFormData({
        name: finishing.name || "",
        price: finishing.price || 0,
        categoryId: finishing.categoryId || categoryId || "",
      });
    } else {
      setFormData({
        name: "",
        price: 0,
        categoryId: categoryId || categories[0]?.id || "",
      });
    }
  }, [finishing, categoryId, categories, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama finishing tidak boleh kosong!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, finishing?.id);
      onClose();
    } catch (error) {
      console.error("Error saving finishing:", error);
      alert("Gagal menyimpan finishing!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay-level-2" onClick={onClose}>
      <div
        className="modal-content finishing-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{finishing ? "✏️ Edit Finishing" : "➕ Tambah Finishing"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="finishing-form">
          {/* Category Selector */}
          <div className="form-group">
            <label>📁 Kategori</label>
            <select
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
              required
              disabled={!!finishing}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((cat) => (
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
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseInt(e.target.value) || 0,
                })
              }
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
              {isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan"}
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
      await updateProduct(productId, data);
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
