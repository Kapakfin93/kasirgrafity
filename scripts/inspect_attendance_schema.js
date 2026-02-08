import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function inspectSchema() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Inspecting Attendance Schema...");

  const tables = ["attendance", "employees"];

  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);

    const { data, error } = await supabase.from(table).select("*").limit(1);

    if (error) {
      console.log(`Error checking table '${table}': ${error.message}`);
    } else {
      if (data && data.length > 0) {
        console.log(`Columns found:`, Object.keys(data[0]));
      } else {
        console.log(`Table '${table}' exists but is empty.`);
        // insert dummy to check schema? No, safe introspection only.
      }
    }
  }
}

inspectSchema();
