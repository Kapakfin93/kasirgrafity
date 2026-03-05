import React, { useEffect, useState } from "react";

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
          <div className="form-group">
            <label>⚙️ Tipe Perhitungan Harga</label>
            <select
              value={formData.logic_type}
              onChange={(e) =>
                setFormData({ ...formData, logic_type: e.target.value })
              }
              disabled={!!category}
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

export default CategoryFormModal;
