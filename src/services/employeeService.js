/**
 * Employee Service
 * Bridges Dexie (offline) and Supabase (cloud) for employee data
 * Pattern: Offline-First with Background Sync
 */

import { supabase } from "../services/supabaseClient";

/**
 * Sync a single employee to Supabase
 * Uses upsert to handle both insert and update
 * @param {Object} employeeData - Employee data from Dexie
 * @returns {Promise<Object>} - Synced employee data from Supabase
 */
export const syncEmployeeToSupabase = async (employeeData) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - employee sync queued");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("employees")
      .upsert(
        {
          id: employeeData.id,
          name: employeeData.name,
          role: employeeData.role,
          pin: employeeData.pin,
          status: employeeData.status || "ACTIVE",
          created_at: employeeData.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select();

    if (error) {
      console.error("❌ Employee sync failed:", error);
      throw error;
    }

    console.log("✅ Employee synced to Supabase:", data?.[0]?.name);
    return data?.[0] || null;
  } catch (error) {
    console.error("❌ Employee sync error:", error);
    throw error;
  }
};

/**
 * Fetch all employees from Supabase
 * Used for initial sync and cloud reconciliation
 * @returns {Promise<Array>} - Array of employees from cloud
 */
export const fetchEmployeesFromSupabase = async () => {
  if (!navigator.onLine) {
    console.log("📴 Offline - cannot fetch from cloud");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch employees failed:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} employees from Supabase`);
    return data || [];
  } catch (error) {
    console.error("❌ Fetch employees error:", error);
    return [];
  }
};

/**
 * Delete employee from Supabase (soft delete)
 * Sets status to INACTIVE rather than hard delete
 * @param {string} employeeId - UUID of employee to delete
 * @returns {Promise<Object>} - Updated employee data
 */
export const deleteEmployeeFromSupabase = async (employeeId) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - delete sync queued");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("employees")
      .update({
        status: "INACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .select();

    if (error) {
      console.error("❌ Employee delete sync failed:", error);
      throw error;
    }

    console.log("✅ Employee soft-deleted in Supabase:", employeeId);
    return data?.[0] || null;
  } catch (error) {
    console.error("❌ Employee delete sync error:", error);
    throw error;
  }
};

/**
 * Bulk sync employees to Dexie from Supabase
 * Maps Supabase fields to Dexie schema
 * @param {Array} cloudEmployees - Employees from Supabase
 * @returns {Array} - Employees formatted for Dexie
 */
export const mapCloudToDexie = (cloudEmployees) => {
  return cloudEmployees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    pin: emp.pin,
    status: emp.status,
    createdAt: emp.created_at,
    updatedAt: emp.updated_at,
  }));
};
