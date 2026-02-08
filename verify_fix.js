// verify_fix.js
// SIMULATION OF THE NEW LOGIC IN useOrderStore.js

const mockItem = {
  product_name: "Spanduk 2x1",
  quantity: 10,
  subtotal: 200000,
  unitPrice: 0, // <--- SIMULATING THE BUG (Missing Unit Price)
};

console.log("--- UNIT PRICE FIX VERIFICATION ---");
console.log("INPUT ITEM:", mockItem);

// === LOGIC COPIED FROM useOrderStore.js (Lines 588-596) ===
let baseUnitPrice = Number(mockItem.unitPrice || mockItem.price || 0);

// 🔥 FIX: FALLBACK CALCULATION
// If unitPrice is 0 but we have subtotal, derive it.
if (baseUnitPrice === 0 && (mockItem.totalPrice || mockItem.subtotal)) {
  const sub = Number(mockItem.totalPrice || mockItem.subtotal || 0);
  const q = Number(mockItem.qty || mockItem.quantity || 1);
  if (q > 0) baseUnitPrice = sub / q;
  console.log(
    `[LOGIC TRIGGERED] Recalculated Unit Price: ${sub} / ${q} = ${baseUnitPrice}`,
  );
}

const finalUnitPrice = baseUnitPrice;
// ==========================================================

console.log("FINAL UNIT PRICE:", finalUnitPrice);

if (finalUnitPrice === 20000) {
  console.log("✅ SUCCESS: Logic recovered the correct Unit Price!");
} else {
  console.error("❌ FAILED: Still getting wrong price.");
}

// PROOF JSON
const proofPayload = {
  items: [
    {
      ...mockItem,
      unit_price: finalUnitPrice, // This is what goes to Backend
      subtotal: mockItem.subtotal,
    },
  ],
};

console.log("\nPROOF PAYLOAD (To Backend):");
console.log(JSON.stringify(proofPayload, null, 2));
