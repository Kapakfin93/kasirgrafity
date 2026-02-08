import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function checkShifts() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Checking for Shifts table...");

  const { data, error } = await supabase.from("shifts").select("*").limit(1);
  if (error) {
    console.log("Shifts table does not exist or error:", error.message);
  } else {
    console.log("Shifts table exists.");
  }

  console.log("\nChecking for shift_id in employees...");
  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("shift_id")
    .limit(1);
  if (empError) {
    console.log("shift_id column likely does not exist in employees.");
  } else {
    console.log("shift_id column exists in employees!");
  }
}

checkShifts();
