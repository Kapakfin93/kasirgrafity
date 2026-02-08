import { createClient } from "@supabase/supabase-js";

// LOAD ENV
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
  console.log("--- STARTING SMART MERGE VERIFICATION ---");

  // TEST SCENARIO: Booklet + Notes
  console.log("\n[TEST] Creating Booklet Order with Notes...");
  const payload = {
    items: [
      {
        product_name: "Booklet Profile Perusahaan",
        quantity: 100,
        unit_price: 15000,
        subtotal: 1500000,
        specs: {
          type: "BOOKLET",
          pages: 20,
          cover: "ArtCarton 260",
          binding: "Steples",
        },
        notes: "PERHATIAN: Cover harus dilaminasi Doff halus!",
      },
    ],
    total_amount: 1500000,
    payment: { amount: 0, method: "CASH", received_by: "Tester" },
    payment_status: "UNPAID",
    remaining_amount: 1500000,
    is_tempo: true,
    customer: { name: "Test Merge", phone: "08123456789" },
  };

  const { data: orderData, error: orderError } = await supabase.rpc(
    "create_pos_order_notary",
    { p_payload: payload },
  );

  if (orderError) {
    console.error("❌ TEST FAILED (RPC Error):", orderError);
    return;
  }

  const orderId = orderData.order_id;
  console.log(`✅ Order Created: ${orderData.order_number} (ID: ${orderId})`);

  // FORENSIC VERIFICATION
  console.log("\n[FORENSIC] Fetching inserted data...");
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("dimensions")
    .eq("order_id", orderId)
    .single();

  if (itemsError || !itemsData) {
    console.error("❌ TEST FAILED (Fetch Error):", itemsError);
    return;
  }

  const savedJSON = itemsData.dimensions;
  console.log(
    "📦 SAVED JSON (dimensions):",
    JSON.stringify(savedJSON, null, 2),
  );

  // VALIDATION CHECKS
  const hasSpecs = savedJSON.pages === 20 && savedJSON.binding === "Steples";
  const hasNote =
    savedJSON.note === "PERHATIAN: Cover harus dilaminasi Doff halus!";

  console.log("\n--- VERDICT ---");
  console.log(`1. Specs Preservation: ${hasSpecs ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`2. Note Merge: ${hasNote ? "✅ PASS" : "❌ FAIL"}`);

  if (hasSpecs && hasNote) {
    console.log("\n✅✅ SMART MERGE SUCCESSFUL");
  } else {
    console.error("\n❌❌ SMART MERGE FAILED");
  }
}

runTest();
