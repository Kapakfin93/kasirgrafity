/**
 * ExpensePage Component
 * Dedicated page for expense management (Add/View/Delete)
 * Dashboard remains READ-ONLY
 */

import React, { useEffect, useState } from 'react';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../../stores/useExpenseStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { formatRupiah } from '../../core/formatters';
import { getDateRange } from '../../utils/dateHelpers';

export function ExpensePage() {
    const { expenses, loadExpenses, addExpense, deleteExpense, getTotalExpenses } = useExpenseStore();
    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

    const [showModal, setShowModal] = useState(false);
    const [period, setPeriod] = useState('month');
    const [formData, setFormData] = useState({
        amount: '',
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
    const totalExpenses = getTotalExpenses(dateRange.start, dateRange.end);
    const activeEmployees = getActiveEmployees();

    // Filter expenses by period
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || Number(formData.amount) <= 0) return;

        setIsSubmitting(true);
        try {
            await addExpense({
                amount: Number(formData.amount),
                category: formData.category,
                description: formData.description,
                employeeName: formData.category === 'SALARY' ? formData.employeeName : null
            });

            // Reset form
            setFormData({
                amount: '',
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

            {/* Summary Cards */}
            <div className="expense-summary-row">
                <div className="expense-summary-card expense-total">
                    <div className="summary-icon">💸</div>
                    <div className="summary-content">
                        <div className="summary-label">Total Pengeluaran</div>
                        <div className="summary-value">{formatRupiah(totalExpenses)}</div>
                        <div className="summary-subtitle">{filteredExpenses.length} transaksi</div>
                    </div>
                </div>

                <button className="add-expense-btn" onClick={() => setShowModal(true)}>
                    <span className="btn-icon">➕</span>
                    <span className="btn-text">Catat Pengeluaran</span>
                </button>
            </div>

            {/* Expense History Table */}
            <div className="widget-card">
                <h2 className="widget-title">📋 Riwayat Pengeluaran</h2>

                {filteredExpenses.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                        <p>Belum ada data pengeluaran</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kategori</th>
                                    <th>Keterangan</th>
                                    <th>Karyawan</th>
                                    <th>Nominal</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map(exp => (
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
                                        <td>{exp.employeeName || '-'}</td>
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
                            <div className="form-field">
                                <label>Nominal (Rp)</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="Masukkan nominal..."
                                    className="amount-input"
                                    autoFocus
                                />
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
                                disabled={isSubmitting || !formData.amount}
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
