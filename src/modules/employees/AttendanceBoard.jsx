/**
 * AttendanceBoard Component - DARK WALL STREET STYLE
 * Simple Indonesian UI with Dark Mode Trading Floor aesthetic
 */

import React, { useEffect, useState } from "react";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { formatTime } from "../../utils/dateHelpers";

export function AttendanceBoard() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    loadTodayAttendances,
    checkIn,
    checkOut,
    getTodayAttendanceByEmployee,
    syncFromCloud,
    syncStatus,
  } = useAttendanceStore();

  const { getActiveEmployees } = useEmployeeStore(); // Removed loadEmployees

  useEffect(() => {
    // loadEmployees(); // HANDLED BY MAIN LAYOUT (Global Pre-load)
    loadTodayAttendances();
    syncFromCloud(); // Smart Sync (Checks 24h cache)
  }, [loadTodayAttendances, syncFromCloud]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const activeEmployees = getActiveEmployees();

  const handleEmployeeClick = (employee, action) => {
    const attendance = getTodayAttendanceByEmployee(employee.id);
    setSelectedEmployee(employee);
    setError("");

    if (action === "checkin" && !attendance) {
      setActionType("checkin");
      setShowConfirmModal(true);
    } else if (
      action === "checkout" &&
      attendance &&
      !attendance.checkOutTime
    ) {
      setActionType("checkout");
      setShowConfirmModal(true);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      if (actionType === "checkin") {
        await checkIn(selectedEmployee.id, selectedEmployee.name);
      } else if (actionType === "checkout") {
        const attendance = getTodayAttendanceByEmployee(selectedEmployee.id);
        await checkOut(attendance.id);
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

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateTotalHours = (attendance) => {
    if (!attendance.totalHours) return "0";
    return Math.floor(attendance.totalHours);
  };

  const formatDate = (date) => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const time = formatTime(date);
    return `${dayName}, ${day} ${month} ${year} - ${time}`;
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>⏰ Absensi Harian</h1>
        <div style={styles.datetime}>{formatDate(currentTime)}</div>

        {/* MANUAL SYNC BUTTON */}
        <button
          onClick={() => syncFromCloud(true)}
          disabled={syncStatus === "syncing"}
          style={{
            marginTop: "12px",
            background: "transparent",
            border: "1px solid #334155",
            color: syncStatus === "syncing" ? "#fbbf24" : "#94a3b8",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            margin: "12px auto 0",
          }}
        >
          {syncStatus === "syncing" ? (
            <>⏳ Sinkronisasi Data...</>
          ) : (
            <>🔄 Sync Data Manual</>
          )}
        </button>
      </div>

      {/* EMPLOYEE CARDS GRID */}
      <div style={styles.grid}>
        {activeEmployees.length === 0 && (
          <div style={styles.emptyState}>Belum ada karyawan aktif</div>
        )}

        {activeEmployees.map((employee) => {
          const { status, attendance } = getEmployeeStatus(employee.id);

          return (
            <div
              key={employee.id}
              style={{
                ...styles.card,
                ...(status === "not-checked-in" && styles.cardNotIn),
                ...(status === "checked-in" && styles.cardActive),
                ...(status === "checked-out" && styles.cardDone),
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  ...styles.avatar,
                  ...(status === "not-checked-in" && styles.avatarNotIn),
                  ...(status === "checked-in" && styles.avatarActive),
                  ...(status === "checked-out" && styles.avatarDone),
                }}
              >
                {getInitials(employee.name)}
              </div>

              {/* Info */}
              <div style={styles.info}>
                <div style={styles.name}>{employee.name}</div>
                <div style={styles.role}>{employee.role}</div>

                {/* STATE 1: Belum Masuk */}
                {status === "not-checked-in" && (
                  <button
                    style={styles.btnMasuk}
                    onClick={() => handleEmployeeClick(employee, "checkin")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 0 20px rgba(16, 185, 129, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(16, 185, 129, 0.3)";
                    }}
                  >
                    ✅ MASUK KERJA
                  </button>
                )}

                {/* STATE 2: Sedang Kerja */}
                {status === "checked-in" && attendance && (
                  <>
                    <div style={styles.timeInfo}>
                      Masuk: {formatTime(new Date(attendance.checkInTime))}
                    </div>
                    <button
                      style={styles.btnPulang}
                      onClick={() => handleEmployeeClick(employee, "checkout")}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 0 20px rgba(239, 68, 68, 0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(239, 68, 68, 0.3)";
                      }}
                    >
                      🏠 PULANG
                    </button>
                  </>
                )}

                {/* STATE 3: Sudah Pulang */}
                {status === "checked-out" && attendance && (
                  <>
                    <div style={styles.badgeSelesai}>SELESAI</div>
                    <div style={styles.timeInfo}>
                      Total: {calculateTotalHours(attendance)} Jam
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={handleCancel}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Halo, {selectedEmployee.name}! 👋</h2>
            <p style={styles.modalQuestion}>
              Apakah Anda ingin{" "}
              <strong>
                {actionType === "checkin" ? "Masuk Kerja" : "Pulang"}
              </strong>{" "}
              sekarang?
            </p>
            {error && <div style={styles.errorBox}>{error}</div>}
            <div style={styles.modalActions}>
              <button
                style={styles.btnBatal}
                onClick={handleCancel}
                disabled={loading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#475569";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#334155";
                }}
              >
                Batal
              </button>
              <button
                style={styles.btnKonfirmasi}
                onClick={handleConfirm}
                disabled={loading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                {loading ? "⏳ Memproses..." : "Ya, Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DARK WALL STREET STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "24px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  // HEADER
  header: {
    marginBottom: "32px",
    textAlign: "center",
  },

  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: "8px",
    textShadow: "0 2px 10px rgba(255, 255, 255, 0.1)",
  },

  datetime: {
    fontSize: "18px",
    color: "#10b981",
    fontWeight: "600",
    fontFamily: "'Roboto Mono', 'Courier New', monospace",
    letterSpacing: "0.5px",
    textShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
  },

  // GRID
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  emptyState: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "60px 20px",
    fontSize: "16px",
    color: "#64748b",
  },

  // CARD BASE
  card: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
    display: "flex",
    gap: "16px",
    alignItems: "center",
    transition: "all 0.3s ease",
    border: "1px solid #334155",
  },

  cardNotIn: {
    borderColor: "#334155",
  },

  cardActive: {
    borderColor: "#10b981",
    boxShadow:
      "0 0 25px rgba(16, 185, 129, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
  },

  cardDone: {
    borderColor: "#475569",
    opacity: "0.6",
  },

  // AVATAR
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
    flexShrink: 0,
    border: "2px solid",
  },

  avatarNotIn: {
    background: "rgba(71, 85, 105, 0.3)",
    color: "#94a3b8",
    borderColor: "#475569",
  },

  avatarActive: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    borderColor: "#34d399",
    boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
  },

  avatarDone: {
    background: "rgba(71, 85, 105, 0.3)",
    color: "#64748b",
    borderColor: "#475569",
  },

  // INFO
  info: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  name: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f1f5f9",
  },

  role: {
    fontSize: "13px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  timeInfo: {
    fontSize: "14px",
    color: "#cbd5e1",
    fontWeight: "500",
  },

  badgeSelesai: {
    fontSize: "12px",
    padding: "4px 12px",
    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
    color: "#fff",
    borderRadius: "6px",
    fontWeight: "600",
    alignSelf: "flex-start",
    boxShadow: "0 2px 8px rgba(14, 165, 233, 0.3)",
  },

  // BUTTONS
  btnMasuk: {
    width: "100%",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "4px",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
  },

  btnPulang: {
    width: "100%",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "4px",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
  },

  // MODAL
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modal: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
    border: "1px solid #334155",
  },

  modalTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: "12px",
    textAlign: "center",
  },

  modalQuestion: {
    fontSize: "16px",
    color: "#cbd5e1",
    marginBottom: "24px",
    textAlign: "center",
    lineHeight: "1.6",
  },

  errorBox: {
    padding: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "8px",
    color: "#f87171",
    fontSize: "14px",
    marginBottom: "16px",
    textAlign: "center",
  },

  modalActions: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "12px",
  },

  btnBatal: {
    padding: "12px 20px",
    background: "#334155",
    color: "#cbd5e1",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  btnKonfirmasi: {
    padding: "12px 20px",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
};
