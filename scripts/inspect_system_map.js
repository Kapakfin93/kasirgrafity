import { createClient } from "@supabase/supabase-js";

const url = "https://batipgbnlfakwmbtdmdt.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTYyNDIsImV4cCI6MjA4NDMzMjI0Mn0.w0u-P8okW1k46vvGjF41R5ID35yMamU0k04E9ajoYj0";

const supabase = createClient(url, key);

async function inspectSchema() {
  console.log("=== INSPECTING CATEGORIES ===");
  const { data: categories, error: catError } = await supabase
    .from("product_categories")
    .select("*");

  if (catError) console.error(catError);
  else console.table(categories);

  console.log("\n=== INSPECTING PRODUCTS (SAMPLE) ===");
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("*")
    .limit(10);

  if (prodError) console.error(prodError);
  else {
    // Show distinct calc_engine values
    console.log("Distinct engines found:", [
      ...new Set(products.map((p) => p.calc_engine)),
    ]);
    console.table(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category_id,
        engine: p.calc_engine,
        base_price: p.base_price,
        has_variants: !!p.variants,
      })),
    );
  }

  console.log("\n=== INSPECTING PRICE MATRIX (SAMPLE) ===");
  const { data: matrix, error: matError } = await supabase
    .from("product_price_matrix")
    .select("*")
    .limit(5);

  if (matError) console.error(matError);
  else console.table(matrix);

  console.log("\n=== INSPECTING PRICE TIERS (SAMPLE) ===");
  const { data: tiers, error: tierError } = await supabase
    .from("product_price_tiers")
    .select("*")
    .limit(5);

  if (tierError) console.error(tierError);
  else console.table(tiers);
}

inspectSchema();
