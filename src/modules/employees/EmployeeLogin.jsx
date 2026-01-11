/**
 * EmployeeLogin Component
 * PIN-based login for employees
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';

export function EmployeeLogin() {
    const [step, setStep] = useState('select'); // 'select' | 'pin'
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { loginEmployee, loginOwner } = useAuthStore();
    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

    // Load employees on mount
    React.useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const activeEmployees = getActiveEmployees();

    // Handle employee selection
    const handleSelectEmployee = (employee) => {
        setSelectedEmployee(employee);
        setStep('pin');
        setError('');
        setPin('');
    };

    // Handle owner login
    const handleOwnerLogin = () => {
        setSelectedEmployee({ id: 'owner', name: 'Owner' });
        setStep('pin');
        setError('');
        setPin('');
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

    // Handle PIN submit
    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setError('PIN harus 4 digit');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (selectedEmployee.id === 'owner') {
                await loginOwner(pin);
            } else {
                await loginEmployee(selectedEmployee.id, pin);
            }

            // Redirect will be handled by App.jsx based on auth state
        } catch (err) {
            setError(err.message || 'Login gagal');
            setPin('');
        }

        setLoading(false);
    };

    // Handle back
    const handleBack = () => {
        setStep('select');
        setSelectedEmployee(null);
        setPin('');
        setError('');
    };

    return (
        <div className="employee-login">
            <div className="login-container">
                {/* Header */}
                <div className="login-header">
                    <h1>🏢 JOGLO PRINTING</h1>
                    <p className="subtitle">Sistem Kasir & Manajemen</p>
                </div>

                {/* Step 1: Select Employee */}
                {step === 'select' && (
                    <div className="login-step">
                        <h2>Pilih Akun Anda</h2>

                        {/* Owner Login */}
                        <button
                            className="employee-card owner-card"
                            onClick={handleOwnerLogin}
                        >
                            <div className="employee-avatar">👑</div>
                            <div className="employee-info">
                                <strong>Owner</strong>
                                <span>Akses Penuh</span>
                            </div>
                        </button>

                        {/* Employee List */}
                        <div className="employee-list">
                            {activeEmployees.length === 0 && (
                                <div className="empty-state">
                                    Belum ada karyawan terdaftar.
                                </div>
                            )}

                            {activeEmployees.map(employee => (
                                <button
                                    key={employee.id}
                                    className="employee-card"
                                    onClick={() => handleSelectEmployee(employee)}
                                >
                                    <div className="employee-avatar">
                                        {employee.role === 'CASHIER' ? '💰' : '🔨'}
                                    </div>
                                    <div className="employee-info">
                                        <strong>{employee.name}</strong>
                                        <span>{employee.role} - Shift {employee.shift}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Enter PIN */}
                {step === 'pin' && (
                    <div className="login-step">
                        <button className="back-btn" onClick={handleBack}>
                            ← Kembali
                        </button>

                        <div className="pin-entry">
                            <div className="selected-user">
                                <div className="user-avatar">
                                    {selectedEmployee.id === 'owner' ? '👑' : '👤'}
                                </div>
                                <strong>{selectedEmployee.name}</strong>
                            </div>

                            <h3>Masukkan PIN Anda</h3>

                            {/* PIN Display */}
                            <div className="pin-display">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`}>
                                        {pin.length > i ? '●' : '○'}
                                    </div>
                                ))}
                            </div>

                            {/* Error Message */}
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
                                <button
                                    className="key-btn submit-btn"
                                    onClick={handlePinSubmit}
                                    disabled={loading || pin.length !== 4}
                                >
                                    {loading ? '⏳' : '✓'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
