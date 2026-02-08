import { createClient } from "@supabase/supabase-js";

const url = "https://batipgbnlfakwmbtdmdt.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTYyNDIsImV4cCI6MjA4NDMzMjI0Mn0.w0u-P8okW1k46vvGjF41R5ID35yMamU0k04E9ajoYj0";

const supabase = createClient(url, key);

async function queryOrder() {
  console.log("🔍 Querying order ORD-260206-000061...\n");

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, total_amount, payment_status, meta, items_snapshot",
    )
    .eq("order_number", "ORD-260206-000061")
    .limit(1);

  if (error) {
    console.log("❌ Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ Order not found. Fetching last order instead...\n");

    const { data: lastOrder, error: lastError } = await supabase
      .from("orders")
      .select(
        "id, order_number, created_at, total_amount, payment_status, meta, items_snapshot",
      )
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastError) {
      console.log("❌ Error:", lastError.message);
      return;
    }

    if (!lastOrder || lastOrder.length === 0) {
      console.log("⚠️ No orders found in database.");
      return;
    }

    console.log("📦 LAST ORDER FOUND:\n");
    console.log(JSON.stringify(lastOrder[0], null, 2));

    // Field verification
    console.log("\n\n📋 CRITICAL FIELD VERIFICATION:");
    const order = lastOrder[0];
    const meta = order.meta || {};
    const firstItem = (order.items_snapshot || [])[0] || {};
    const itemMeta = firstItem.metadata || {};

    console.log(
      `- meta.service_fee: ${meta.service_fee !== undefined ? "✅ " + meta.service_fee : "❌ NOT FOUND"}`,
    );
    console.log(
      `- meta.production_priority: ${meta.production_priority ? "✅ " + meta.production_priority : "❌ NOT FOUND"}`,
    );
    console.log(
      `- items_snapshot[0].metadata.original_specs: ${itemMeta.original_specs ? "✅ " + JSON.stringify(itemMeta.original_specs) : "❌ NOT FOUND"}`,
    );
    console.log(
      `- items_snapshot[0].metadata.finishing_names: ${itemMeta.finishing_names ? "✅ " + itemMeta.finishing_names : "❌ NOT FOUND"}`,
    );
    return;
  }

  console.log("📦 ORDER FOUND:\n");
  console.log(JSON.stringify(data[0], null, 2));

  // Field verification
  console.log("\n\n📋 CRITICAL FIELD VERIFICATION:");
  const order = data[0];
  const meta = order.meta || {};
  const firstItem = (order.items_snapshot || [])[0] || {};
  const itemMeta = firstItem.metadata || {};

  console.log(
    `- meta.service_fee: ${meta.service_fee !== undefined ? "✅ " + meta.service_fee : "❌ NOT FOUND"}`,
  );
  console.log(
    `- meta.production_priority: ${meta.production_priority ? "✅ " + meta.production_priority : "❌ NOT FOUND"}`,
  );
  console.log(
    `- items_snapshot[0].metadata.original_specs: ${itemMeta.original_specs ? "✅ " + JSON.stringify(itemMeta.original_specs) : "❌ NOT FOUND"}`,
  );
  console.log(
    `- items_snapshot[0].metadata.finishing_names: ${itemMeta.finishing_names ? "✅ " + itemMeta.finishing_names : "❌ NOT FOUND"}`,
  );
}

queryOrder();
