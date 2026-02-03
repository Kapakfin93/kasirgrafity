/**
 * EmployeeForm Component
 * Add/Edit employee (modal)
 *
 * AGILE SCHEMA:
 * - Role: Free TEXT input with datalist suggestions
 * - Shift: REMOVED
 */

import React, { useState, useEffect } from "react";
import { useEmployeeStore } from "../../stores/useEmployeeStore";

export function EmployeeForm({ employee, onClose, onSuccess }) {
  const { addEmployee, updateEmployee } = useEmployeeStore();
  const isEdit = !!employee;

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    pin: "",
    confirmPin: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load employee data if editing
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        role: employee.role,
        pin: employee.pin,
        confirmPin: employee.pin,
      });
    }
  }, [employee]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Nama minimal 3 karakter";
    }

    if (!formData.role || formData.role.trim().length < 2) {
      newErrors.role = "Role harus diisi (contoh: Kasir, Produksi)";
    }

    if (
      !formData.pin ||
      formData.pin.length !== 4 ||
      !/^\d{4}$/.test(formData.pin)
    ) {
      newErrors.pin = "PIN harus 4 digit angka";
    }

    if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = "PIN tidak sama";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const employeeData = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        pin: formData.pin,
        status: "ACTIVE",
      };

      if (isEdit) {
        await updateEmployee(employee.id, employeeData);
        alert("✅ Data karyawan berhasil diupdate");
      } else {
        await addEmployee(employeeData);
        alert("✅ Karyawan baru berhasil ditambahkan");
      }

      onSuccess();
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "✏️ Edit Karyawan" : "➕ Tambah Karyawan Baru"}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          {/* Name */}
          <div className="form-group">
            <label>Nama Lengkap *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className={errors.name ? "error" : ""}
              autoFocus
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Role - AGILE: Free TEXT with datalist */}
          <div className="form-group">
            <label>Role / Jabatan *</label>
            <input
              type="text"
              list="role-suggestions"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="Ketik atau pilih role..."
              className={errors.role ? "error" : ""}
            />
            <datalist id="role-suggestions">
              <option value="Kasir" />
              <option value="Produksi" />
              <option value="Admin" />
              <option value="Desainer" />
              <option value="Kurir" />
            </datalist>
            {errors.role && <span className="error-text">{errors.role}</span>}
            <small className="help-text">
              Ketik bebas atau pilih dari saran: Kasir, Produksi, Admin, dll
            </small>
          </div>

          {/* PIN */}
          <div className="form-group">
            <label>PIN (4 Digit) *</label>
            <input
              type="password"
              maxLength={4}
              value={formData.pin}
              onChange={(e) =>
                handleChange("pin", e.target.value.replace(/\D/g, ""))
              }
              placeholder="0000"
              className={errors.pin ? "error" : ""}
            />
            {errors.pin && <span className="error-text">{errors.pin}</span>}
            <small className="help-text">PIN untuk login dan absensi</small>
          </div>

          {/* Confirm PIN */}
          <div className="form-group">
            <label>Konfirmasi PIN *</label>
            <input
              type="password"
              maxLength={4}
              value={formData.confirmPin}
              onChange={(e) =>
                handleChange("confirmPin", e.target.value.replace(/\D/g, ""))
              }
              placeholder="0000"
              className={errors.confirmPin ? "error" : ""}
            />
            {errors.confirmPin && (
              <span className="error-text">{errors.confirmPin}</span>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "⏳ Menyimpan..." : isEdit ? "💾 Update" : "✅ Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
