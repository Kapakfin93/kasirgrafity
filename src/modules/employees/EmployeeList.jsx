/**
 * EmployeeList Component
 * Manage employees (OWNER only)
 *
 * AGILE SCHEMA: No shift column, agile role display
 */

import React, { useEffect, useState } from "react";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { usePermissions } from "../../hooks/usePermissions";
import { EmployeeForm } from "./EmployeeForm";

export function EmployeeList() {
  const {
    employees,
    loadEmployees,
    deleteEmployee,
    syncFromCloud,
    loading,
    error,
    syncStatus,
  } = useEmployeeStore();

  const { canManageEmployees } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | INACTIVE

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
    // Attempt cloud sync on mount
    syncFromCloud();
  }, [loadEmployees, syncFromCloud]);

  // Check permissions
  if (!canManageEmployees) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Hanya Owner yang bisa mengelola karyawan.</p>
      </div>
    );
  }

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    if (filter === "ALL") return emp.status === "ACTIVE";
    if (filter === "INACTIVE") return emp.status === "INACTIVE";
    return emp.status === "ACTIVE";
  });

  // Handle add new
  const handleAdd = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  // Handle edit
  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  // Handle delete (soft delete)
  const handleDelete = async (employee) => {
    if (
      window.confirm(
        `Nonaktifkan karyawan ${employee.name}?\n\nData tidak akan dihapus, hanya dinonaktifkan.`,
      )
    ) {
      try {
        await deleteEmployee(employee.id);
        alert("✅ Karyawan berhasil dinonaktifkan");
      } catch (err) {
        alert("❌ Gagal: " + err.message);
      }
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  // Count by status
  const counts = {
    ACTIVE: employees.filter((e) => e.status === "ACTIVE").length,
    INACTIVE: employees.filter((e) => e.status === "INACTIVE").length,
  };

  // Get unique roles for display
  const uniqueRoles = [
    ...new Set(
      employees.filter((e) => e.status === "ACTIVE").map((e) => e.role),
    ),
  ];

  return (
    <div className="employee-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h1>👥 Manajemen Karyawan</h1>
          <p className="subtitle">Kelola data karyawan dan akses sistem</p>
          {syncStatus === "syncing" && (
            <span className="sync-badge syncing">🔄 Syncing...</span>
          )}
          {syncStatus === "synced" && (
            <span className="sync-badge synced">☁️ Cloud Synced</span>
          )}
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          ➕ Tambah Karyawan
        </button>
      </div>

      {/* Filters */}
      <div className="list-filters">
        <button
          className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Semua Aktif ({counts.ACTIVE})
        </button>
        <button
          className={`filter-btn ${filter === "INACTIVE" ? "active" : ""}`}
          onClick={() => setFilter("INACTIVE")}
        >
          Nonaktif ({counts.INACTIVE})
        </button>
      </div>

      {/* Role Summary */}
      {uniqueRoles.length > 0 && (
        <div className="role-summary">
          {uniqueRoles.map((role) => (
            <span key={role} className="role-tag">
              {role}:{" "}
              {
                employees.filter(
                  (e) => e.role === role && e.status === "ACTIVE",
                ).length
              }
            </span>
          ))}
        </div>
      )}

      {/* Loading / Error */}
      {loading && <div className="list-loading">⏳ Memuat data...</div>}
      {error && <div className="list-error">❌ Error: {error}</div>}

      {/* Employee Table */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="list-empty">
          📭 Tidak ada karyawan untuk ditampilkan.
        </div>
      )}

      {!loading && filteredEmployees.length > 0 && (
        <div className="employee-table">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th>PIN</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className={
                    employee.status === "INACTIVE" ? "inactive-row" : ""
                  }
                >
                  <td>
                    <strong>{employee.name}</strong>
                  </td>
                  <td>
                    <span className="role-badge">{employee.role}</span>
                  </td>
                  <td>
                    <code className="pin-code">****</code>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${employee.status.toLowerCase()}`}
                    >
                      {employee.status === "ACTIVE"
                        ? "🟢 Aktif"
                        : "⚪ Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(employee)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {employee.status === "ACTIVE" && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(employee)}
                          title="Nonaktifkan"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}
    </div>
  );
}
