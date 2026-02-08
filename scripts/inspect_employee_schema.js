import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function inspectSchema() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Inspecting Employees and Attendance Schema...");

  const tables = ["employees", "attendance", "absensi", "employee_shifts"];

  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);

    // Get one row to see columns
    const { data, error } = await supabase.from(table).select("*").limit(1);

    if (error) {
      console.log(`Error checking table '${table}': ${error.message}`);
      // If error is 404/not found, it means the table doesn't exist.
    } else {
      if (data && data.length > 0) {
        console.log(`Columns found:`, Object.keys(data[0]));
        console.log(`Sample row:`, data[0]);
      } else {
        console.log(
          `Table '${table}' exists but is empty. We cannot infer columns easily without a row.`,
        );
        // Try to insert a dummy row and fail to see columns? No, that's risky.
        // We'll rely on the error message if we try to select a specific column later if needed.
      }
    }
  }
}

inspectSchema();
