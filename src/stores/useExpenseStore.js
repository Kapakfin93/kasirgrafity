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
  realtimeSubscription: null,

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
        employeeId: expenseData.employeeId || null,
        employeeName: expenseData.employeeName || null,
        createdBy: expenseData.createdBy || "System",
        createdAt: new Date().toISOString(),
        isSynced: 0, // Default: Not synced
      };

      if (newExpense.amount <= 0) throw new Error("Jumlah harus lebih dari 0");
      if (!Object.keys(EXPENSE_CATEGORIES).includes(newExpense.category))
        throw new Error("Kategori tidak valid");
      if (
        (newExpense.category === "SALARY" || newExpense.category === "BON") &&
        !newExpense.employeeId
      ) {
        throw new Error("Pilih karyawan untuk kategori Gaji/Kasbon");
      }

      // Step 1: Save to Dexie (Offline-First)
      await db.expenses.add(newExpense);
      console.log("💾 Expense saved to Dexie:", newExpense.category);

      set((state) => ({
        expenses: [newExpense, ...state.expenses],
      }));

      // Step 2: Background Sync
      syncExpenseToSupabase(newExpense)
        .then(() => {
          // Update Sync Status on Success
          db.expenses.update(newExpense.id, { isSynced: 1 });
        })
        .catch((err) => {
          console.error("⚠️ Expense sync failed (saved locally):", err);
          // Remains isSynced: 0, will be picked up by processSyncQueue
        });

      return newExpense;
    } catch (error) {
      console.error("❌ Add expense failed:", error);
      throw error;
    }
  },

  // ====================================
  // PROCESS SYNC QUEUE (Auto-Retry)
  // ====================================
  processSyncQueue: async () => {
    if (!navigator.onLine) return;

    try {
      const pending = await db.expenses.where("isSynced").equals(0).toArray();
      if (pending.length === 0) return;

      console.log(`🔄 Processing ${pending.length} pending type expenses...`);

      let syncedCount = 0;
      for (const record of pending) {
        try {
          await syncExpenseToSupabase(record);
          await db.expenses.update(record.id, { isSynced: 1 });
          syncedCount++;
        } catch (err) {
          console.error(`❌ Failed to sync expense ${record.id}:`, err);
        }
      }

      if (syncedCount > 0) {
        console.log(`✅ Successfully synced ${syncedCount} queued expenses.`);
      }
    } catch (error) {
      console.error("❌ Process sync queue failed:", error);
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
      // SAFETY FIX: Add 24h buffer to prevent "Ghost Data" if Admin PC is ahead of Owner PC
      const limitDate = new Date(today);
      limitDate.setDate(limitDate.getDate() + 1);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const cloudExpenses = await fetchExpensesFromSupabase(
        monthAgo,
        limitDate,
      );

      if (cloudExpenses.length > 0) {
        const dexieExpenses = mapCloudToDexie(cloudExpenses).map((e) => ({
          ...e,
          isSynced: 1, // Mark as synced since it came from cloud
        }));
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
  // REALTIME SUBSCRIPTION (LIVE UPDATE) 📡
  // ====================================
  subscribeToExpenses: async () => {
    const { supabase } = await import("../services/supabaseClient");
    if (!supabase) return;

    if (get().realtimeSubscription) return;

    console.log("📡 Subscribing to Realtime Expenses...");

    const subscription = supabase
      .channel("public:expenses")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "expenses" },
        (payload) => {
          console.log("🔔 New Expense Received:", payload.new);
          // Manual mapping to match Dexie/Store format (camelCase)
          const newExpense = {
            id: payload.new.id,
            date: payload.new.date,
            amount: Number(payload.new.amount),
            category: payload.new.category,
            description: payload.new.description,
            employeeId: payload.new.employee_id,
            employeeName: payload.new.employee_name,
            createdBy: payload.new.created_by,
            createdAt: payload.new.created_at,
            isSynced: 1, // From server = synced
          };

          // Update Store
          set((state) => ({
            expenses: [newExpense, ...state.expenses],
          }));

          // Update Dexie (Mirror)
          db.expenses.put(newExpense);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "expenses" },
        (payload) => {
          console.log("🔔 Expense Deleted:", payload.old);
          const id = payload.old.id;

          set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== id),
          }));

          db.expenses.delete(id);
        },
      )
      .subscribe();

    set({ realtimeSubscription: subscription });
  },

  unsubscribeFromExpenses: () => {
    const sub = get().realtimeSubscription;
    if (sub) {
      console.log("🔕 Unsubscribing from Realtime Expenses...");
      sub.unsubscribe();
      set({ realtimeSubscription: null });
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
