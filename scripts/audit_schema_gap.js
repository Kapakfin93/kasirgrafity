import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function auditSchemaGap() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("--- Schema Gap Analysis ---\n");

  // Expected Schemas based on code analysis
  const expectedSchemas = {
    employees: [
      "id",
      "name",
      "role",
      "pin",
      "status",
      "created_at",
      "updated_at",
    ],
    attendance: [
      "id",
      "employee_id",
      "date",
      "check_in_time",
      "check_out_time",
      "work_hours",
      "status",
      "created_at",
      "updated_at",
    ],
  };

  for (const [table, expectedCols] of Object.entries(expectedSchemas)) {
    console.log(`Checking table: ${table}`);

    const { data, error } = await supabase.from(table).select("*").limit(1);

    if (error) {
      console.error(
        `[CRITICAL] Table '${table}' access error: ${error.message}`,
      );
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(
        `[WARNING] Table '${table}' is empty. Cannot verify columns strictly.`,
      );
      // We can't verify columns if empty without using system tables which might be restricted.
      // But we can try to insert a dummy row with all expected columns and see if it fails?
      // That's invasive. Let's assume emptiness means we can't verify fully but can't find errors either.
      continue;
    }

    const actualCols = Object.keys(data[0]);
    const missing = expectedCols.filter((col) => !actualCols.includes(col));
    const extra = actualCols.filter((col) => !expectedCols.includes(col));

    if (missing.length > 0) {
      console.error(
        `[MISSING COLUMNS] Table '${table}' is missing columns expected by code:`,
        missing,
      );
    } else {
      console.log(`[OK] All expected columns present in '${table}'.`);
    }

    if (extra.length > 0) {
      console.log(
        `[EXTRA COLUMNS] Table '${table}' has columns not in explicit code list (might be auto-generated or unused):`,
        extra,
      );
    }
  }
}

auditSchemaGap();
