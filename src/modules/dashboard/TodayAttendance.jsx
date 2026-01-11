/**
 * TodayAttendance Component
 * Display today's attendance summary on dashboard
 */

import React from 'react';
import { formatTime, calculateWorkHours } from '../../utils/dateHelpers';

export function TodayAttendance({ attendances, employees }) {
    // Create a map of attendance by employee ID
    const attendanceMap = {};
    attendances.forEach(att => {
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
        <div className="attendance-summary">
            {employees.map(employee => {
                const attendance = attendanceMap[employee.id];
                const hasCheckedIn = attendance && attendance.checkInTime;
                const hasCheckedOut = attendance && attendance.checkOutTime;

                let statusIcon = '⚪';
                let statusText = 'Belum Absen';
                let statusClass = 'absent';

                if (hasCheckedOut) {
                    statusIcon = '✅';
                    statusText = 'Selesai';
                    statusClass = 'completed';
                } else if (hasCheckedIn) {
                    statusIcon = '🟢';
                    statusText = 'Sedang Kerja';
                    statusClass = 'working';
                }

                return (
                    <div key={employee.id} className={`attendance-item ${statusClass}`}>
                        <div className="attendance-item-header">
                            <div className="attendance-employee">
                                <span className="attendance-icon">{statusIcon}</span>
                                <strong>{employee.name}</strong>
                            </div>
                            <span className="attendance-shift">
                                {employee.shift === 'PAGI' ? '☀️' : '🌙'} {employee.shift}
                            </span>
                        </div>

                        {attendance && (
                            <div className="attendance-item-times">
                                {attendance.checkInTime && (
                                    <div className="attendance-time">
                                        <span className="time-label">Masuk:</span>
                                        <span className="time-value">{formatTime(attendance.checkInTime)}</span>
                                        {attendance.status === 'LATE' && (
                                            <span className="late-badge">Telat</span>
                                        )}
                                    </div>
                                )}
                                {attendance.checkOutTime && (
                                    <div className="attendance-time">
                                        <span className="time-label">Pulang:</span>
                                        <span className="time-value">{formatTime(attendance.checkOutTime)}</span>
                                    </div>
                                )}
                                {attendance.totalHours && (
                                    <div className="attendance-total">
                                        Total: {attendance.totalHours.toFixed(1)} jam
                                    </div>
                                )}
                            </div>
                        )}

                        {!attendance && (
                            <div className="attendance-item-status">
                                <span className="status-text">{statusText}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
