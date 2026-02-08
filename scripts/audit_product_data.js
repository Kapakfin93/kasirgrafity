import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditProduct() {
  console.log("🔍 STARTING PRODUCT DATA AUDIT...");

  // 1. QUERY PRODUCT (Flexi)
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("*")
    .ilike("name", "%Flexi%")
    .limit(1);

  if (prodError) {
    console.error("❌ Error fetching product:", prodError);
    return;
  }

  if (!products || products.length === 0) {
    console.log("⚠️ No product found matching 'Flexi'");
    return;
  }

  const product = products[0];
  console.log("\n📦 PRODUCT FOUND:");
  console.log(`ID: ${product.id}`);
  console.log(`Name: ${product.name}`);
  console.log(`Price (Base): ${product.base_price || product.price}`);
  console.log(`Calc Engine: ${product.calc_engine}`);
  console.log(`Pricing Model: ${product.pricing_model}`);

  // 2. QUERY MATERIALS
  console.log("\n🧱 CHECKING PRODUCT_MATERIALS...");
  const { data: materials, error: matError } = await supabase
    .from("product_materials")
    .select("*")
    .eq("product_id", product.id);

  if (matError) {
    console.error(
      "⚠️ Error fetching materials (Table might not exist?):",
      matError.message,
    );
  } else {
    console.log(`Found ${materials.length} material records.`);
    materials.forEach((m) => {
      console.log(
        ` - [${m.id}] ${m.name} | Price: ${m.price_per_unit || m.price}`,
      );
    });
  }

  // 3. QUERY VARIANTS (If exists)
  console.log("\n🧬 CHECKING PRODUCT_VARIANTS...");
  const { data: variants, error: varError } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", product.id);

  if (varError) {
    console.error(
      "⚠️ Error fetching variants (Table might not exist?):",
      varError.message,
    );
  } else {
    console.log(`Found ${variants.length} variant records.`);
    variants.forEach((v) => {
      console.log(` - [${v.id}] ${v.name} | Price: ${v.price}`);
    });
  }

  // 4. QUERY PRICE MATRIX (If exists)
  console.log("\n🔢 CHECKING PRODUCT_PRICE_MATRIX...");
  const { data: matrix, error: matrixError } = await supabase
    .from("product_price_matrix")
    .select("*")
    .eq("product_id", product.id);

  if (matrixError) {
    console.error("⚠️ Error fetching matrix:", matrixError.message);
  } else {
    console.log(`Found ${matrix.length} matrix records.`);
    if (matrix.length > 0) {
      console.log("Sample Matrix Item:", JSON.stringify(matrix[0], null, 2));
    }
  }

  console.log("\n✅ AUDIT COMPLETE.");
}

auditProduct();
