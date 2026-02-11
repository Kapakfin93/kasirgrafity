import { createClient } from "@supabase/supabase-js";

// Credentials from mcp_config.json
const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

async function testConnection() {
  console.log("🔌 Testing Supabase Connection...");
  console.log("   URL:", SUPABASE_URL);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Test Connection by fetching table metadata or a simple row
    const { data, error } = await supabase.from("orders").select("*").limit(1);

    if (error) {
      console.error("❌ Connection Failed:", error.message);
      process.exit(1);
    }

    console.log("✅ Connection Successful!");
    if (data && data.length > 0) {
      console.log("   Schema Keys:", Object.keys(data[0]));
    } else {
      console.log("   Table is empty.");
    }

    // 2. Extra: Check metadata if possible (optional)
    console.log("   Supabase is reachable and responding.");
  } catch (err) {
    console.error("❌ Unexpected Error:", err);
    process.exit(1);
  }
}

testConnection();
