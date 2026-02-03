/**
 * Attendance Service
 * Bridges Dexie (offline) and Supabase (cloud) for attendance data
 * Pattern: Offline-First with Background Sync
 */

import { supabase } from "./supabaseClient";

/**
 * Sync attendance record to Supabase
 * @param {Object} attendanceData - Attendance data from Dexie
 * @returns {Promise<Object>} - Synced attendance data
 */
export const syncAttendanceToSupabase = async (attendanceData) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - attendance sync queued");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        {
          id: attendanceData.id,
          employee_id: attendanceData.employeeId,
          date: attendanceData.date,
          check_in_time: attendanceData.checkInTime,
          check_out_time: attendanceData.checkOutTime || null,
          work_hours: attendanceData.totalHours || null,
          status: attendanceData.status || "PRESENT",
          created_at: attendanceData.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select();

    if (error) {
      console.error("❌ Attendance sync failed:", error);
      throw error;
    }

    console.log("✅ Attendance synced to Supabase");
    return data?.[0] || null;
  } catch (error) {
    console.error("❌ Attendance sync error:", error);
    throw error;
  }
};

/**
 * Fetch attendance records from Supabase
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Attendance records
 */
export const fetchAttendanceFromSupabase = async (startDate, endDate) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - cannot fetch from cloud");
    return [];
  }

  try {
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    if (error) {
      console.error("❌ Fetch attendance failed:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} attendance records`);
    return data || [];
  } catch (error) {
    console.error("❌ Fetch attendance error:", error);
    return [];
  }
};

/**
 * Map cloud attendance data to Dexie format
 */
export const mapCloudToDexie = (cloudAttendance) => {
  return cloudAttendance.map((att) => ({
    id: att.id,
    employeeId: att.employee_id,
    date: att.date,
    checkInTime: att.check_in_time,
    checkOutTime: att.check_out_time,
    totalHours: att.work_hours,
    status: att.status,
    createdAt: att.created_at,
    updatedAt: att.updated_at,
  }));
};
