import { createClient } from "@supabase/supabase-js";

// Credentials from mcp_config.json
const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const TARGET_ORDER_NUMBER = "ORD-20260210-140844-2dd6";

async function performAudit() {
  console.log(`🔍 AUDIT TARGET: ${TARGET_ORDER_NUMBER}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", TARGET_ORDER_NUMBER)
      .single();

    if (orderError) {
      console.error("❌ ORDER NOT FOUND or Error:", orderError.message);
      return;
    }

    console.log("✅ ORDER FOUND! Server Record:");
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.production_status || order.status}`);
    console.log(
      `   Payment: ${order.payment_status} (${order.paid_amount || 0})`,
    );
    console.log(`   Updated At: ${order.updated_at}`);

    // 2. Fetch Items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsError)
      console.error("⚠️ Failed to fetch items:", itemsError.message);
    else console.log(`📦 ITEMS: Found ${items.length} items linked.`);

    // 3. Fetch Audit Logs (CCTV)
    const { data: logs, error: logsError } = await supabase
      .from("event_logs")
      .select("*")
      .or(
        `ref_id.eq.${order.id},metadata->>ref_local_id.eq.${order.id},metadata->>ref_local_id.eq.${order.ref_local_id || "UNKNOWN"}`,
      )
      .order("created_at", { ascending: true }); // Chronological

    if (logsError) console.error("⚠️ Failed to fetch logs:", logsError.message);
    else {
      console.log(`🕵️‍♂️ DIGITIAL FOOTPRINT (${logs.length} Events):`);
      logs.forEach((log, index) => {
        console.log(
          `   [${index + 1}] ${log.created_at} | ${log.event_name} | Actor: ${log.actor}`,
        );
      });
    }
  } catch (err) {
    console.error("❌ Unexpected Audit Failure:", err);
  }
}

performAudit();
