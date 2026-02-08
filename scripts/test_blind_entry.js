// MOCK PERMISSIONS
const ROLES = {
  OWNER: { id: "owner", role: "owner", canViewHistory: true },
  ADMIN: { id: "admin", role: "admin", canViewHistory: false },
  CASHIER: { id: "cashier", role: "cashier", canViewHistory: false },
};

// MOCK STORE
let callCount = 0;
const useExpenseStore = {
  loadExpenses: () => {
    callCount++;
    console.log(
      "📥 Fetching Expenses from DB/Cloud... (Should only happen for Owner)",
    );
    return [{ id: 1, amount: 50000 }];
  },
};

// MOCK COMPONENT LOGIC
function renderExpensePage(user) {
  console.log(`\n👤 User: ${user.name} (${user.role.toUpperCase()})`);

  // LOGIC: Blind Mode Check (replicated from ExpensePage.jsx)
  const isOwner = user.role === "owner";

  // useEffect logic
  if (isOwner) {
    useExpenseStore.loadExpenses();
  } else {
    console.log("   ⚡ Optimization: Skipped loadExpenses()");
  }

  // Render logic
  const canViewHistory = isOwner;

  if (canViewHistory) {
    console.log("   ✅ View: FULL DASHBOARD (Charts, Tables, Totals)");
  } else {
    console.log("   🔒 View: BLIND ENTRY (Button Only)");
  }
}

function runTest() {
  console.log("--- 🕵️ FINAL VERIFICATION: BLIND ENTRY ---");

  // 1. Owner Login
  callCount = 0;
  renderExpensePage({ name: "Mr. Boss", ...ROLES.OWNER });
  if (callCount === 1) console.log("   ✅ PASS: Data Fetched");
  else console.log("   ❌ FAIL: Data Not Fetched");

  // 2. Cashier Login
  callCount = 0;
  renderExpensePage({ name: "Mas Kasir", ...ROLES.CASHIER });
  if (callCount === 0) console.log("   ✅ PASS: Data SKIPPED (Secure)");
  else console.log("   ❌ FAIL: Data Leaked!");
}

runTest();
