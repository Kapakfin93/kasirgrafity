/**
 * TodayAttendance Component
 * Display today's attendance summary on dashboard
 */

import React from "react";
import { formatTime, calculateWorkHours } from "../../utils/dateHelpers";

export function TodayAttendance({ attendances, employees }) {
  // Create a map of attendance by employee ID
  const attendanceMap = {};
  attendances.forEach((att) => {
    attendanceMap[att.employeeId] = att;
  });

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <p>👥 Belum ada karyawan terdaftar</p>
      </div>
    );
  }

  return (
    <div className="attendance-summary" style={{ display: "grid", gap: "8px" }}>
      {employees.map((employee) => {
        const attendance = attendanceMap[employee.id];
        const hasCheckedIn = attendance && attendance.checkInTime;
        const hasCheckedOut = attendance && attendance.checkOutTime;

        // Determine Status Class & Texts
        let statusClass = "status-absent";
        let icon = "⚪";
        let statusText = "Belum Absen";
        let textColor = "#94a3b8"; // Slate-400

        if (hasCheckedOut) {
          statusClass = "status-done";
          icon = "✅";
          statusText = "Selesai";
          textColor = "#cbd5e1";
        } else if (hasCheckedIn) {
          statusClass = "status-working";
          icon = "🔥";
          statusText = "Sedang Kerja";
          textColor = "#f1f5f9"; // White
        }

        return (
          <div
            key={employee.id}
            className={`attendance-glow-card ${statusClass}`}
          >
            <div className="attendance-glow-content">
              {/* LEFT: Name & Status Icon */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "18px" }}>{icon}</span>
                <div>
                  <div
                    style={{
                      color: "#f1f5f9",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {employee.name}
                  </div>
                  <div
                    style={{
                      color: textColor,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {statusText}
                  </div>
                </div>
              </div>

              {/* RIGHT: Time Info */}
              <div style={{ textAlign: "right" }}>
                {attendance && attendance.checkInTime ? (
                  <>
                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: "13px",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatTime(attendance.checkInTime)}
                    </div>
                    {attendance.checkOutTime && (
                      <div style={{ color: "#64748b", fontSize: "11px" }}>
                        Plg: {formatTime(attendance.checkOutTime)}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      color: "#475569",
                      fontSize: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    --:--
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
