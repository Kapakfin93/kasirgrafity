import { v4 as uuidv4 } from "uuid";

// MOCK DEXIE
const db = {
  attendance: {
    data: [],
    put: async (record) => {
      const existingIndex = db.attendance.data.findIndex(
        (r) => r.id === record.id,
      );
      if (existingIndex >= 0) db.attendance.data[existingIndex] = record;
      else db.attendance.data.push(record);
    },
    update: async (id, updates) => {
      const record = db.attendance.data.find((r) => r.id === id);
      if (record) Object.assign(record, updates);
    },
    where: (field) => ({
      equals: (value) => ({
        toArray: async () =>
          db.attendance.data.filter((r) => r[field] === value),
      }),
    }),
    bulkPut: async (records) => {
      records.forEach((r) => db.attendance.put(r));
    },
  },
};

// MOCK SUPABASE
const supabase = {
  from: (table) => ({
    insert: async (record) => {
      // Simulate strict constraint
      if (table === "attendance") {
        // logic to fail if duplicate
      }
      return { error: null };
    },
  }),
};

// LOGIC TO TEST
async function processSyncQueue() {
  console.log("--- TEST SYNC QUEUE ---");

  // 1. Seed Mock Data (Offline Record)
  const recordId = uuidv4();
  await db.attendance.put({
    id: recordId,
    employeeId: "emp1",
    date: "2026-02-08",
    isSynced: 0,
  });

  console.log("Initial State:", db.attendance.data);

  // 2. Run Process
  const pending = await db.attendance.where("isSynced").equals(0).toArray();
  console.log(`Found ${pending.length} pending records.`);

  for (const record of pending) {
    // Simulate Sync
    console.log(`Syncing ${record.id}...`);
    await supabase.from("attendance").insert(record);
    await db.attendance.update(record.id, { isSynced: 1 });
  }

  console.log("Final State:", db.attendance.data);

  if (db.attendance.data[0].isSynced === 1) {
    console.log("✅ SUCCESS: Record marked as synced.");
  } else {
    console.error("❌ FAILURE: Record not synced.");
  }
}

processSyncQueue();
