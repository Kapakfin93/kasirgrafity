/**
 * Expense Store - Zustand
 * Manages expense tracking with IndexedDB persistence
 * Part of Financial Suite
 */

import { create } from 'zustand';
import { db } from '../data/db/schema';

// Expense Categories
export const EXPENSE_CATEGORIES = {
    OPERATIONAL: { id: 'OPERATIONAL', label: 'Operasional', color: '#f59e0b' },
    SALARY: { id: 'SALARY', label: 'Gaji/Kasbon', color: '#8b5cf6' },
    MATERIAL: { id: 'MATERIAL', label: 'Bahan Baku', color: '#3b82f6' },
    OTHER: { id: 'OTHER', label: 'Lainnya', color: '#64748b' }
};

export const useExpenseStore = create((set, get) => ({
    // State
    expenses: [],
    loading: false,
    error: null,

    // Load all expenses
    loadExpenses: async () => {
        set({ loading: true, error: null });
        try {
            const expenses = await db.expenses.orderBy('createdAt').reverse().toArray();
            set({ expenses, loading: false });
        } catch (error) {
            console.error('Failed to load expenses:', error);
            set({ error: error.message, loading: false });
        }
    },

    // Add new expense
    addExpense: async (expenseData) => {
        try {
            const newExpense = {
                id: crypto.randomUUID(),
                date: expenseData.date || new Date().toISOString(),
                amount: Number(expenseData.amount),
                category: expenseData.category,
                description: expenseData.description || '',
                employeeName: expenseData.employeeName || null,
                createdAt: new Date().toISOString()
            };

            await db.expenses.add(newExpense);

            // Update local state
            set(state => ({
                expenses: [newExpense, ...state.expenses]
            }));

            return newExpense;
        } catch (error) {
            console.error('Failed to add expense:', error);
            throw error;
        }
    },

    // Delete expense
    deleteExpense: async (id) => {
        try {
            await db.expenses.delete(id);
            set(state => ({
                expenses: state.expenses.filter(e => e.id !== id)
            }));
        } catch (error) {
            console.error('Failed to delete expense:', error);
            throw error;
        }
    },

    // Get total expenses for period
    getTotalExpenses: (startDate, endDate) => {
        const { expenses } = get();
        return expenses
            .filter(e => {
                const expenseDate = new Date(e.date);
                return expenseDate >= startDate && expenseDate <= endDate;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    },

    // Get recent expenses (last N)
    getRecentExpenses: (count = 5) => {
        const { expenses } = get();
        return expenses.slice(0, count);
    },

    // Get expenses by category
    getExpensesByCategory: (category) => {
        const { expenses } = get();
        return expenses.filter(e => e.category === category);
    }
}));
