import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function auditValues() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("--- Value Consistency Audit ---\n");

  // Employee Roles
  console.log("Checking Employee Roles consistency...");
  const { data: employees } = await supabase
    .from("employees")
    .select("role, status");

  const roles = {};
  const statuses = {};

  employees.forEach((e) => {
    roles[e.role] = (roles[e.role] || 0) + 1;
    statuses[e.status] = (statuses[e.status] || 0) + 1;
  });

  console.log("Employee Roles:", roles);
  console.log("Employee Statuses:", statuses);

  // Attendance Statuses
  console.log("\nChecking Attendance Status consistency...");
  const { data: attendance } = await supabase
    .from("attendance")
    .select("status");

  const attStatuses = {};
  attendance.forEach((a) => {
    attStatuses[a.status] = (attStatuses[a.status] || 0) + 1;
  });

  console.log("Attendance Statuses:", attStatuses);
}

auditValues();
