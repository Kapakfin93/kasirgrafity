// verify_quantity_fix.js
// SIMULATION OF THE NEW LOGIC IN useOrderStore.js (Quantity Fix)

const mockItems = [
  { name: "Item A (qty undefined)", products_id: "A" }, // Should default to 1
  { name: "Item B (qty=5)", qty: 5, products_id: "B" },
  { name: "Item C (quantity=3)", quantity: 3, products_id: "C" },
];

console.log("--- QUANTITY FIX VERIFICATION ---");

const mappedItems = mockItems.map((item) => {
  // === LOGIC START ===

  // 🔥 FIX: STANDARDIZE QUANTITY VARIABLE (Calculated ONCE)
  const finalQty = Number(item.qty || item.quantity || 1);

  return {
    product_name: item.name,
    quantity: finalQty,
    // calc_debug: `qty(${finalQty})`
  };
  // === LOGIC END ===
});

console.log("MAPPED ITEMS:", JSON.stringify(mappedItems, null, 2));

const itemA = mappedItems[0];
const itemB = mappedItems[1];
const itemC = mappedItems[2];

let success = true;

if (itemA.quantity !== 1) {
  console.error("❌ ITEM A FAILED: Expected 1, got " + itemA.quantity);
  success = false;
}
if (itemB.quantity !== 5) {
  console.error("❌ ITEM B FAILED: Expected 5, got " + itemB.quantity);
  success = false;
}
if (itemC.quantity !== 3) {
  console.error("❌ ITEM C FAILED: Expected 3, got " + itemC.quantity);
  success = false;
}

if (success) {
  console.log("✅ ALL CHECKS PASSED: Quantity logic is robust.");
}
