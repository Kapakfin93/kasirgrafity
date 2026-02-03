/**
 * AttendanceBoard Component
 * Quick check-in/out interface for employees
 *
 * AGILE: No PIN requirement, simple confirmation modal
 */

import React, { useEffect, useState } from "react";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { formatTime, getCurrentShift } from "../../utils/dateHelpers";

export function AttendanceBoard() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'checkin' | 'checkout'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    todayAttendances,
    loadTodayAttendances,
    checkIn,
    checkOut,
    getTodayAttendanceByEmployee,
    syncFromCloud,
    syncStatus,
  } = useAttendanceStore();

  const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

  // Load data on mount
  useEffect(() => {
    loadEmployees();
    loadTodayAttendances();
    syncFromCloud(); // Attempt cloud sync
  }, [loadEmployees, loadTodayAttendances, syncFromCloud]);

  const activeEmployees = getActiveEmployees();
  const currentShift = getCurrentShift();
  const now = new Date();

  // Handle employee card click
  const handleEmployeeClick = (employee) => {
    const attendance = getTodayAttendanceByEmployee(employee.id);

    setSelectedEmployee(employee);
    setError("");

    if (attendance && !attendance.checkOutTime) {
      // Already checked in, prompt for checkout
      setActionType("checkout");
    } else if (!attendance) {
      // Not checked in, prompt for checkin
      setActionType("checkin");
    } else {
      // Already checked out
      setError("Sudah check-out hari ini");
      return;
    }

    setShowConfirmModal(true);
  };

  // Handle confirmation
  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      if (actionType === "checkin") {
        await checkIn(selectedEmployee.id, selectedEmployee.name);
        alert(
          `✅ Check-in berhasil!\n${selectedEmployee.name}\nWaktu: ${formatTime(now)}`,
        );
      } else if (actionType === "checkout") {
        const attendance = getTodayAttendanceByEmployee(selectedEmployee.id);
        const workHours = await checkOut(attendance.id);
        alert(
          `✅ Check-out berhasil!\n${selectedEmployee.name}\nTotal kerja: ${workHours.formatted}`,
        );
      }

      setShowConfirmModal(false);
      setSelectedEmployee(null);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setShowConfirmModal(false);
    setSelectedEmployee(null);
    setError("");
  };

  // Check if employee has checked in today
  const getEmployeeStatus = (employeeId) => {
    const attendance = getTodayAttendanceByEmployee(employeeId);
    if (!attendance)
      return {
        status: "not-checked-in",
        label: "Belum Check-in",
        color: "#9ca3af",
      };
    if (attendance.checkOutTime)
      return {
        status: "checked-out",
        label: "Sudah Check-out",
        color: "#3b82f6",
      };
    return { status: "checked-in", label: "Sedang Bekerja", color: "#10b981" };
  };

  return (
    <div className="attendance-board">
      {/* Header */}
      <div className="board-header">
        <div>
          <h1>⏰ Papan Absensi</h1>
          <p className="subtitle">Klik nama untuk Check-in / Check-out</p>
          <span className="shift-badge current">
            Shift Sekarang: <strong>{currentShift}</strong> ({formatTime(now)})
          </span>
          {syncStatus === "syncing" && (
            <span className="sync-badge syncing" style={{ marginLeft: "10px" }}>
              🔄 Syncing...
            </span>
          )}
          {syncStatus === "synced" && (
            <span className="sync-badge synced" style={{ marginLeft: "10px" }}>
              ☁️ Synced
            </span>
          )}
        </div>
      </div>

      {/* Employee Cards */}
      <div className="employee-grid">
        {activeEmployees.length === 0 && (
          <div className="empty-state">📭 Belum ada karyawan aktif.</div>
        )}

        {activeEmployees.map((employee) => {
          const status = getEmployeeStatus(employee.id);
          const attendance = getTodayAttendanceByEmployee(employee.id);

          return (
            <div
              key={employee.id}
              className={`employee-card ${status.status}`}
              onClick={() => handleEmployeeClick(employee)}
              style={{ cursor: "pointer" }}
            >
              <div className="card-header">
                <h3>{employee.name}</h3>
                <span className="role-badge">{employee.role}</span>
              </div>
              <div className="card-body">
                <div
                  className="status-indicator"
                  style={{ backgroundColor: status.color }}
                >
                  {status.label}
                </div>
                {attendance && (
                  <div className="attendance-info">
                    <small>
                      Check-in: {formatTime(new Date(attendance.checkInTime))}
                    </small>
                    {attendance.checkOutTime && (
                      <small>
                        Check-out:{" "}
                        {formatTime(new Date(attendance.checkOutTime))}
                      </small>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Summary */}
      <div className="summary-card">
        <h3>Rekap Hari Ini</h3>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Check-in</span>
            <span className="stat-value">
              {todayAttendances.filter((a) => a.checkInTime).length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Belum Check-in</span>
            <span className="stat-value">
              {activeEmployees.length -
                todayAttendances.filter((a) => a.checkInTime).length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Check-out</span>
            <span className="stat-value">
              {todayAttendances.filter((a) => a.checkOutTime).length}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal (No PIN) */}
      {showConfirmModal && selectedEmployee && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {actionType === "checkin"
                  ? "✅ Konfirmasi Check-in"
                  : "✋ Konfirmasi Check-out"}
              </h2>
              <button className="modal-close-btn" onClick={handleCancel}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="confirm-message">
                <p>
                  Halo <strong>{selectedEmployee.name}</strong>,
                </p>
                <p>
                  {actionType === "checkin"
                    ? "Mau Check-in sekarang?"
                    : "Mau Check-out sekarang?"}
                </p>
                {error && <div className="error-message">{error}</div>}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? "⏳ Memproses..."
                  : actionType === "checkin"
                    ? "Ya, Check-in"
                    : "Ya, Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
