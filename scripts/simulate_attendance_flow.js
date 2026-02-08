import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function simulateFlow() {
  console.log("--- STARTING ATTENDANCE FLOW SIMULATION ---");

  const testId = uuidv4();
  const testName = `ForensicTest_${Date.now()}`;
  const testPin = "9999";

  // 1. Create Employee
  console.log(`\n[STEP 1] Creating Employee: ${testName}`);
  const { data: empData, error: empError } = await supabase
    .from("employees")
    .insert({
      id: testId,
      name: testName,
      role: "TEST_AUDIT",
      pin: testPin,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (empError) {
    console.error("[FAIL] Create Employee:", empError.message);
    return;
  }
  console.log("[SUCCESS] Employee created:", empData.id);

  // 2. Check In
  console.log(`\n[STEP 2] Checking In for ${testName}`);
  const attendanceId = uuidv4();
  const checkInTime = new Date().toISOString();
  // Simulate today's date YYYY-MM-DD
  const today = checkInTime.split("T")[0];

  const { data: checkInData, error: checkInError } = await supabase
    .from("attendance")
    .insert({
      id: attendanceId,
      employee_id: testId,
      date: today,
      check_in_time: checkInTime,
      status: "PRESENT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (checkInError) {
    console.error("[FAIL] Check In:", checkInError.message);
    // Cleanup employee even if checkin fails
    await supabase.from("employees").delete().eq("id", testId);
    return;
  }
  console.log("[SUCCESS] Check In recorded:", checkInData.id);

  // 3. Verify Check In State
  const { data: verifyData } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", attendanceId)
    .single();

  if (!verifyData || verifyData.check_out_time !== null) {
    console.warn(
      "[WARN] Newly checked in record has unexpected state:",
      verifyData,
    );
  } else {
    console.log("[OK] Record verified as open (no check_out_time)");
  }

  // 4. Check Out
  console.log(`\n[STEP 3] Checking Out for ${testName}`);
  const checkOutTime = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour later
  const { data: checkOutData, error: checkOutError } = await supabase
    .from("attendance")
    .update({
      check_out_time: checkOutTime,
      work_hours: 1.0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attendanceId)
    .select()
    .single();

  if (checkOutError) {
    console.error("[FAIL] Check Out:", checkOutError.message);
  } else {
    console.log(
      "[SUCCESS] Check Out recorded. Work Hours:",
      checkOutData.work_hours,
    );
  }

  // 5. Cleanup
  console.log("\n[STEP 4] Cleaning up test data...");
  const { error: delAttError } = await supabase
    .from("attendance")
    .delete()
    .eq("id", attendanceId);
  const { error: delEmpError } = await supabase
    .from("employees")
    .delete()
    .eq("id", testId);

  if (delAttError || delEmpError) {
    console.warn("[WARN] Cleanup failed:", delAttError || delEmpError);
  } else {
    console.log("[SUCCESS] Cleanup complete.");
  }

  console.log("\n--- SIMULATION COMPLETE ---");
}

simulateFlow();
