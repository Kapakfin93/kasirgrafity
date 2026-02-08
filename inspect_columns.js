// Step Id: 171
import { createClient } from "@supabase/supabase-js";

// Configuration from mcp_config.json
const supabaseUrl = "https://batipgbnlfakwmbtdmdt.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  console.log("--- INSPECTING COLUMNS ---\n");

  // Check 'orders' columns
  console.log('Fetching 1 row from "orders"...');
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .limit(1);

  if (orders && orders.length > 0) {
    const keys = Object.keys(orders[0]);
    console.log("ORDERS Columns:", keys.join(", "));
    console.log('Has "service_fee"?', keys.includes("service_fee"));
    console.log('Has "payment_status"?', keys.includes("payment_status"));
  } else {
    console.log("Orders table empty or error:", orderError?.message);
  }

  // Check 'order_items' columns
  console.log('\nFetching 1 row from "order_items"...');
  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("*")
    .limit(1);

  if (items && items.length > 0) {
    const keys = Object.keys(items[0]);
    console.log("ORDER_ITEMS Columns:", keys.join(", "));
    console.log('Has "specs"?', keys.includes("specs"));
    console.log('Has "dimensions"?', keys.includes("dimensions"));
  } else {
    console.log("Order Items table empty or error:", itemError?.message);
  }
}

inspectColumns();
