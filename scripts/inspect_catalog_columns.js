import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      envConfig[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl =
  envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCatalog() {
  console.log("🔍 Inspecting web_product_catalog columns...");

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", "PROD_SPANDUK_V2")
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Create keys:", Object.keys(data));
  console.log("Full Data:", JSON.stringify(data, null, 2));
}

inspectCatalog();
