/**
 * Expense Store - Zustand
 * Manages expense tracking with IndexedDB persistence
 *
 * AGILE: Added BON category, Cloud sync enabled
 * NOTE: Cash drawer integration not implemented (no cashier shift system found)
 */

import { create } from "zustand";
import { db } from "../data/db/schema";
import {
  syncExpenseToSupabase,
  fetchExpensesFromSupabase,
  mapCloudToDexie,
} from "../services/expenseService";

// Expense Categories - UPDATED: Added BON
export const EXPENSE_CATEGORIES = {
  OPERATIONAL: { id: "OPERATIONAL", label: "Operasional", color: "#f59e0b" },
  SALARY: { id: "SALARY", label: "Gaji", color: "#8b5cf6" },
  BON: { id: "BON", label: "Kasbon / Hutang", color: "#e11d48" }, // NEW
  MATERIAL: { id: "MATERIAL", label: "Bahan Baku", color: "#3b82f6" },
  OTHER: { id: "OTHER", label: "Lainnya", color: "#64748b" },
};

export const useExpenseStore = create((set, get) => ({
  // State
  expenses: [],
  loading: false,
  error: null,
  syncStatus: "idle", // idle | syncing | synced | error

  // ====================================
  // LOAD EXPENSES
  // ====================================
  loadExpenses: async () => {
    set({ loading: true, error: null });
    try {
      const expenses = await db.expenses
        .orderBy("createdAt")
        .reverse()
        .toArray();
      set({ expenses, loading: false });
    } catch (error) {
      console.error("❌ Load expenses failed:", error);
      set({ error: error.message, loading: false });
    }
  },

  // ====================================
  // ADD EXPENSE (Offline-First + Sync)
  // ====================================
  addExpense: async (expenseData) => {
    try {
      const newExpense = {
        id: crypto.randomUUID(),
        date: expenseData.date || new Date().toISOString(),
        amount: Number(expenseData.amount),
        category: expenseData.category,
        description: expenseData.description || "",
        employeeName: expenseData.employeeName || null,
        createdBy: expenseData.createdBy || "System",
        createdAt: new Date().toISOString(),
      };

      // Validate amount
      if (newExpense.amount <= 0) {
        throw new Error("Jumlah harus lebih dari 0");
      }

      // Validate category
      if (!Object.keys(EXPENSE_CATEGORIES).includes(newExpense.category)) {
        throw new Error("Kategori tidak valid");
      }

      // Step 1: Save to Dexie (Offline-First)
      await db.expenses.add(newExpense);
      console.log("💾 Expense saved to Dexie:", newExpense.category);

      // Step 2: Update local state
      set((state) => ({
        expenses: [newExpense, ...state.expenses],
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      syncExpenseToSupabase(newExpense).catch((err) => {
        console.error("⚠️ Expense sync failed:", err);
      });

      // TODO: Cash Drawer Deduction
      // NOTE: No cashier shift system found in codebase
      // When implemented, call: deductCashDrawer(newExpense.amount)

      return newExpense;
    } catch (error) {
      console.error("❌ Add expense failed:", error);
      throw error;
    }
  },

  // ====================================
  // DELETE EXPENSE
  // ====================================
  deleteExpense: async (id) => {
    try {
      await db.expenses.delete(id);

      set((state) => ({
        expenses: state.expenses.filter((exp) => exp.id !== id),
      }));

      console.log("✅ Expense deleted:", id);
    } catch (error) {
      console.error("❌ Delete expense failed:", error);
      throw error;
    }
  },

  // ====================================
  // SYNC FROM CLOUD
  // ====================================
  syncFromCloud: async () => {
    set({ syncStatus: "syncing" });
    try {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const cloudExpenses = await fetchExpensesFromSupabase(monthAgo, today);

      if (cloudExpenses.length > 0) {
        const dexieExpenses = mapCloudToDexie(cloudExpenses);
        await db.expenses.bulkPut(dexieExpenses);
        console.log(`✅ Synced ${dexieExpenses.length} expenses from cloud`);
        await get().loadExpenses();
      }

      set({ syncStatus: "synced" });
    } catch (error) {
      console.error("❌ Sync from cloud failed:", error);
      set({ syncStatus: "error" });
    }
  },

  // ====================================
  // HELPER FUNCTIONS
  // ====================================
  getExpensesByCategory: (category) => {
    return get().expenses.filter((exp) => exp.category === category);
  },

  getExpensesByDateRange: async (startDate, endDate) => {
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    return await db.expenses
      .where("date")
      .between(start, end, true, true)
      .toArray();
  },

  getTotalByCategory: (category) => {
    return get()
      .expenses.filter((exp) => exp.category === category)
      .reduce((sum, exp) => sum + exp.amount, 0);
  },

  clearError: () => {
    set({ error: null });
  },
}));
