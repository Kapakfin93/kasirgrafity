import { createClient } from "@supabase/supabase-js";

// LOAD ENV
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- FRONTEND LOGIC SIMULATION ---
// We simulate the exact logic found in transactionLogic.js (or assumed standard logic)
function calculateTieredPrice(qty) {
  // Rule: < 500 @ 2000, >= 500 @ 1000
  if (qty >= 500) return 1000;
  return 2000;
}

async function runTest() {
  console.log("--- THE GRAND CALCULATION TEST ---");

  // 1. SIMULATE FRONTEND CALCULATION
  console.log("\n[FRONTEND] Calculating Order...");

  // Item A: Tiered Brosur (Qty 600)
  const qtyA = 600;
  const priceA = calculateTieredPrice(qtyA); // Should be 1000
  const subtotalA = qtyA * priceA; // 600,000
  console.log(` - Item A (Tiered): Qty ${qtyA} @ ${priceA} = ${subtotalA}`);

  if (priceA !== 1000) {
    console.error("❌ CRITICAL MATH BUG: Tiered Price wrong!");
    return;
  }

  // Item B: Stempel (Qty 1)
  const qtyB = 1;
  const priceB = 50000;
  const subtotalB = qtyB * priceB; // 50,000
  console.log(` - Item B (Unit): Qty ${qtyB} @ ${priceB} = ${subtotalB}`);

  // Subtotal Barang
  const itemsSubtotal = subtotalA + subtotalB; // 650,000

  // Service Fee (Included as Item usually, or separate? usage says Included as Item usually)
  // But useTransaction logic often adds it as a meta/line item.
  // Let's assume it's a line item for consistency with earlier findings.
  const serviceFee = 20000;
  const feeItem = {
    product_name: "Biaya Layanan (Express)",
    quantity: 1,
    unit_price: serviceFee,
    subtotal: serviceFee,
    notes: "Fee",
  };

  // Discount (Global)
  const discount = 70000;

  // Grand Total
  const totalAmount = itemsSubtotal + serviceFee - discount; // 650k + 20k - 70k = 600k
  console.log(` - Subtotal: ${itemsSubtotal}`);
  console.log(` - Fee: ${serviceFee}`);
  console.log(` - Discount: -${discount}`);
  console.log(` - GRAND TOTAL: ${totalAmount}`);

  if (totalAmount !== 600000) {
    console.error(
      `❌ CALCULATION MISMATCH. Expected 600,000. Got ${totalAmount}`,
    );
    return;
  }

  // Payment (Tempo)
  const paidAmount = 200000;
  const remaining = totalAmount - paidAmount; // 400,000
  const status = remaining > 0 ? "PARTIAL" : "PAID";
  console.log(` - Paid: ${paidAmount}`);
  console.log(` - Remaining: ${remaining}`);
  console.log(` - Status: ${status}`);

  // 2. CONSTRUCT PAYLOAD
  const payload = {
    items: [
      {
        product_name: "Brosur Tiered",
        quantity: qtyA,
        unit_price: priceA,
        subtotal: subtotalA,
        specs: { type: "TIERED", rule: ">=500->1000" },
      },
      {
        product_name: "Stempel",
        quantity: qtyB,
        unit_price: priceB,
        subtotal: subtotalB,
        specs: { type: "UNIT" },
      },
      feeItem,
    ],
    total_amount: totalAmount,
    discount_amount: discount,
    paid_amount: paidAmount,
    remaining_amount: remaining,
    payment_status: status,
    is_tempo: true,
    payment: { method: "CASH", received_by: "MathTester" },
    customer: { name: "Mr. Gado Gado", phone: "0899999" },
  };

  // 3. SEND TO BACKEND
  console.log("\n[BACKEND] Sending to Supabase...");
  const { data: orderData, error: orderError } = await supabase.rpc(
    "create_pos_order_notary",
    { p_payload: payload },
  );

  if (orderError) {
    console.error("❌ RPC FAILED:", orderError);
    return;
  }

  const orderId = orderData.order_id;
  console.log(`✅ Order Created: ${orderData.order_number}`);

  // 4. VERIFY DATABASE
  console.log("\n[AUDIT] Verifying Database...");
  const { data: dbOrder, error: dbError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (dbError) {
    console.error("❌ DB FETCH FAILED:", dbError);
    return;
  }

  console.log(` - DB Total: ${dbOrder.total_amount}`);
  console.log(` - DB Paid: ${dbOrder.paid_amount}`);
  console.log(` - DB Remaining: ${dbOrder.remaining_amount}`);
  console.log(` - DB Status: ${dbOrder.payment_status}`);

  // FINAL VERDICT
  const mathOk =
    dbOrder.total_amount === 600000 && dbOrder.remaining_amount === 400000;
  const statusOk = dbOrder.payment_status === "PARTIAL";

  if (mathOk && statusOk) {
    console.log("\n✅✅ GRAND CALCULATION TEST PASSED!");
  } else {
    console.error("\n❌❌ MATH AUDIT FAILED!");
  }
}

runTest();
