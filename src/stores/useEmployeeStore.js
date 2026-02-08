/**
 * Employee Store - Zustand
 * State management for employee data
 * Pattern: Offline-First with Background Supabase Sync
 *
 * AGILE SCHEMA: No shift field, TEXT role
 */

import { create } from "zustand";
import { db } from "../data/db/schema";
import {
  syncEmployeeToSupabase,
  fetchEmployeesFromSupabase,
  deleteEmployeeFromSupabase,
  mapCloudToDexie,
} from "../services/employeeService";

export const useEmployeeStore = create((set, get) => ({
  // State
  employees: [],
  currentEmployee: null,
  loading: false,
  error: null,
  syncStatus: "idle", // idle | syncing | synced | error

  // ====================================
  // LOAD EMPLOYEES (from Dexie)
  // ====================================
  loadEmployees: async () => {
    set({ loading: true, error: null });
    try {
      const employees = await db.employees.toArray();
      set({
        employees: employees.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          pin: e.pin,
          status: e.status || "ACTIVE",
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        loading: false,
      });
    } catch (error) {
      console.error("❌ Load employees failed:", error);
      set({ error: error.message, loading: false });
    }
  },

  // ====================================
  // SYNC FROM CLOUD (Supabase -> Dexie)
  //With Time-Based Caching
  // ====================================
  syncFromCloud: async (force = false) => {
    set({ syncStatus: "syncing" });
    try {
      // 1. Check Cache (24h)
      const lastSync = localStorage.getItem("lastEmployeeSync");
      const now = new Date();

      if (!force && lastSync) {
        const lastSyncDate = new Date(lastSync);
        const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);
        if (hoursDiff < 24) {
          console.log("⏳ Employee Sync: Skipping (Last sync < 24h ago)");
          set({ syncStatus: "idle" });
          return;
        }
      }

      const cloudEmployees = await fetchEmployeesFromSupabase();

      if (cloudEmployees.length > 0) {
        // Map cloud data to Dexie format
        const dexieEmployees = mapCloudToDexie(cloudEmployees);

        // Bulk upsert to Dexie
        await db.employees.bulkPut(dexieEmployees);
        console.log(`✅ Synced ${dexieEmployees.length} employees from cloud`);

        // Reload state
        await get().loadEmployees();
      }

      // 2. Update Timestamp
      localStorage.setItem("lastEmployeeSync", now.toISOString());
      set({ syncStatus: "synced" });
    } catch (error) {
      console.error("❌ Sync from cloud failed:", error);
      set({ syncStatus: "error" });
    }
  },

  // ====================================
  // ADD EMPLOYEE (Dexie first, then Sync)
  // ====================================
  addEmployee: async (employeeData) => {
    set({ loading: true, error: null });
    try {
      // Generate UUID for new employee
      const newEmployee = {
        id: crypto.randomUUID(),
        name: employeeData.name.trim(),
        role: employeeData.role.trim(),
        pin: employeeData.pin,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate
      if (!newEmployee.name || newEmployee.name.length < 3) {
        throw new Error("Nama minimal 3 karakter");
      }
      if (!newEmployee.pin || !/^\d{4}$/.test(newEmployee.pin)) {
        throw new Error("PIN harus 4 digit angka");
      }

      // Step 1: Save to Dexie (Offline-First)
      await db.employees.add(newEmployee);
      console.log("💾 Employee saved to Dexie:", newEmployee.name);

      // Step 2: Update local state
      set((state) => ({
        employees: [...state.employees, newEmployee],
        loading: false,
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      syncEmployeeToSupabase(newEmployee).catch((err) => {
        console.error("⚠️ Background sync failed:", err);
      });

      return newEmployee;
    } catch (error) {
      console.error("❌ Add employee failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ====================================
  // UPDATE EMPLOYEE (Dexie first, then Sync)
  // ====================================
  updateEmployee: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Clean up: remove shift if accidentally passed
      delete updatedData.shift;

      // Step 1: Update in Dexie
      await db.employees.update(id, updatedData);
      console.log("💾 Employee updated in Dexie:", id);

      // Get full employee data for sync
      const employee = await db.employees.get(id);

      // Step 2: Update local state
      set((state) => ({
        employees: state.employees.map((emp) =>
          emp.id === id ? { ...emp, ...updatedData } : emp,
        ),
        loading: false,
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      if (employee) {
        syncEmployeeToSupabase(employee).catch((err) => {
          console.error("⚠️ Background sync failed:", err);
        });
      }
    } catch (error) {
      console.error("❌ Update employee failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ====================================
  // DELETE EMPLOYEE (Soft delete, then Sync)
  // ====================================
  deleteEmployee: async (id) => {
    set({ loading: true, error: null });
    try {
      // Step 1: Soft delete in Dexie
      await db.employees.update(id, {
        status: "INACTIVE",
        updatedAt: new Date().toISOString(),
      });
      console.log("💾 Employee soft-deleted in Dexie:", id);

      // Step 2: Update local state
      set((state) => ({
        employees: state.employees.map((emp) =>
          emp.id === id ? { ...emp, status: "INACTIVE" } : emp,
        ),
        loading: false,
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      deleteEmployeeFromSupabase(id).catch((err) => {
        console.error("⚠️ Background delete sync failed:", err);
      });
    } catch (error) {
      console.error("❌ Delete employee failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ====================================
  // HELPER FUNCTIONS
  // ====================================
  getActiveEmployees: () => {
    return get().employees.filter((emp) => emp.status === "ACTIVE");
  },

  getEmployeeById: (id) => {
    return get().employees.find((emp) => emp.id === id);
  },

  getEmployeesByRole: (role) => {
    return get().employees.filter(
      (emp) =>
        emp.role.toLowerCase() === role.toLowerCase() &&
        emp.status === "ACTIVE",
    );
  },

  setCurrentEmployee: (employee) => {
    set({ currentEmployee: employee });
  },

  clearError: () => {
    set({ error: null });
  },
}));
