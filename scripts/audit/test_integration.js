import { createClient } from "@supabase/supabase-js";

// LOAD ENV
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
  console.log("--- STARTING INTEGRATION TEST ---");

  // TEST 1: POLYMORPHIC DATA INSERTION (create_pos_order_notary)
  console.log("\n[TEST 1] Creating Order with Booklet Specs...");
  const payloadBox = {
    items: [
      {
        product_name: "Booklet Test",
        quantity: 100,
        unit_price: 5000,
        subtotal: 500000,
        specs: {
          // COMPLEX SPECS
          type: "BOOKLET",
          pages: 50,
          binding: "Spiral",
          cover: "ArtCarton",
        },
      },
    ],
    total_amount: 500000,
    payment: { amount: 0, method: "CASH", received_by: "Tester" },
    payment_status: "UNPAID",
    remaining_amount: 500000,
    is_tempo: true,
  };

  const { data: orderData, error: orderError } = await supabase.rpc(
    "create_pos_order_notary",
    { p_payload: payloadBox },
  );

  if (orderError) {
    console.error("❌ TEST 1 FAILED (Creation):", orderError);
    return;
  }

  console.log("DEBUG RPC RESPONSE:", JSON.stringify(orderData));

  const orderId = orderData.order_id;
  console.log(`✅ Order Created: ${orderData.order_number} (ID: ${orderId})`);

  // VERIFY SPECS IN DB
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("dimensions")
    .eq("order_id", orderId)
    .single();

  if (itemsError || !itemsData) {
    console.error("❌ TEST 1 FAILED (Fetch Items):", itemsError);
    return;
  }

  console.log(
    "📦 Saved Dimensions (Specs):",
    JSON.stringify(itemsData.dimensions),
  );

  if (itemsData.dimensions?.binding === "Spiral") {
    console.log("✅ TEST 1 PASSED: Polymorphic Data Persisted.");
  } else {
    console.error("❌ TEST 1 FAILED: Data Loss detected.");
  }

  // TEST 2: AUTO-SETTLEMENT (add_payment_to_order)
  console.log("\n[TEST 2] Processing Repayment (Auto-Settlement)...");

  const { data: payData, error: payError } = await supabase.rpc(
    "add_payment_to_order",
    {
      p_order_id: orderId,
      p_amount: 500000,
      p_user_name: "Tester",
      p_payment_method: "TRANSFER",
    },
  );

  if (payError) {
    console.error("❌ TEST 2 FAILED (Payment):", payError);
    return;
  }

  console.log("💰 Payment Result:", payData);

  // VERIFY DB STATUS
  const { data: finalOrder } = await supabase
    .from("orders")
    .select("payment_status, remaining_amount")
    .eq("id", orderId)
    .single();
  console.log("📊 Final DB State:", finalOrder);

  if (
    finalOrder.payment_status === "PAID" &&
    finalOrder.remaining_amount <= 0
  ) {
    console.log("✅ TEST 2 PASSED: Auto-Settlement verified.");
  } else {
    console.error("❌ TEST 2 FAILED: Status not updated correctly.");
  }

  console.log("\n--- TEST COMPLETE ---");
}

runTest();
