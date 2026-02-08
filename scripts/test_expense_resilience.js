// MOCK DEXIE
const db = {
  expenses: {
    data: [],
    add: async (record) => {
      db.expenses.data.push(record);
      return record.id;
    },
    update: async (id, changes) => {
      const index = db.expenses.data.findIndex((e) => e.id === id);
      if (index !== -1) {
        db.expenses.data[index] = { ...db.expenses.data[index], ...changes };
        console.log(
          `💾 [DB] Updated record ${id.substring(0, 8)}... with`,
          changes,
        );
      }
    },
    where: (field) => ({
      equals: (value) => ({
        toArray: async () => db.expenses.data.filter((e) => e[field] === value),
      }),
    }),
  },
};

// MOCK SUPABASE
let isOnline = true;
const supabase = {
  from: (table) => ({
    upsert: async (record) => {
      if (!isOnline) {
        console.log("☁️ [SUPABASE] Connection Failed (Offline)");
        throw new Error("Network Error");
      }
      console.log("☁️ [SUPABASE] Success:", record.description);
      return { data: [record], error: null };
    },
  }),
};

// MOCK SERVICE
const syncExpenseToSupabase = async (expenseData) => {
  if (!isOnline) return null; // Simplify for simulation
  return await supabase.from("expenses").upsert(expenseData);
};

// MOCK STORE (Simplified logic from useExpenseStore)
const store = {
  expenses: [],
  addExpense: async (expenseData) => {
    const newExpense = {
      id: String(Math.random()),
      ...expenseData,
      isSynced: 0,
    };

    // 1. Dexie
    await db.expenses.add(newExpense);
    console.log("💾 [STORE] Saved to Dexie:", newExpense.description);

    // 2. Sync Attempt
    try {
      await syncExpenseToSupabase(newExpense);
      // Verify: Should update isSynced if success
      if (isOnline) await db.expenses.update(newExpense.id, { isSynced: 1 });
    } catch (err) {
      console.log("⚠️Sync failed, keeping isSynced: 0");
    }
  },

  processSyncQueue: async () => {
    console.log("\n🔄 Triggering Sync Queue...");
    if (!isOnline) {
      console.log("📴 Still Offline");
      return;
    }

    const pending = await db.expenses.where("isSynced").equals(0).toArray();
    console.log(`📋 Pending Items: ${pending.length} records`);

    for (const record of pending) {
      try {
        await syncExpenseToSupabase(record);
        await db.expenses.update(record.id, { isSynced: 1 });
      } catch (err) {}
    }
  },
};

async function runTest() {
  console.log("--- 🧪 TEST: EXPENSE RESILIENCE ---");

  // 1. OFFLINE INPUT
  console.log("\n1️⃣ SCENARIO: Input while Offline");
  isOnline = false;
  await store.addExpense({ description: "Beli Bensin (Offline Mode)" });

  // Check DB state
  let pending = await db.expenses.where("isSynced").equals(0).toArray();
  console.log(`📊 DB Status: ${pending.length} pending record(s).`);

  // 2. RECONNECT & RELOAD
  console.log("\n2️⃣ SCENARIO: Reconnect & Auto-Process");
  isOnline = true;
  await store.processSyncQueue();

  // Check DB state again
  pending = await db.expenses.where("isSynced").equals(0).toArray();
  let synced = await db.expenses.where("isSynced").equals(1).toArray();

  console.log(`\n📊 FINAL STATUS:`);
  console.log(`   - Pending: ${pending.length}`);
  console.log(`   - Synced:  ${synced.length}`);

  if (synced.length === 1 && pending.length === 0) {
    console.log("\n✅ SUCCESS: Offline data recovered & synced!");
  } else {
    console.log("\n❌ FAILED: Data mismatch.");
  }
}

runTest();
