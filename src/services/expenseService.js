/**
 * Expense Service
 * Bridges Dexie (offline) and Supabase (cloud) for expense data
 * Pattern: Offline-First with Background Sync
 */

import { supabase } from "./supabaseClient";

/**
 * Sync expense to Supabase
 * @param {Object} expenseData - Expense data from Dexie
 * @returns {Promise<Object>} - Synced expense data
 */
export const syncExpenseToSupabase = async (expenseData) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - expense sync queued");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("expenses")
      .upsert(
        {
          id: expenseData.id,
          date: expenseData.date,
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description || null,
          employee_name: expenseData.employeeName || null,
          created_by: expenseData.createdBy,
          created_at: expenseData.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select();

    if (error) {
      console.error("❌ Expense sync failed:", error);
      throw error;
    }

    console.log("✅ Expense synced to Supabase");
    return data?.[0] || null;
  } catch (error) {
    console.error("❌ Expense sync error:", error);
    throw error;
  }
};

/**
 * Fetch expenses from Supabase
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Expense records
 */
export const fetchExpensesFromSupabase = async (startDate, endDate) => {
  if (!navigator.onLine) {
    console.log("📴 Offline - cannot fetch from cloud");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false });

    if (error) {
      console.error("❌ Fetch expenses failed:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} expenses from cloud`);
    return data || [];
  } catch (error) {
    console.error("❌ Fetch expenses error:", error);
    return [];
  }
};

/**
 * Map cloud expense data to Dexie format
 */
export const mapCloudToDexie = (cloudExpenses) => {
  return cloudExpenses.map((exp) => ({
    id: exp.id,
    date: exp.date,
    amount: Number(exp.amount),
    category: exp.category,
    description: exp.description,
    employeeName: exp.employee_name,
    createdBy: exp.created_by,
    createdAt: exp.created_at,
  }));
};
