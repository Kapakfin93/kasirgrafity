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
  // CHECK IN (Offline-First + Just-in-Time Check)
  // ====================================
  checkIn: async (employeeId, employeeName) => {
    set({ loading: true, error: null });
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentShift = getCurrentShift(now);

      // 1. LOCAL CHECK (Dexie)
      // 1. LOCAL CHECK (Dexie) - MODIFIED FOR 12-HOUR SHIFTS
      // Old Logic: Block if same 'date' (24h)
      // New Logic: Block only if last check-in was < 12 hours ago

      const lastAttendance = await db.attendance
        .where("employeeId")
        .equals(employeeId)
        .reverse()
        .first();

      if (lastAttendance) {
        const lastCheckIn = new Date(lastAttendance.checkInTime);
        const hoursSinceLast = (now - lastCheckIn) / (1000 * 60 * 60);

        // Jika belum 12 jam, tolak.
        if (hoursSinceLast < 12) {
          throw new Error(
            "Portal tertutup: Check-in tersedia 12 jam setelah absen terakhir.",
          );
        }
      }

      // 2. JUST-IN-TIME CHECK (Cloud - Only if Online)
      if (navigator.onLine) {
        try {
          const cloudCheck = await fetchAttendanceFromSupabase(now, now);
          const alreadyCheckedIn = cloudCheck.find(
            (a) => a.employee_id === employeeId,
          );
          if (alreadyCheckedIn) {
            // Sync it down to local immediately
            await syncAttendanceToSupabase(alreadyCheckedIn); // 其实是 sync DOWN logic but re-using helper pending better name
            // Wait, we need to save cloud record to local to block future attempts
            const dexieRecord = mapCloudToDexie([alreadyCheckedIn])[0];
            await db.attendance.put(dexieRecord);

            // Update state
            set((state) => ({
              todayAttendances: [...state.todayAttendances, dexieRecord],
            }));

            throw new Error(
              "Sudah check-in di perangkat lain! Data telah disinkronkan.",
            );
          }
        } catch (err) {
          console.warn(
            "⚠️ JIT Check failed (network?), proceeding with local optimistic update.",
            err,
          );
        }
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
        isSynced: 0, // 0 = False
      };

      // Step 3: Save to Dexie (Offline-First)
      await db.attendance.add(attendance);
      console.log("💾 Check-in saved to Dexie:", employeeName);

      // Step 4: Update local state
      set((state) => ({
        todayAttendances: [...state.todayAttendances, attendance],
        loading: false,
      }));

      // Step 5: Background Sync (non-blocking)
      syncAttendanceToSupabase(attendance)
        .then(() => {
          // Mark as synced
          db.attendance.update(attendance.id, { isSynced: 1 });
        })
        .catch((err) => {
          console.error("⚠️ Check-in sync failed (saved locally):", err);
          // It remains isSynced: 0, will be picked up by processSyncQueue
        });

      return attendance;
    } catch (error) {
      console.error("❌ Check-in failed:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ====================================
  // CHECK OUT (Offline-First)
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

      // Step 1: Update in Dexie (Mark as unsynced again)
      await db.attendance.update(attendanceId, {
        checkOutTime: now.toISOString(),
        totalHours: workHours.total,
        updatedAt: now.toISOString(),
        isSynced: 0, // Reset to 0 to ensure update is sent
      });
      console.log("💾 Check-out saved to Dexie:", attendanceId);

      // Get updated record
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

      // Step 3: Background Sync
      if (updatedAttendance) {
        syncAttendanceToSupabase(updatedAttendance)
          .then(() => {
            db.attendance.update(attendanceId, { isSynced: 1 });
          })
          .catch((err) => {
            console.error("⚠️ Check-out sync failed (saved locally):", err);
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
  // PROCESS SYNC QUEUE (Auto-Retry)
  // ====================================
  processSyncQueue: async () => {
    if (!navigator.onLine) return;

    const pending = await db.attendance.where("isSynced").equals(0).toArray();
    if (pending.length === 0) return;

    console.log(
      `🔄 Processing ${pending.length} pending attendance records...`,
    );

    let syncedCount = 0;
    for (const record of pending) {
      try {
        await syncAttendanceToSupabase(record);
        await db.attendance.update(record.id, { isSynced: 1 });
        syncedCount++;
      } catch (err) {
        console.error(`❌ Failed to sync record ${record.id}:`, err);
      }
    }

    if (syncedCount > 0) {
      console.log(`✅ Successfully synced ${syncedCount} queued records.`);
    }
  },

  // ====================================
  // SYNC FROM CLOUD (Smart Sync)
  // ====================================
  syncFromCloud: async (force = false) => {
    set({ syncStatus: "syncing" });
    try {
      // 1. Time-Based Check (Save Quota)
      const lastSync = localStorage.getItem("lastAttendanceSync");
      const now = new Date();

      if (!force && lastSync) {
        const lastSyncDate = new Date(lastSync);
        const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);
        // 🚨 CRITICAL FIX (Rifki Case): Reduced from 24h to 1 minute (0.016 hours)
        // This allows Owner to refresh and garnish new data immediately.
        if (hoursDiff < 0.016) {
          console.log("⏳ Smart Sync: Skipping (Last sync < 1min ago)");
          set({ syncStatus: "idle" });
          return;
        }
      }

      // 2. Fetch Data
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const cloudAttendance = await fetchAttendanceFromSupabase(weekAgo, today);

      if (cloudAttendance.length > 0) {
        const dexieAttendance = mapCloudToDexie(cloudAttendance);
        // Mark these as synced since they came from cloud
        const syncedRecords = dexieAttendance.map((d) => ({
          ...d,
          isSynced: 1,
        }));

        await db.attendance.bulkPut(syncedRecords);
        console.log(
          `✅ Synced ${dexieAttendance.length} attendance records from cloud`,
        );
        await get().loadTodayAttendances();
      }

      // 3. Update Timestamp
      localStorage.setItem("lastAttendanceSync", now.toISOString());
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
