// Simulation Script: Trace Linkage for Router Logic
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

async function simulateRouter() {
  console.log("🔬 TRACING LINKAGE: PRODUCTS -> MATERIALS...");

  try {
    // 1. FETCH SPANDUK
    const products = await queryTable(
      "products",
      "name=ilike.*Spanduk*&limit=1",
    );

    if (!products || products.length === 0) {
      // Fallback for simulation
      console.log(
        "⚠️ No 'Spanduk' found. Fetching ANY Outdoor/Matrix product.",
      );
      const anyProd = await queryTable(
        "products",
        "calc_engine=eq.MATRIX&limit=1",
      );
      if (anyProd && anyProd.length > 0) products.push(anyProd[0]);
      else {
        console.log("❌ No suitable product found for simulation.");
        return;
      }
    }

    const product = products[0];
    console.log(`\n🎯 TARGET: [${product.id}] ${product.name}`);
    console.log(`📂 CATEGORY: ${product.category_id}`);

    // 2. INSPECT JSON FOR LINKS
    // We look for 'variants', 'advanced_features', or any field containing material IDs
    console.log("\n🕵️ INSPECTING JSON PAYLOAD (The 'Link'):");

    // Check variants
    if (product.variants) {
      console.log("✅ 'variants' JSON found.");
      // We want to see if we can find any material_id string inside
      const jsonString = JSON.stringify(product.variants);
      const materialIdRegex = /MAT_[A-Z0-9_]+/g;
      const matches = jsonString.match(materialIdRegex);

      if (matches && matches.length > 0) {
        console.log(
          `🔗 FOUND POTENTIAL LINKS (Material IDs): ${matches.join(", ")}`,
        );
      } else {
        console.log("⚠️ No obvious 'MAT_...' IDs found in 'variants' JSON.");
        console.log("Sample Snippet:", jsonString.slice(0, 300));
      }
    } else {
      console.log("⚠️ 'variants' column is NULL.");
    }

    // 3. CHECK AUX TABLE FOR MATCHING IDs
    console.log("\n🧱 VERIFYING TARGET TABLE (product_materials):");
    const materials = await queryTable(
      "product_materials",
      `product_id=eq.${product.id}`,
    );

    if (materials.length > 0) {
      console.log(`✅ Found ${materials.length} linked materials in DB.`);
      const matIds = materials.map((m) => m.id);
      console.log(`IDs in DB: ${matIds.join(", ")}`);

      // CROSS REFERENCE
      // Does the product JSON contain these IDs?
      // Only if we found matches in JSON above can we answer definitively.
    } else {
      console.log("⚠️ No materials found in product_materials table.");
    }
  } catch (err) {
    console.error("❌ SIMULATION ERROR:", err);
  }
}

simulateRouter();
