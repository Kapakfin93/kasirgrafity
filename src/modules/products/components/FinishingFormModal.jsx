import React, { useEffect, useState } from "react";
import { formatRupiah } from "../../../core/formatters";

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

export default FinishingFormModal;
