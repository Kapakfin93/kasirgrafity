/**
 * Attendance Store - Zustand
 * State management for attendance tracking
 *
 * AGILE: No PIN requirement, Cloud sync enabled
 */

import { create } from "zustand";
import { db } from "../data/db/schema";
import {
  calculateWorkHours,
  isLateCheckIn,
  getCurrentShift,
} from "../utils/dateHelpers";
import { SHIFT_CONFIG } from "../core/constants";
import {
  syncAttendanceToSupabase,
  fetchAttendanceFromSupabase,
  mapCloudToDexie,
} from "../services/attendanceService";

export const useAttendanceStore = create((set, get) => ({
  // State
  attendances: [],
  todayAttendances: [],
  loading: false,
  error: null,
  syncStatus: "idle", // idle | syncing | synced | error

  // ====================================
  // LOAD TODAY'S ATTENDANCE
  // ====================================
  loadTodayAttendances: async () => {
    set({ loading: true, error: null });
    try {
      const today = new Date().toISOString().split("T")[0];
      const attendances = await db.attendance
        .where("date")
        .equals(today)
        .toArray();

      set({
        todayAttendances: attendances,
        loading: false,
      });
    } catch (error) {
      console.error("❌ Load today attendances failed:", error);
      set({ error: error.message, loading: false });
    }
  },

  // ====================================
  // LOAD BY DATE RANGE
  // ====================================
  loadAttendancesByDateRange: async (startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];

      const attendances = await db.attendance
        .where("date")
        .between(start, end, true, true)
        .toArray();

      set({
        attendances,
        loading: false,
      });
    } catch (error) {
      console.error("❌ Load attendances failed:", error);
      set({ error: error.message, loading: false });
    }
  },

  // ====================================
  // CHECK IN (No PIN, Background Sync)
  // ====================================
  checkIn: async (employeeId, employeeName) => {
    set({ loading: true, error: null });
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentShift = getCurrentShift(now);

      // Check if already checked in today (using compound index)
      const existing = await db.attendance
        .where("[employeeId+date]")
        .equals([employeeId, today])
        .first();

      if (existing) {
        throw new Error("Sudah melakukan check-in hari ini");
      }

      // Determine if late
      const shiftConfig = SHIFT_CONFIG[currentShift];
      const isLate = isLateCheckIn(
        now,
        shiftConfig.start,
        shiftConfig.gracePeriod,
      );

      const attendance = {
        id: crypto.randomUUID(),
        employeeId,
        employeeName,
        date: today,
        status: isLate ? "LATE" : "PRESENT",
        checkInTime: now.toISOString(),
        checkOutTime: null,
        totalHours: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Step 1: Save to Dexie (Offline-First)      await db.attendance.add(attendance);
      console.log("💾 Check-in saved to Dexie:", employeeName);

      // Step 2: Update local state
      set((state) => ({
        todayAttendances: [...state.todayAttendances, attendance],
        loading: false,
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      syncAttendanceToSupabase(attendance).catch((err) => {
        console.error("⚠️ Check-in sync failed:", err);
      });

      return attendance;
    } catch (error) {
      console.error("❌ Check-in failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ====================================
  // CHECK OUT (Background Sync)
  // ====================================
  checkOut: async (attendanceId) => {
    set({ loading: true, error: null });
    try {
      const attendance = await db.attendance.get(attendanceId);
      if (!attendance) {
        throw new Error("Attendance record not found");
      }

      if (attendance.checkOutTime) {
        throw new Error("Sudah melakukan check-out");
      }

      const now = new Date();
      const workHours = calculateWorkHours(attendance.checkInTime, now);

      // Step 1: Update in Dexie
      await db.attendance.update(attendanceId, {
        checkOutTime: now.toISOString(),
        totalHours: workHours.total,
        updatedAt: now.toISOString(),
      });
      console.log("💾 Check-out saved to Dexie:", attendanceId);

      // Get updated record for sync
      const updatedAttendance = await db.attendance.get(attendanceId);

      // Step 2: Update local state
      set((state) => ({
        todayAttendances: state.todayAttendances.map((att) =>
          att.id === attendanceId
            ? {
                ...att,
                checkOutTime: now.toISOString(),
                totalHours: workHours.total,
              }
            : att,
        ),
        loading: false,
      }));

      // Step 3: Background Sync to Supabase (non-blocking)
      if (updatedAttendance) {
        syncAttendanceToSupabase(updatedAttendance).catch((err) => {
          console.error("⚠️ Check-out sync failed:", err);
        });
      }

      return workHours;
    } catch (error) {
      console.error("❌ Check-out failed:", error);
      set({ error: error.message, loading: false });
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
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const cloudAttendance = await fetchAttendanceFromSupabase(weekAgo, today);

      if (cloudAttendance.length > 0) {
        const dexieAttendance = mapCloudToDexie(cloudAttendance);
        await db.attendance.bulkPut(dexieAttendance);
        console.log(
          `✅ Synced ${dexieAttendance.length} attendance records from cloud`,
        );
        await get().loadTodayAttendances();
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
  getAttendanceByEmployee: async (employeeId, date) => {
    const dateStr = date.toISOString().split("T")[0];
    return await db.attendance
      .where("[employeeId+date]")
      .equals([employeeId, dateStr])
      .first();
  },

  getTodayAttendanceByEmployee: (employeeId) => {
    return get().todayAttendances.find((att) => att.employeeId === employeeId);
  },

  clearError: () => {
    set({ error: null });
  },
}));
