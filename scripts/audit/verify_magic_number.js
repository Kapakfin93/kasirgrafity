import { createClient } from "@supabase/supabase-js";

// Credentials from test_grand_math.js
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  console.log("--- VERIFYING MAGIC NUMBER (1234567) ---");

  // Fetch recent products to check for updates
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, variants, input_mode")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("❌ DB ERROR:", error);
    return;
  }

  console.log(`Checking ${products.length} recently updated products...`);

  let found = false;

  for (const p of products) {
    let rawValue = null;
    let location = "";

    // Check Base Price (UNIT/Matrix/etc)
    if (p.price === 1234567) {
      rawValue = p.price;
      location = "Base Price (p.price)";
      found = true;
    }

    // Check Variants (TIERED/LINEAR/AREA)
    if (!found && p.variants && Array.isArray(p.variants)) {
      for (const v of p.variants) {
        if (v.price === 1234567) {
          rawValue = v.price;
          location = `Variant Price (v.price) - ${v.label}`;
          found = true;
          break;
        }
      }
    }

    if (found) {
      console.log(`\n✅ FOUND PRODUCT: "${p.name}"`);
      console.log(`   Location: ${location}`);
      console.log(`   Raw Value: ${rawValue}`);
      console.log(
        `   Type: ${typeof rawValue} (Integer check: ${Number.isInteger(rawValue)})`,
      );

      if (typeof rawValue === "number" && Number.isInteger(rawValue)) {
        console.log("\n✅ STATUS: PASS");
      } else {
        console.log("\n❌ STATUS: FAIL (Format is wrong!)");
      }
      return;
    }
  }

  console.log("\n⚠️ No product found with price 1234567.");
  console.log("Please ensure you clicked SAVE in the product modal.");
}

verify();
