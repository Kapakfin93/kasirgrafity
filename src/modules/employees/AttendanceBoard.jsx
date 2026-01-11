/**
 * AttendanceBoard Component
 * Quick check-in/out interface for employees
 */

import React, { useEffect, useState } from 'react';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { formatTime, getCurrentShift, calculateWorkHours } from '../../utils/dateHelpers';

export function AttendanceBoard() {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        todayAttendances,
        loadTodayAttendances,
        checkIn,
        checkOut,
        getTodayAttendanceByEmployee
    } = useAttendanceStore();

    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

    // Load data on mount
    useEffect(() => {
        loadEmployees();
        loadTodayAttendances();
    }, [loadEmployees, loadTodayAttendances]);

    const activeEmployees = getActiveEmployees();
    const currentShift = getCurrentShift();
    const now = new Date();

    // Handle employee select
    const handleSelectEmployee = (employee) => {
        setSelectedEmployee(employee);
        setPin('');
        setError('');
    };

    // Handle PIN input
    const handlePinInput = (digit) => {
        if (pin.length < 4) {
            setPin(pin + digit);
        }
    };

    // Handle PIN delete
    const handlePinDelete = () => {
        setPin(pin.slice(0, -1));
    };

    // Handle check-in
    const handleCheckIn = async () => {
        if (pin.length !== 4) {
            setError('PIN harus 4 digit');
            return;
        }

        if (pin !== selectedEmployee.pin) {
            setError('PIN salah!');
            setPin('');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await checkIn(selectedEmployee.id, selectedEmployee.name, selectedEmployee.shift);
            alert(`✅ Check-in berhasil!\n${selectedEmployee.name}\nShift: ${selectedEmployee.shift}\nWaktu: ${formatTime(now)}`);
            setSelectedEmployee(null);
            setPin('');
        } catch (err) {
            setError(err.message);
            setPin('');
        }

        setLoading(false);
    };

    // Handle check-out
    const handleCheckOut = async () => {
        if (pin.length !== 4) {
            setError('PIN harus 4 digit');
            return;
        }

        if (pin !== selectedEmployee.pin) {
            setError('PIN salah!');
            setPin('');
            return;
        }

        const attendance = getTodayAttendanceByEmployee(selectedEmployee.id);
        if (!attendance) {
            setError('Anda belum check-in hari ini');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const workHours = await checkOut(attendance.id);
            alert(`✅ Check-out berhasil!\n${selectedEmployee.name}\nTotal kerja: ${workHours.formatted}`);
            setSelectedEmployee(null);
            setPin('');
        } catch (err) {
            setError(err.message);
            setPin('');
        }

        setLoading(false);
    };

    // Check if employee has checked in today
    const hasCheckedIn = (employeeId) => {
        const attendance = getTodayAttendanceByEmployee(employeeId);
        return attendance && attendance.checkInTime;
    };

    // Check if employee has checked out today
    const hasCheckedOut = (employeeId) => {
        const attendance = getTodayAttendanceByEmployee(employeeId);
        return attendance && attendance.checkOutTime;
    };

    // Get attendance for employee
    const getAttendance = (employeeId) => {
        return getTodayAttendanceByEmployee(employeeId);
    };

    return (
        <div className="attendance-board">
            <div className="attendance-container">
                {/* Header */}
                <div className="attendance-header">
                    <h1>⏰ Absensi Karyawan</h1>
                    <div className="current-info">
                        <span className="current-time">{formatTime(now)}</span>
                        <span className="current-shift">Shift: {currentShift}</span>
                    </div>
                </div>

                {!selectedEmployee ? (
                    /* Employee Selection */
                    <div className="employee-selection">
                        <h2>Pilih Nama Anda</h2>
                        <div className="employee-grid">
                            {activeEmployees.map(employee => {
                                const attendance = getAttendance(employee.id);
                                const checkedIn = hasCheckedIn(employee.id);
                                const checkedOut = hasCheckedOut(employee.id);

                                return (
                                    <button
                                        key={employee.id}
                                        className={`employee-attendance-card ${checkedIn ? 'checked-in' : ''} ${checkedOut ? 'checked-out' : ''}`}
                                        onClick={() => handleSelectEmployee(employee)}
                                    >
                                        <div className="employee-avatar">
                                            {checkedOut ? '✅' : checkedIn ? '🟢' : '⚪'}
                                        </div>
                                        <div className="employee-name">{employee.name}</div>
                                        <div className="employee-shift">Shift {employee.shift}</div>
                                        {attendance && (
                                            <div className="attendance-status">
                                                {checkedOut ? (
                                                    <span className="status-done">Selesai</span>
                                                ) : checkedIn ? (
                                                    <span className="status-active">Sedang Kerja</span>
                                                ) : null}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* PIN Entry */
                    <div className="pin-entry">
                        <button className="back-btn" onClick={() => setSelectedEmployee(null)}>
                            ← Kembali
                        </button>

                        <div className="selected-employee-info">
                            <h2>{selectedEmployee.name}</h2>
                            <p>Shift {selectedEmployee.shift}</p>
                        </div>

                        <h3>Masukkan PIN</h3>

                        {/* PIN Display */}
                        <div className="pin-display">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`}>
                                    {pin.length > i ? '●' : '○'}
                                </div>
                            ))}
                        </div>

                        {/* Error */}
                        {error && <div className="error-message">{error}</div>}

                        {/* PIN Keypad */}
                        <div className="pin-keypad">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    className="key-btn"
                                    onClick={() => handlePinInput(num.toString())}
                                    disabled={loading}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                className="key-btn delete-btn"
                                onClick={handlePinDelete}
                                disabled={loading}
                            >
                                ⌫
                            </button>
                            <button
                                className="key-btn"
                                onClick={() => handlePinInput('0')}
                                disabled={loading}
                            >
                                0
                            </button>
                            <div className="key-btn empty"></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="attendance-actions">
                            {!hasCheckedIn(selectedEmployee.id) && (
                                <button
                                    className="action-btn check-in-btn"
                                    onClick={handleCheckIn}
                                    disabled={loading || pin.length !== 4}
                                >
                                    {loading ? '⏳ Memproses...' : '🟢 CHECK IN'}
                                </button>
                            )}

                            {hasCheckedIn(selectedEmployee.id) && !hasCheckedOut(selectedEmployee.id) && (
                                <button
                                    className="action-btn check-out-btn"
                                    onClick={handleCheckOut}
                                    disabled={loading || pin.length !== 4}
                                >
                                    {loading ? '⏳ Memproses...' : '🔴 CHECK OUT'}
                                </button>
                            )}

                            {hasCheckedOut(selectedEmployee.id) && (
                                <div className="already-done">
                                    ✅ Anda sudah selesai kerja hari ini
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
