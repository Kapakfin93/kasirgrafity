/**
 * AttendanceBoard Component - WALL STREET TERMINAL AESTHETIC
 * High-efficiency dark professional UI for employee check-in/out
 *
 * Visual Metaphor: Employees = Traders | Check-in = Opening Position | Check-out = Closing Position
 */

import React, { useEffect, useState } from "react";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { formatTime, getCurrentShift } from "../../utils/dateHelpers";

export function AttendanceBoard() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null);
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

  useEffect(() => {
    loadEmployees();
    loadTodayAttendances();
    syncFromCloud();
  }, [loadEmployees, loadTodayAttendances, syncFromCloud]);

  const activeEmployees = getActiveEmployees();
  const currentShift = getCurrentShift();
  const now = new Date();

  // Calculate ticker stats
  const totalStaff = activeEmployees.length;
  const liveOnFloor = todayAttendances.filter(
    (a) => a.checkInTime && !a.checkOutTime,
  ).length;
  const closedSessions = todayAttendances.filter((a) => a.checkOutTime).length;

  const handleEmployeeClick = (employee) => {
    const attendance = getTodayAttendanceByEmployee(employee.id);
    setSelectedEmployee(employee);
    setError("");

    if (attendance && !attendance.checkOutTime) {
      setActionType("checkout");
    } else if (!attendance) {
      setActionType("checkin");
    } else {
      setError("Session already closed today");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      if (actionType === "checkin") {
        await checkIn(selectedEmployee.id, selectedEmployee.name);
      } else if (actionType === "checkout") {
        const attendance = getTodayAttendanceByEmployee(selectedEmployee.id);
        const workHours = await checkOut(attendance.id);
      }

      setShowConfirmModal(false);
      setSelectedEmployee(null);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setSelectedEmployee(null);
    setError("");
  };

  const getEmployeeStatus = (employeeId) => {
    const attendance = getTodayAttendanceByEmployee(employeeId);
    if (!attendance) return { status: "not-checked-in", attendance: null };
    if (attendance.checkOutTime) return { status: "checked-out", attendance };
    return { status: "checked-in", attendance };
  };

  // Helper: Generate initials from name
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper: Calculate work hours for display
  const calculateCurrentHours = (checkInTime) => {
    const start = new Date(checkInTime);
    const diff = (now - start) / 1000 / 60 / 60;
    return diff.toFixed(1);
  };

  const calculateTotalHours = (attendance) => {
    if (!attendance.totalHours) return "0.0";
    return attendance.totalHours.toFixed(1);
  };

  return (
    <div style={styles.terminal}>
      {/* MARKET TICKER HEADER */}
      <div style={styles.tickerBar}>
        <div style={styles.tickerGroup}>
          <div style={styles.tickerBox}>
            <div style={styles.tickerLabel}>TOTAL STAFF</div>
            <div style={styles.tickerValue}>{totalStaff}</div>
          </div>
          <div style={{ ...styles.tickerBox, ...styles.tickerLive }}>
            <div style={styles.tickerLabel}>
              <span style={styles.greenDot}>●</span> LIVE ON FLOOR
            </div>
            <div style={{ ...styles.tickerValue, color: "#10b981" }}>
              {liveOnFloor}
            </div>
          </div>
          <div style={{ ...styles.tickerBox, ...styles.tickerClosed }}>
            <div style={styles.tickerLabel}>
              <span style={styles.blueDot}>●</span> CLOSED SESSIONS
            </div>
            <div style={{ ...styles.tickerValue, color: "#3b82f6" }}>
              {closedSessions}
            </div>
          </div>
        </div>
        <div style={styles.shiftInfo}>
          <span style={styles.shiftText}>
            SHIFT: <strong>{currentShift}</strong>
          </span>
          <span style={styles.timeText}>{formatTime(now)}</span>
          {syncStatus === "syncing" && (
            <span style={styles.syncBadge}>SYNCING...</span>
          )}
          {syncStatus === "synced" && (
            <span style={styles.syncedBadge}>SYNCED</span>
          )}
        </div>
      </div>

      {/* TRADER CARDS GRID */}
      <div style={styles.tradersGrid}>
        {activeEmployees.length === 0 && (
          <div style={styles.emptyState}>No active traders on roster</div>
        )}

        {activeEmployees.map((employee) => {
          const { status, attendance } = getEmployeeStatus(employee.id);

          return (
            <div
              key={employee.id}
              style={{
                ...styles.traderCard,
                ...(status === "not-checked-in" && styles.cardOffDuty),
                ...(status === "checked-in" && styles.cardLive),
                ...(status === "checked-out" && styles.cardClosed),
              }}
              onClick={() => handleEmployeeClick(employee)}
            >
              {/* Avatar */}
              <div style={styles.avatarSection}>
                <div
                  style={{
                    ...styles.avatar,
                    ...(status === "not-checked-in" && styles.avatarOff),
                    ...(status === "checked-in" && styles.avatarLive),
                    ...(status === "checked-out" && styles.avatarClosed),
                  }}
                >
                  {getInitials(employee.name)}
                </div>
              </div>

              {/* Info Section */}
              <div style={styles.infoSection}>
                <div style={styles.traderName}>{employee.name}</div>
                <div style={styles.traderRole}>{employee.role}</div>

                {/* STATE A: NOT CHECKED IN */}
                {status === "not-checked-in" && (
                  <div style={styles.statusBadgeOff}>OFF DUTY</div>
                )}

                {/* STATE B: ACTIVE/WORKING */}
                {status === "checked-in" && attendance && (
                  <>
                    <div style={styles.statusBadgeLive}>● LIVE</div>
                    <div style={styles.startTime}>
                      START: {formatTime(new Date(attendance.checkInTime))}
                    </div>
                    <div style={styles.hoursCounter}>
                      {calculateCurrentHours(attendance.checkInTime)} HRS
                    </div>
                  </>
                )}

                {/* STATE C: CHECKED OUT */}
                {status === "checked-out" && attendance && (
                  <>
                    <div style={styles.statusBadgeClosed}>SESSION CLOSED</div>
                    <div style={styles.sessionSummary}>
                      <div style={styles.sessionRow}>
                        IN: {formatTime(new Date(attendance.checkInTime))}
                      </div>
                      <div style={styles.sessionRow}>
                        OUT: {formatTime(new Date(attendance.checkOutTime))}
                      </div>
                      <div style={styles.totalHours}>
                        {calculateTotalHours(attendance)} HRS
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ORDER EXEC TERMINAL MODAL */}
      {showConfirmModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={handleCancel}>
          <div
            style={styles.modalTerminal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {actionType === "checkin"
                  ? "⚡ EXECUTE CHECK-IN"
                  : "🛑 FINISH SHIFT & REPORT"}
              </div>
              <button style={styles.closeBtn} onClick={handleCancel}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.confirmText}>
                <div style={styles.employeeName}>{selectedEmployee.name}</div>
                <div style={styles.actionText}>
                  {actionType === "checkin"
                    ? "Open position and start shift?"
                    : "Close position and finish shift?"}
                </div>
                <div style={styles.timestamp}>{formatTime(now)}</div>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.btnSecondary}
                onClick={handleCancel}
                disabled={loading}
              >
                CANCEL
              </button>
              <button
                style={{
                  ...styles.btnPrimary,
                  ...(actionType === "checkin"
                    ? styles.btnCheckin
                    : styles.btnCheckout),
                }}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? "⏳ PROCESSING..."
                  : actionType === "checkin"
                    ? "EXECUTE CHECK-IN"
                    : "FINISH SHIFT & REPORT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WALL STREET TERMINAL STYLES
// ============================================================================

const styles = {
  terminal: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    minHeight: "100vh",
    padding: "24px",
    fontFamily: "'Roboto Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace",
    color: "#e2e8f0",
  },

  // TICKER BAR
  tickerBar: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "12px",
    padding: "20px 24px",
    marginBottom: "24px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },

  tickerGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },

  tickerBox: {
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    padding: "12px 20px",
    minWidth: "140px",
  },

  tickerLive: {
    borderColor: "rgba(16, 185, 129, 0.5)",
    boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)",
  },

  tickerClosed: {
    borderColor: "rgba(59, 130, 246, 0.5)",
    boxShadow: "0 0 15px rgba(59, 130, 246, 0.2)",
  },

  tickerLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    letterSpacing: "0.5px",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  tickerValue: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#f1f5f9",
    lineHeight: "1",
  },

  greenDot: {
    color: "#10b981",
    fontSize: "16px",
    animation: "pulse 2s infinite",
  },

  blueDot: {
    color: "#3b82f6",
    fontSize: "16px",
  },

  shiftInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },

  shiftText: {
    fontSize: "13px",
    color: "#cbd5e1",
    letterSpacing: "0.3px",
  },

  timeText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f1f5f9",
  },

  syncBadge: {
    fontSize: "10px",
    padding: "4px 8px",
    background: "rgba(251, 191, 36, 0.2)",
    border: "1px solid rgba(251, 191, 36, 0.4)",
    borderRadius: "4px",
    color: "#fbbf24",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },

  syncedBadge: {
    fontSize: "10px",
    padding: "4px 8px",
    background: "rgba(16, 185, 129, 0.2)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
    borderRadius: "4px",
    color: "#10b981",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },

  // TRADERS GRID
  tradersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  emptyState: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "60px 20px",
    fontSize: "16px",
    color: "#64748b",
    letterSpacing: "0.5px",
  },

  // TRADER CARD BASE
  traderCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "12px",
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    gap: "16px",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.6)",
    },
  },

  // CARD STATES
  cardOffDuty: {
    border: "2px solid rgba(100, 116, 139, 0.3)",
    opacity: "0.7",
  },

  cardLive: {
    border: "2px solid #10b981",
    boxShadow:
      "0 0 25px rgba(16, 185, 129, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
  },

  cardClosed: {
    border: "2px solid #3b82f6",
    boxShadow:
      "0 0 20px rgba(59, 130, 246, 0.25), 0 4px 20px rgba(0, 0, 0, 0.5)",
  },

  // AVATAR
  avatarSection: {
    flexShrink: 0,
  },

  avatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
    letterSpacing: "1px",
  },

  avatarOff: {
    background: "rgba(71, 85, 105, 0.3)",
    color: "#94a3b8",
    border: "2px solid rgba(100, 116, 139, 0.4)",
  },

  avatarLive: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    border: "2px solid #34d399",
    boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
  },

  avatarClosed: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    border: "2px solid #60a5fa",
  },

  // INFO SECTION
  infoSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  traderName: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: "0.3px",
  },

  traderRole: {
    fontSize: "12px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },

  statusBadgeOff: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(71, 85, 105, 0.3)",
    border: "1px solid rgba(100, 116, 139, 0.4)",
    borderRadius: "4px",
    color: "#94a3b8",
    letterSpacing: "0.5px",
    fontWeight: "600",
    alignSelf: "flex-start",
    marginTop: "4px",
  },

  statusBadgeLive: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(16, 185, 129, 0.2)",
    border: "1px solid rgba(16, 185, 129, 0.5)",
    borderRadius: "4px",
    color: "#10b981",
    letterSpacing: "0.5px",
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: "4px",
  },

  statusBadgeClosed: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.5)",
    borderRadius: "4px",
    color: "#3b82f6",
    letterSpacing: "0.5px",
    fontWeight: "600",
    alignSelf: "flex-start",
    marginTop: "4px",
  },

  startTime: {
    fontSize: "13px",
    color: "#cbd5e1",
    fontWeight: "500",
    marginTop: "4px",
  },

  hoursCounter: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#10b981",
    marginTop: "4px",
    letterSpacing: "0.5px",
  },

  sessionSummary: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  sessionRow: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  totalHours: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#3b82f6",
    marginTop: "4px",
    letterSpacing: "0.5px",
  },

  // MODAL
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modalTerminal: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    maxWidth: "500px",
    width: "100%",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },

  modalHeader: {
    background: "rgba(15, 23, 42, 0.8)",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: "0.5px",
  },

  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.1)",
      color: "#f1f5f9",
    },
  },

  modalBody: {
    padding: "32px 24px",
  },

  confirmText: {
    textAlign: "center",
  },

  employeeName: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: "12px",
    letterSpacing: "0.5px",
  },

  actionText: {
    fontSize: "16px",
    color: "#cbd5e1",
    marginBottom: "16px",
  },

  timestamp: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#10b981",
    letterSpacing: "0.5px",
  },

  errorBox: {
    marginTop: "16px",
    padding: "12px 16px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "8px",
    color: "#ef4444",
    fontSize: "14px",
    textAlign: "center",
  },

  modalActions: {
    padding: "20px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.15)",
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "12px",
  },

  btnSecondary: {
    background: "rgba(71, 85, 105, 0.3)",
    border: "2px solid rgba(100, 116, 139, 0.5)",
    borderRadius: "8px",
    padding: "16px 24px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#cbd5e1",
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },

  btnPrimary: {
    borderRadius: "8px",
    padding: "16px 24px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    border: "none",
  },

  btnCheckin: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    boxShadow: "0 8px 20px rgba(16, 185, 129, 0.4)",
  },

  btnCheckout: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    boxShadow: "0 8px 20px rgba(239, 68, 68, 0.4)",
  },
};
