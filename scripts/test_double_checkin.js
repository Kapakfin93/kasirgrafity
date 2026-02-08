import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function checkDoubleCheckIn() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("--- Testing Double Check-In Constraint ---");

  // 1. Create Test Employee
  const testId = uuidv4();
  const testName = `DoubleCheckInTest_${Date.now()}`;

  await supabase.from("employees").insert({
    id: testId,
    name: testName,
    role: "TEST",
    pin: "0000",
    status: "ACTIVE",
  });
  console.log(`Created Employee: ${testId}`);

  const today = new Date().toISOString().split("T")[0];
  const rec1_id = uuidv4();
  const rec2_id = uuidv4();

  // 2. First Check-In (Should Succeed)
  const { error: err1 } = await supabase.from("attendance").insert({
    id: rec1_id,
    employee_id: testId,
    date: today,
    check_in_time: new Date().toISOString(),
    status: "PRESENT",
  });

  if (err1) {
    console.error("First Insert Failed:", err1.message);
  } else {
    console.log("First Insert Success.");
  }

  // 3. Second Check-In (Should Fail if constraint exists)
  const { error: err2 } = await supabase.from("attendance").insert({
    id: rec2_id,
    employee_id: testId,
    date: today, // Same date!
    check_in_time: new Date().toISOString(),
    status: "PRESENT",
  });

  if (err2) {
    console.log("Second Insert Failed (EXPECTED):", err2.message);
    if (
      err2.message.includes("duplicate key value violates unique constraint") ||
      err2.code === "23505"
    ) {
      console.log("Constraint is WORKING correctly.");
    }
  } else {
    console.error(
      "Second Insert Success (NOT EXPECTED). Double check-in is possible!",
    );
  }

  // Cleanup
  await supabase.from("attendance").delete().eq("employee_id", testId);
  await supabase.from("employees").delete().eq("id", testId);
  console.log("Test Complete.");
}

checkDoubleCheckIn();
