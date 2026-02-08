import { createClient } from "@supabase/supabase-js";

const url = "https://batipgbnlfakwmbtdmdt.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTYyNDIsImV4cCI6MjA4NDMzMjI0Mn0.w0u-P8okW1k46vvGjF41R5ID35yMamU0k04E9ajoYj0";

const supabase = createClient(url, key);

async function runQueryOne() {
  console.log("=== QUERY 1: RPC DEFINITION ===");
  const { data, error } = await supabase.rpc("pg_get_functiondef", {
    func_name: "create_pos_order_atomic",
  });
  if (error) {
    console.log("Query 1 Error:", error.message);
  } else {
    console.log(data);
  }
}

async function runQueryTwo() {
  console.log("\n=== QUERY 2: SCHEMA MAP ===");
  // Try direct query to information_schema (likely blocked)
  const tables = [
    "orders",
    "order_items",
    "order_payments",
    "finishing_options",
    "products",
    "product_price_matrix",
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(0);
    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
    } else {
      console.log(`${table}: ACCESSIBLE`);
    }
  }
}

async function runQueryThree() {
  console.log("\n=== QUERY 3: LAST ORDER EVIDENCE ===");
  const { data, error } = await supabase
    .from("orders")
    .select("order_number, total_amount, items_snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.log("Query 3 Error:", error.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function main() {
  await runQueryOne();
  await runQueryTwo();
  await runQueryThree();
}

main();
