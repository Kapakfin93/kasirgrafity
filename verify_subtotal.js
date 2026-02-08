// verify_subtotal.js
// SIMULATION OF THE NEW LOGIC IN useOrderStore.js (Subtotal Fix)

const mockItem = {
  product_name: "Grosir Item",
  qty: 3,
  price: 100000,
  totalPrice: 100000, // <--- SIMULATING THE BUG (Stale/Wrong Subtotal from Input)
};

console.log("--- SLOTOTAL FIX VERIFICATION ---");
console.log("INPUT ITEM:", mockItem);

// === LOGIC COPIED FROM useOrderStore.js ===
// 1. Resolve Unit Price
let baseUnitPrice = Number(mockItem.unitPrice || mockItem.price || 0);
if (baseUnitPrice === 0 && (mockItem.totalPrice || mockItem.subtotal)) {
  const sub = Number(mockItem.totalPrice || mockItem.subtotal || 0);
  const q = Number(mockItem.qty || mockItem.quantity || 1);
  if (q > 0) baseUnitPrice = sub / q;
}
const finalUnitPrice = baseUnitPrice;

// 2. Resolve Quantity
const quantity = mockItem.qty || mockItem.quantity || 1;

// 3. 🔥 FIX: FORCE RECALCULATE SUBTOTAL
const subtotal = finalUnitPrice * quantity;
// ===========================================

console.log("CALCULATED SUBTOTAL:", subtotal);

if (subtotal === 300000) {
  console.log("✅ SUCCESS: Subtotal corrected based on Qty * Unit Price!");
} else {
  console.error("❌ FAILED: Subtotal is wrong.");
}

// PROOF JSON
const proofPayload = {
  items: [
    {
      ...mockItem,
      unit_price: finalUnitPrice,
      subtotal: subtotal, // This goes to Backend
    },
  ],
};

console.log("\nPROOF PAYLOAD (To Backend):");
console.log(JSON.stringify(proofPayload, null, 2));
