// Standalone Audit Script using Fetch
const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTYyNDIsImV4cCI6MjA4NDMzMjI0Mn0.w0u-P8okW1k46vvGjF41R5ID35yMamU0k04E9ajoYj0";

async function queryTable(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch ${table}: ${text}`);
  }
  return response.json();
}

async function audit() {
  console.log("🔍 STARTING PRODUCT DATA AUDIT (RAW FETCH)...");

  try {
    // 1. QUERY ANY PRODUCT (Limit 1)
    const products = await queryTable("products", "limit=1");

    if (!products || products.length === 0) {
      console.log("⚠️ No product found.");
      return;
    }

    const product = products[0];
    console.log("\n📦 PRODUCT FOUND (Main Table):");
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Base Price: ${product.base_price} | Price: ${product.price}`);
    console.log(`Calc Engine: ${product.calc_engine}`);
    console.log(`Pricing Model: ${product.pricing_model}`);
    console.log(`Updated At: ${product.updated_at}`);

    // 2. QUERY MATERIALS
    console.log("\n🧱 CHECKING PRODUCT_MATERIALS...");
    try {
      const materials = await queryTable(
        "product_materials",
        `product_id=eq.${product.id}`,
      );
      console.log(`Found ${materials.length} material records.`);
      materials.forEach((m) => {
        console.log(
          ` - [${m.id}] ${m.name} | Price: ${m.price_per_unit || m.price}`,
        );
      });
    } catch (e) {
      console.log("⚠️ product_materials table query failed:", e.message);
    }

    // 3. QUERY VARIANTS
    console.log("\n🧬 CHECKING PRODUCT_VARIANTS...");
    try {
      const variants = await queryTable(
        "product_variants",
        `product_id=eq.${product.id}`,
      );
      console.log(`Found ${variants.length} variant records.`);
      variants.forEach((v) => {
        console.log(` - [${v.id}] ${v.name} | Price: ${v.price}`);
      });
    } catch (e) {
      console.log(
        "⚠️ product_variants table query failed (likely doesn't exist):",
        e.message,
      );
    }

    // 4. QUERY PRICE MATRIX
    console.log("\n🔢 CHECKING PRODUCT_PRICE_MATRIX...");
    try {
      const matrix = await queryTable(
        "product_price_matrix",
        `product_id=eq.${product.id}`,
      );
      console.log(`Found ${matrix.length} matrix records.`);
      if (matrix.length > 0) {
        console.log("Sample Matrix Item:", JSON.stringify(matrix[0]));
      }
    } catch (e) {
      console.log("⚠️ product_price_matrix table query failed:", e.message);
    }
  } catch (err) {
    console.error("❌ FATAL AUDIT ERROR:", err);
  }
}

audit();
