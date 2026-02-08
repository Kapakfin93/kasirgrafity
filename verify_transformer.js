// verify_transformer.js
// SIMULATION: useOrderStore.internalNormalizeOrder -> NotaPreview

const rawDBItem = {
  id: "item-123",
  product_name: "Spanduk Korea",
  quantity: 5,
  unit_price: 20000,
  subtotal: 100000,
  dimensions: {
    // This is the JSONB column from DB
    summary: "Bahan Korea",
    inputs: { length: 3, width: 1 },
    variant_info: "Bahan Korea 3m x 1m", // Mix of info
  },
  meta: {
    notes: "Cepat ya",
  },
};

console.log("--- TRANSFORMER VERIFICATION ---");

// 1. SIMULATE internalNormalizeOrder (The Fix)
const normalizedItem = {
  productId: "prod-001",
  productName: rawDBItem.product_name,
  qty: Number(rawDBItem.quantity),
  price: Number(rawDBItem.unit_price),
  totalPrice: Number(rawDBItem.subtotal),

  // 🔥 THE FIX: MAPPING DIMENSIONS
  dimensions: rawDBItem.dimensions || {},
  specs: rawDBItem.dimensions || {},

  meta: rawDBItem.meta || {},
};

console.log("NORMALIZED ITEM KEYS:", Object.keys(normalizedItem));

// 2. SIMULATE NotaPreview EXTRACTION (STRICT PRIORITY MATCH)
console.log("\n--- NOTA PREVIEW PRIORITY LOGIC SIMULATION ---");

// 1. Strict Price/Qty
const displayPrice = Number(
  normalizedItem.unit_price || normalizedItem.price || 0,
);
const displayQty = Number(normalizedItem.qty || normalizedItem.quantity || 1);
const displaySubtotal = Number(
  normalizedItem.subtotal ||
    normalizedItem.totalPrice ||
    displayPrice * displayQty ||
    0,
);

// 2. Single Source of Truth Specs
const finalSpecs = normalizedItem.dimensions || normalizedItem.specs || {};
const specs = finalSpecs;

// 3. Logic "Display Priority" (Mutually Exclusive)
let finalDescription = "";

// Prioritas 1: variant_info
if (specs.variant_info) {
  finalDescription = specs.variant_info;
}
// Prioritas 2: summary
else if (specs.summary) {
  finalDescription = specs.summary;
}
// Prioritas 3: Manual Inputs
else {
  const inputs = specs.inputs || {};
  if (inputs.length && inputs.width) {
    finalDescription = `${inputs.length}m x ${inputs.width}m`;
  }
}

console.log("Qty (Display):", displayQty);
console.log("Subtotal (Display):", displaySubtotal);
console.log("Final Description:", finalDescription);

if (finalDescription === "Bahan Korea 3m x 1m") {
  console.log("✅ SUCCESS: Priority 1 (Variant Info) selected!");
} else {
  console.error("❌ FAILED: Priority Logic mismatch. Got:", finalDescription);
}

// TEST SCENARIO 2: No variant_info, only inputs
const specs2 = { inputs: { length: 5, width: 2 } };
let finalDescription2 = "";
if (specs2.variant_info) finalDescription2 = specs2.variant_info;
else if (specs2.summary) finalDescription2 = specs2.summary;
else if (specs2.inputs?.length)
  finalDescription2 = `${specs2.inputs.length}m x ${specs2.inputs.width}m`;

console.log("Scenario 2 (Inputs Only):", finalDescription2);
if (finalDescription2 === "5m x 2m") {
  console.log("✅ SUCCESS: Priority 3 (Inputs) selected!");
}
