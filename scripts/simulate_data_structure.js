// Simulation Script: Fetch SPANDUK Data Structure
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

async function simulate() {
  console.log("🔬 STARTING DATA AUTOPSY: SPANDUK / BANNER...");

  try {
    // 1. QUERY PRODUCT (Spanduk)
    // Try searching for 'Spanduk'
    const products = await queryTable(
      "products",
      "name=ilike.*Spanduk*&limit=1",
    );

    if (!products || products.length === 0) {
      console.log("⚠️ No product found matching 'Spanduk'. Trying 'Banner'...");
      const banners = await queryTable(
        "products",
        "name=ilike.*Banner*&limit=1",
      );
      if (!banners || banners.length === 0) {
        console.log("❌ CRITICAL: No Spanduk or Banner found.");
        return;
      }
      products.push(banners[0]);
    }

    const product = products[0];
    console.log("\n📦 PRODUCT JSON (Main Table):");
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Input Mode: ${product.input_mode}`);
    console.log(`Calc Engine: ${product.calc_engine}`);

    // Show Variants JSON if it exists in the main table
    if (product.variants) {
      console.log(
        "JSON 'variants' field size:",
        JSON.stringify(product.variants).length,
        "chars",
      );
      console.log(
        "Sample JSON Variant:",
        JSON.stringify(product.variants).slice(0, 200) + "...",
      );
    } else {
      console.log("JSON 'variants' field: NULL or EMPTY");
    }

    // 2. QUERY LINKED MATERIALS
    console.log("\n🧱 LINKED MATERIALS (Auxiliary Table):");
    try {
      const materials = await queryTable(
        "product_materials",
        `product_id=eq.${product.id}`,
      );
      console.log(
        `Found ${materials.length} material records linked to ${product.id}.`,
      );
      materials.forEach((m) => {
        console.log(
          ` - [${m.id}] ${m.name} | Price: ${m.price_per_unit || m.price} | Width: ${m.width}cm`,
        );
      });
    } catch (e) {
      console.log("⚠️ product_materials query failed:", e.message);
    }

    // 3. QUERY LINKED VARIANTS
    console.log("\n🧬 LINKED VARIANTS (Auxiliary Table):");
    try {
      const variants = await queryTable(
        "product_variants",
        `product_id=eq.${product.id}`,
      );
      console.log(
        `Found ${variants.length} variant records linked to ${product.id}.`,
      );
      variants.forEach((m) => {
        console.log(` - [${m.id}] ${m.name} | Price: ${m.price}`);
      });
    } catch (e) {
      console.log("⚠️ product_variants query failed:", e.message);
    }
  } catch (err) {
    console.error("❌ FATAL SIMULATION ERROR:", err);
  }
}

simulate();
