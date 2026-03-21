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

  // HR Matrix State
  hrMatrixData: [],
  isHrMatrixLoading: false,

  // Operational Matrix State
  opMatrixData: [],
  isOpMatrixLoading: false,

  // Matrix Detail Modal State (Lazy Fetch)
  matrixDetailData: [],
  isMatrixDetailLoading: false,

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
      console.log(
        "🐛 [DEBUG LOKAL] loadExpenses() - Mengambil dari Dexie (Memori Lokal). Total Data:",
        expenses.length,
      );
      if (expenses.length > 0) {
        console.log(
          "🐛 [DEBUG LOKAL] loadExpenses() - Sampel Data Index 0:",
          expenses[0].id,
          expenses[0].amount,
        );
      }
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
    // 1. DATA PREPARATION
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
      isSynced: 0, // Always start as 0 (Local First)
    };

    // Basic Validation
    if (newExpense.amount <= 0) throw new Error("Jumlah harus lebih dari 0");
    if (!Object.keys(EXPENSE_CATEGORIES).includes(newExpense.category))
      throw new Error("Kategori tidak valid");
    if (
      (newExpense.category === "SALARY" || newExpense.category === "BON") &&
      !newExpense.employeeId
    ) {
      throw new Error("Pilih karyawan untuk kategori Gaji/Kasbon");
    }

    try {
      // 🚨 STEP 1: COMMIT TO LOCAL (DEXIE) - FASTEST
      // This is the source of truth for POS operational continuity
      await db.expenses.add(newExpense);
      console.log("💾 [LOCAL FIRST] Saved to Dexie:", newExpense.id);

      // 🚀 STEP 2: UPDATE UI IMMEDIATELY (OPTIMISTIC)
      // This happens in ~0ms, UI overlay in components will close immediately
      set((state) => {
        const exists = state.expenses.some((e) => e.id === newExpense.id);
        if (exists) return state;
        return { expenses: [newExpense, ...state.expenses] };
      });

      // 📡 STEP 3: BACKGROUND SYNC (FIRE & FORGET)
      // No await here -> UI stays responsive!
      if (navigator.onLine) {
        syncExpenseToSupabase(newExpense)
          .then((syncedData) => {
            if (syncedData) {
              console.log("📡 [SYNC SUCCESS] Cloud updated for:", newExpense.id);
              // Update status in Dexie for reconciliation
              db.expenses.update(newExpense.id, { isSynced: 1 });
              // Update memory state so UI can show "synced" status if needed
              set((state) => ({
                expenses: state.expenses.map((e) =>
                  e.id === newExpense.id ? { ...e, isSynced: 1 } : e,
                ),
              }));
            }
          })
          .catch((err) => {
            console.warn(
              "⚠️ [SYNC ZOMBIE/OFFLINE] Koneksi zombie/offline. Data aman di lokal menunggu auto-sync. Alasan:",
              err.message,
            );
            // We do NOT throw error here because data is already safe in Dexie
          });
      } else {
        console.log("📴 [OFFLINE] Expense queued for future sync.");
      }

      return newExpense;
    } catch (error) {
      console.error("❌ [CRITICAL LOCAL FAIL] Add expense failed:", error);
      throw error; // This only happens if Dexie/IndexedDB crashes
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
      // 🚀 STEP 1: DELETE FROM CLOUD (SUPABASE)
      // We wait for cloud confirmation before removing local data
      const { deleteExpenseFromSupabase } = await import(
        "../services/expenseService"
      );
      await deleteExpenseFromSupabase(id);
      console.log("📡 [SYNC SUCCESS] Cloud deleted for:", id);

      // 💾 STEP 2: DELETE FROM LOCAL (DEXIE)
      await db.expenses.delete(id);

      set((state) => ({
        expenses: state.expenses.filter((exp) => exp.id !== id),
      }));

      console.log("✅ Expense fully deleted (Cloud + Local):", id);
    } catch (error) {
      console.error("❌ [CRITICAL DELETE FAIL] Delete expense failed:", error);
      throw error;
    }
  },

  // ====================================
  // SYNC FROM CLOUD
  // ====================================
  syncFromCloud: async () => {
    set({ syncStatus: "syncing" });
    console.log(
      "🐛 [DEBUG LOKAL] syncFromCloud() - Memulai tarikan paksa dari Supabase awan...",
    );
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

      console.log(
        "🐛 [DEBUG LOKAL] syncFromCloud() - Supabase menjawab dengan total:",
        cloudExpenses.length,
        "data.",
      );

      if (cloudExpenses.length > 0) {
        console.log(
          "🐛 [DEBUG LOKAL] syncFromCloud() - Sampel Supabase Index 0:",
          cloudExpenses[0].id,
          cloudExpenses[0].amount,
        );
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
  // FETCH HR MATRIX (SERVER-SIDE RPC)
  // ====================================
  fetchHrMatrixSummary: async (month, year) => {
    set({ isHrMatrixLoading: true });
    try {
      const { supabase } = await import("../services/supabaseClient");
      if (!supabase) throw new Error("Supabase client not initialized");

      console.log(
        `📡 Fetching HR Matrix from Supabase for ${month}/${year}...`,
      );

      const { data, error } = await supabase.rpc("get_hr_matrix_summary", {
        target_month: month,
        target_year: year,
      });

      if (error) {
        throw error;
      }

      console.log(
        "✅ HR Matrix fetched successfully. Total Employees:",
        data?.length || 0,
      );
      set({ hrMatrixData: data || [], isHrMatrixLoading: false });
    } catch (error) {
      console.error("❌ Failed to fetch HR Matrix from Supabase:", error);
      set({ hrMatrixData: [], isHrMatrixLoading: false, error: error.message });
    }
  },

  // ====================================
  // FETCH OPERATIONAL MATRIX (SERVER-SIDE RPC)
  // ====================================
  fetchOpMatrixSummary: async (month, year) => {
    set({ isOpMatrixLoading: true });
    try {
      const { supabase } = await import("../services/supabaseClient");
      if (!supabase) throw new Error("Supabase client not initialized");

      console.log(
        `📡 Fetching Operational Matrix from Supabase for ${month}/${year}...`,
      );

      const { data, error } = await supabase.rpc(
        "get_operational_matrix_summary",
        {
          target_month: month,
          target_year: year,
        },
      );

      if (error) {
        throw error;
      }

      console.log(
        "✅ Operational Matrix fetched successfully. Total Categories:",
        data?.length || 0,
      );
      set({ opMatrixData: data || [], isOpMatrixLoading: false });
    } catch (error) {
      console.error(
        "❌ Failed to fetch Operational Matrix from Supabase:",
        error,
      );
      set({ opMatrixData: [], isOpMatrixLoading: false, error: error.message });
    }
  },

  // ====================================
  // FETCH MATRIX CELL DETAILS (LAZY LOAD VIA RPC)
  // ====================================
  fetchMatrixCellDetails: async (
    category,
    month,
    year,
    week,
    employeeId = null,
  ) => {
    set({ isMatrixDetailLoading: true, matrixDetailData: [] });
    try {
      const { supabase } = await import("../services/supabaseClient");
      if (!supabase) throw new Error("Supabase client not initialized");

      console.log(
        `📡 Fetching Details for Cat:${category}, M:${month}, Y:${year}, W:${week}, Emp:${employeeId || "ALL"}...`,
      );

      const { data, error } = await supabase.rpc("get_matrix_detail_rows", {
        p_category: category,
        p_month: parseInt(month, 10),
        p_year: parseInt(year, 10),
        p_week: week,
        p_employee_id: employeeId,
      });

      if (error) {
        throw error;
      }

      console.log(
        `✅ Detail Row fetched successfully. Rows:`,
        data?.length || 0,
      );
      set({ matrixDetailData: data || [], isMatrixDetailLoading: false });
    } catch (error) {
      console.error(
        "❌ Failed to fetch Matrix Detail Rows from Supabase:",
        error,
      );
      set({
        matrixDetailData: [],
        isMatrixDetailLoading: false,
        error: error.message,
      });
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
          set((state) => {
            const exists = state.expenses.some((e) => e.id === newExpense.id);
            if (exists) {
              // Jika data sudah ada (hasil input lokal sendiri), jangan duplikat
              // cukup perbarui status sync-nya ke 1
              db.expenses.update(newExpense.id, { isSynced: 1 });
              return {
                expenses: state.expenses.map((e) =>
                  e.id === newExpense.id ? { ...e, isSynced: 1 } : e,
                ),
              };
            }

            // Jika belum ada (input dari PC lain), Update Dexie (Mirror) & UI
            db.expenses.put(newExpense);
            return {
              expenses: [newExpense, ...state.expenses],
            };
          });
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
