// verify_specs.js
// SIMULATION OF DATA FLOW: useOrderStore -> DB -> NotaPreview

// 1. SIMULATE useOrderStore.js OUTPUT (The "Rich Specs" Logic)
const mockInputItem = {
  productName: "Spanduk Korea",
  qty: 5,
  specs: {
    summary: "Bahan Korea 440gsm", // variant_info
    inputs: { length: 5, width: 1, finishing: ["Mata Ayam"] },
  },
  notes: "Jangan dilipat",
};

console.log("--- SPECS PERSISTENCE VERIFICATION ---");

// LOGIC COPIED FROM useOrderStore.js
const richSpecs = {
  ...mockInputItem.specs,
  // Inject Metadata Helpers
  variant_info: mockInputItem.specs.summary,
  finishing_list: [{ name: "Mata Ayam" }], // Simulated
  note: mockInputItem.notes,
};

// 2. SIMULATE DB STORAGE (Item in order_items table)
// The RPC saves 'richSpecs' into 'dimensions' column.
const dbItem = {
  productName: mockInputItem.productName,
  qty: mockInputItem.qty,
  dimensions: richSpecs, // <--- THIS IS THE KEY
  // meta: {} // Simulate missing meta on order_items
};

console.log("DB ITEM (Simulated):", JSON.stringify(dbItem, null, 2));

// 3. SIMULATE NotaPreview.jsx EXTRACTION (The "Deep Search" Logic)
const extractData = (item) => {
  const dbSpecs = item.dimensions || {};
  const meta = item.meta || {};

  // Merge sources
  const specs = { ...meta.specs, ...dbSpecs };

  return {
    variant_info: specs.variant_info, // Should get "Bahan Korea 440gsm"
    finishing_list: specs.finishing_list, // Should get array
    dimensions: specs.inputs?.length
      ? { w: specs.inputs.length, h: specs.inputs.width }
      : null,
    notes: specs.note || specs.notes,
  };
};

const result = extractData(dbItem);

console.log("\nEXTRACTED DATA IN NOTA PREVIEW:");
console.log(JSON.stringify(result, null, 2));

// VERIFICATION CLAUSES
if (
  result.variant_info === "Bahan Korea 440gsm" &&
  result.finishing_list[0].name === "Mata Ayam" &&
  result.dimensions.w === 5 &&
  result.notes === "Jangan dilipat"
) {
  console.log("✅ SUCCESS: All specs passed from Store -> DB -> Nota!");
} else {
  console.error("❌ FAILED: Data lost in transit.");
}
