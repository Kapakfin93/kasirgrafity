// 🧪 SIMULASI: Audit Data Expense (Admin Input -> Owner View)
// Tujuan: Cek apakah data yang diinput 'Admin' bisa dibaca oleh 'Owner' via Realtime/Fetch.

const mockAdmin = {
  id: "user_admin_123",
  role: "admin",
  email: "admin@joglo.com",
};
const mockOwner = {
  id: "user_owner_999",
  role: "owner",
  email: "owner@joglo.com",
};

// 1. Simluasi Input Data (Admin)
const expenseInput = {
  amount: 50000,
  category: "OPERATIONAL",
  description: "Beli Kertas A4 (Audit Data)",
  createdBy: "Admin",
  date: new Date().toISOString(), // Hari ini
};

console.log("📝 [Scenario 1] Admin Input Data...");
// Mock Supabase Upsert
const mockDbInsert = (data, user) => {
  console.log(`   -> 💾 DB Insert by ${user.role}: Success`);
  return { ...data, id: "exp_" + Date.now(), created_by: user.name };
};

const record = mockDbInsert(expenseInput, mockAdmin);

// 2. Simulasi Realtime Listener (Owner)
console.log("\n📡 [Scenario 2] Owner Listening...");
const activeFilters = {
  period: "month", // Default filter di ExpensePage.jsx
  dateRange: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  },
};

// Cek Filter Logic (ExpensePage.jsx)
const isVisible = (exp, filters) => {
  const expDate = new Date(exp.date);
  const inRange =
    expDate >= filters.dateRange.start && expDate <= filters.dateRange.end;
  console.log(
    `   -> 📅 Date Check: ${exp.date} vs Range [${filters.dateRange.start.toISOString()} - ${filters.dateRange.end.toISOString()}]`,
  );
  console.log(`   -> Match? ${inRange ? "YES" : "NO"}`);
  return inRange;
};

if (isVisible(record, activeFilters)) {
  console.log("✅ VISIBLE: Owner should see this record.");
} else {
  console.log("❌ HIDDEN: Record filtered out by UI/Date Logic.");
}

// 3. Simulasi RLS (Row Level Security) - Hipotesis
console.log("\n🔒 [Scenario 3] Checking RLS Hypotheses...");
console.log(
  "   Hypothesis A: 'public' schema has no policy for 'INSERT' by Admin? -> If so, Insert failed silently.",
);
console.log(
  "   Hypothesis B: 'public' schema has policy 'SELECT' only for Own Rows? -> If so, Owner cannot see Admin's row.",
);
console.log("   Action: Need to check 'supbase/migrations' or table info.");
