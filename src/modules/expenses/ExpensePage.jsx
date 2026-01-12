/**
 * ExpensePage Component
 * Dedicated page for expense management with Privacy Tabs
 * - Smart Currency Input (Auto-format Rupiah)
 * - OPERASIONAL vs PAYROLL tabs for data privacy
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../../stores/useExpenseStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { formatRupiah } from '../../core/formatters';
import { getDateRange } from '../../utils/dateHelpers';

// Smart currency formatter
const formatCurrencyInput = (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10));
};

const parseCurrencyInput = (formattedValue) => {
    return parseInt(formattedValue.replace(/\D/g, ''), 10) || 0;
};

export function ExpensePage() {
    const { expenses, loadExpenses, addExpense, deleteExpense, getTotalExpenses } = useExpenseStore();
    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

    const [showModal, setShowModal] = useState(false);
    const [period, setPeriod] = useState('month');
    const [activeTab, setActiveTab] = useState('operational'); // 'operational' or 'payroll'
    const [formData, setFormData] = useState({
        displayAmount: '', // Formatted display value
        rawAmount: 0,      // Actual integer value
        category: 'OPERATIONAL',
        description: '',
        employeeName: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadExpenses();
        loadEmployees();
    }, [loadExpenses, loadEmployees]);

    const dateRange = getDateRange(period);
    const activeEmployees = getActiveEmployees();

    // Filter expenses by period
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= dateRange.start && expDate <= dateRange.end;
        });
    }, [expenses, dateRange]);

    // Separate by category type
    const operationalExpenses = useMemo(() =>
        filteredExpenses.filter(exp => exp.category !== 'SALARY'),
        [filteredExpenses]
    );

    const payrollExpenses = useMemo(() =>
        filteredExpenses.filter(exp => exp.category === 'SALARY'),
        [filteredExpenses]
    );

    // Calculate totals
    const totalOperational = operationalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalPayroll = payrollExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const grandTotal = totalOperational + totalPayroll;

    // Smart currency input handler
    const handleAmountChange = (e) => {
        const inputValue = e.target.value;
        const formatted = formatCurrencyInput(inputValue);
        const raw = parseCurrencyInput(formatted);

        setFormData({
            ...formData,
            displayAmount: formatted,
            rawAmount: raw
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.rawAmount <= 0) return;

        setIsSubmitting(true);
        try {
            await addExpense({
                amount: formData.rawAmount,
                category: formData.category,
                description: formData.description,
                employeeName: formData.category === 'SALARY' ? formData.employeeName : null
            });

            // Reset form
            setFormData({
                displayAmount: '',
                rawAmount: 0,
                category: 'OPERATIONAL',
                description: '',
                employeeName: ''
            });
            setShowModal(false);
        } catch (error) {
            console.error('Failed to add expense:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Hapus pengeluaran ini?')) {
            await deleteExpense(id);
        }
    };

    const getCategoryLabel = (catId) => EXPENSE_CATEGORIES[catId]?.label || catId;
    const getCategoryColor = (catId) => EXPENSE_CATEGORIES[catId]?.color || '#64748b';

    // Get current tab's expenses
    const currentExpenses = activeTab === 'operational' ? operationalExpenses : payrollExpenses;

    return (
        <div className="expense-page">
            {/* Header */}
            <div className="wallstreet-container">
                <div className="animated-border" />
                <div className="dashboard-header">
                    <div>
                        <h1 className="wallstreet-title">💸 Pengeluaran</h1>
                        <p className="subtitle">Catat dan monitor semua pengeluaran bisnis</p>
                        <div className="shimmer-line" />
                    </div>
                    <div className="period-filter">
                        <button className={`period-btn ${period === 'today' ? 'active' : ''}`} onClick={() => setPeriod('today')}>Hari Ini</button>
                        <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>7 Hari</button>
                        <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>Bulan Ini</button>
                    </div>
                </div>
            </div>

            {/* Summary Cards with Breakdown */}
            <div className="expense-summary-row">
                <div className="expense-summary-card expense-total">
                    <div className="summary-icon">💸</div>
                    <div className="summary-content">
                        <div className="summary-label">Total Pengeluaran</div>
                        <div className="summary-value">{formatRupiah(grandTotal)}</div>
                        <div className="summary-breakdown">
                            <span className="breakdown-item ops">Ops: {formatRupiah(totalOperational)}</span>
                            <span className="breakdown-divider">|</span>
                            <span className="breakdown-item payroll">Gaji: {formatRupiah(totalPayroll)}</span>
                        </div>
                    </div>
                </div>

                <button className="add-expense-btn" onClick={() => setShowModal(true)}>
                    <span className="btn-icon">➕</span>
                    <span className="btn-text">Catat Pengeluaran</span>
                </button>
            </div>

            {/* Privacy Tabs */}
            <div className="privacy-tabs">
                <button
                    className={`privacy-tab ${activeTab === 'operational' ? 'active' : ''}`}
                    onClick={() => setActiveTab('operational')}
                >
                    📦 OPERASIONAL
                    <span className="tab-count">{operationalExpenses.length}</span>
                </button>
                <button
                    className={`privacy-tab ${activeTab === 'payroll' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payroll')}
                >
                    🔒 PAYROLL & GAJI
                    <span className="tab-count">{payrollExpenses.length}</span>
                </button>
            </div>

            {/* Expense History Table */}
            <div className="widget-card">
                <h2 className="widget-title">
                    {activeTab === 'operational' ? '📋 Riwayat Operasional' : '🔒 Riwayat Payroll (Rahasia)'}
                </h2>

                {currentExpenses.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                            {activeTab === 'operational' ? '📭' : '🔐'}
                        </div>
                        <p>
                            {activeTab === 'operational'
                                ? 'Belum ada pengeluaran operasional'
                                : 'Belum ada data payroll/gaji'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kategori</th>
                                    <th>Keterangan</th>
                                    {activeTab === 'payroll' && <th>Karyawan</th>}
                                    <th>Nominal</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentExpenses.map(exp => (
                                    <tr key={exp.id}>
                                        <td className="text-muted">
                                            {new Date(exp.date).toLocaleDateString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td>
                                            <span
                                                className="category-badge"
                                                style={{
                                                    backgroundColor: getCategoryColor(exp.category) + '20',
                                                    color: getCategoryColor(exp.category),
                                                    border: `1px solid ${getCategoryColor(exp.category)}40`
                                                }}
                                            >
                                                {getCategoryLabel(exp.category)}
                                            </span>
                                        </td>
                                        <td>{exp.description || '-'}</td>
                                        {activeTab === 'payroll' && <td>{exp.employeeName || '-'}</td>}
                                        <td className="expense-nominal">{formatRupiah(exp.amount)}</td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(exp.id)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="expense-modal" onClick={e => e.stopPropagation()}>
                        <div className="expense-modal-header">
                            <h2>➕ Catat Pengeluaran</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="expense-form">
                            {/* Smart Currency Input */}
                            <div className="form-field">
                                <label>Nominal</label>
                                <div className="currency-input-wrapper">
                                    <span className="currency-prefix">Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.displayAmount}
                                        onChange={handleAmountChange}
                                        placeholder="0"
                                        className="amount-input currency-formatted"
                                        autoFocus
                                    />
                                </div>
                                {formData.rawAmount > 0 && (
                                    <div className="amount-preview">
                                        = {formatRupiah(formData.rawAmount)}
                                    </div>
                                )}
                            </div>

                            <div className="form-field">
                                <label>Kategori</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="category-select"
                                >
                                    {Object.values(EXPENSE_CATEGORIES).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.category === 'SALARY' && (
                                <div className="form-field">
                                    <label>Nama Karyawan</label>
                                    <select
                                        value={formData.employeeName}
                                        onChange={e => setFormData({ ...formData, employeeName: e.target.value })}
                                        className="employee-select"
                                    >
                                        <option value="">-- Pilih Karyawan --</option>
                                        {activeEmployees.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-field">
                                <label>Keterangan</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Contoh: Token Listrik PLN"
                                    className="description-input"
                                />
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={isSubmitting || formData.rawAmount <= 0}
                            >
                                {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan Pengeluaran'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
