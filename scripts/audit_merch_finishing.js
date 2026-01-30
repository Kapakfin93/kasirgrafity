import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

// Manually parse .env
let env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditMerchFinishing() {
  console.log("🔍 Starting Audit for MERCH_APPAREL Finishing Options...");

  // 1. Get Products
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id, name")
    .eq("category_id", "MERCH_APPAREL");

  if (prodError) {
    console.error("❌ Error fetching products:", prodError);
    return;
  }

  if (!products || products.length === 0) {
    console.warn("⚠️ No MERCH_APPAREL products found in Supabase.");
    return;
  }

  console.log(`📦 Found ${products.length} MERCH products.`);

  // 2. Get Finishing Options for these products
  const productIds = products.map((p) => p.id);

  const { data: finishings, error: finError } = await supabase
    .from("finishing_options")
    .select("product_id, group_title, label, price")
    .in("product_id", productIds)
    .order("product_id")
    .order("group_title");

  if (finError) {
    console.error("❌ Error fetching finishing options:", finError);
    return;
  }

  if (!finishings || finishings.length === 0) {
    console.warn("⚠️ No finishing options found for these products.");
  } else {
    console.log(`✅ Found ${finishings.length} finishing options.`);

    // Group by product for better display
    products.forEach((p) => {
      const pFinishings = finishings.filter((f) => f.product_id === p.id);
      console.log(`\n🔹 [${p.name}] (${p.id})`);
      if (pFinishings.length === 0) {
        console.log("   (No finishing options)");
      } else {
        pFinishings.forEach((f) => {
          console.log(`   - [${f.group_title}] ${f.label} : Rp ${f.price}`);
        });
      }
    });
  }
}

auditMerchFinishing();
