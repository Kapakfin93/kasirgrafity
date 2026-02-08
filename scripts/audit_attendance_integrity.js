import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function auditIntegrity() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("Starting Forensic Audit of Attendance Data...");

  // 1. Fetch all employees
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, name");

  if (empError) {
    console.error("Failed to fetch employees:", empError);
    return;
  }
  const employeeIds = new Set(employees.map((e) => e.id));
  console.log(`Total Employees: ${employees.length}`);

  // 2. Fetch all attendance records
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select("*");

  if (attError) {
    console.error("Failed to fetch attendance:", attError);
    return;
  }
  console.log(`Total Attendance Records: ${attendance.length}`);

  let issues = 0;

  // 3. Analyze Integrity
  console.log("\n--- Forensics Report ---");

  for (const record of attendance) {
    // Check 1: Orphaned Records
    if (!employeeIds.has(record.employee_id)) {
      console.log(
        `[CRITICAL] Orphaned Attendance Record! ID: ${record.id}, EmployeeID: ${record.employee_id} (Does not exist in employees table)`,
      );
      issues++;
    }

    // Check 2: Logical Time Errors
    if (record.check_in_time && record.check_out_time) {
      const inTime = new Date(record.check_in_time);
      const outTime = new Date(record.check_out_time);
      if (outTime < inTime) {
        console.log(
          `[LOGIC] Time Paradox! Check-out is before Check-in. ID: ${record.id}, Emp: ${record.employee_id}`,
        );
        issues++;
      }
    }

    // Check 3: Missing Check-in
    if (!record.check_in_time && record.check_out_time) {
      console.log(
        `[LOGIC] Ghost Departure! Check-out without Check-in. ID: ${record.id}`,
      );
      issues++;
    }

    // Check 4: Duplicate Check-ins (Same employee, same date)
    // We can do this by aggregating first, but let's do a simple pass or just flag it if notice multiple.
  }

  // Check 4: Duplicates (Aggregation)
  const map = {};
  for (const record of attendance) {
    const key = `${record.employee_id}_${record.date}`;
    if (map[key]) {
      console.log(
        `[DUPLICATE] Multiple attendance records for Employee ${record.employee_id} on Date ${record.date}. IDs: ${map[key]} and ${record.id}`,
      );
      issues++;
    } else {
      map[key] = record.id;
    }
  }

  if (issues === 0) {
    console.log("No integrity issues found. Data seems clean.");
  } else {
    console.log(`\nFound ${issues} integrity issues.`);
  }
}

auditIntegrity();
