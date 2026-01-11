/**
 * ExpenseModal Component
 * Quick add expense with category selection
 * Part of Financial Suite
 */

import React, { useState, useEffect } from 'react';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../../stores/useExpenseStore';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { formatRupiah } from '../../core/formatters';

export function ExpenseModal({ isOpen, onClose }) {
    const { addExpense, getRecentExpenses, loadExpenses } = useExpenseStore();
    const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();

    const [formData, setFormData] = useState({
        amount: '',
        category: 'OPERATIONAL',
        description: '',
        employeeName: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentExpenses, setRecentExpenses] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadExpenses();
            loadEmployees();
        }
    }, [isOpen, loadExpenses, loadEmployees]);

    useEffect(() => {
        setRecentExpenses(getRecentExpenses(5));
    }, [getRecentExpenses]);

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

            // Refresh recent expenses
            setRecentExpenses(getRecentExpenses(5));
        } catch (error) {
            console.error('Failed to add expense:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const activeEmployees = getActiveEmployees();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="expense-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="expense-modal-header">
                    <h2>💸 Tambah Pengeluaran</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="expense-form">
                    {/* Amount Input */}
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

                    {/* Category Dropdown */}
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

                    {/* Employee Dropdown (for SALARY) */}
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

                    {/* Description */}
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isSubmitting || !formData.amount}
                    >
                        {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan Pengeluaran'}
                    </button>
                </form>

                {/* Recent Expenses */}
                <div className="recent-expenses">
                    <h3>📋 Pengeluaran Terakhir</h3>
                    {recentExpenses.length === 0 ? (
                        <p className="empty-text">Belum ada data</p>
                    ) : (
                        <div className="expense-list">
                            {recentExpenses.map(exp => (
                                <div key={exp.id} className="expense-item">
                                    <div className="expense-item-info">
                                        <span
                                            className="expense-category-dot"
                                            style={{ backgroundColor: EXPENSE_CATEGORIES[exp.category]?.color }}
                                        />
                                        <span className="expense-desc">{exp.description || exp.category}</span>
                                    </div>
                                    <span className="expense-amount">{formatRupiah(exp.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
