import { createClient } from "@supabase/supabase-js";

const url = "https://batipgbnlfakwmbtdmdt.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTYyNDIsImV4cCI6MjA4NDMzMjI0Mn0.w0u-P8okW1k46vvGjF41R5ID35yMamU0k04E9ajoYj0";

const supabase = createClient(url, key);

async function auditCategories() {
  const targetCats = ["DIGITAL_A3_PRO", "MERCH_APPAREL", "CUSTOM_SERVICES"];

  console.log("=== FORENSIC AUDIT: REMAINING 3 CATEGORIES ===\n");

  for (const catId of targetCats) {
    console.log(`\n======================================`);
    console.log(`KATEGORI: ${catId}`);
    console.log(`======================================`);

    // 1. Get category info
    const { data: cat } = await supabase
      .from("product_categories")
      .select("*")
      .eq("id", catId)
      .single();

    if (cat) {
      console.log(`logic_type: ${cat.logic_type || "DATA TIDAK CUKUP"}`);
      console.log(`name: ${cat.name || catId}`);
    } else {
      console.log("logic_type: DATA TIDAK CUKUP (Category not found in DB)");
    }

    // 2. Get products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, calc_engine, input_mode, base_price, variants")
      .eq("category_id", catId)
      .eq("is_active", true);

    if (products && products.length > 0) {
      console.log(`\nPRODUK (${products.length}):`);
      products.forEach((p) => {
        console.log(
          `  - ${p.name} (calc_engine: ${p.calc_engine || "N/A"}, input_mode: ${p.input_mode || "UNIT"}, base_price: ${p.base_price})`,
        );
        if (p.variants) {
          console.log(
            `    variants: ${JSON.stringify(p.variants).substring(0, 100)}...`,
          );
        }
      });
    } else {
      console.log("PRODUK: DATA TIDAK CUKUP (No products found)");
    }

    // 3. Check price matrix
    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id);
      const { data: matrix } = await supabase
        .from("product_price_matrix")
        .select("*")
        .in("product_id", productIds)
        .limit(3);

      if (matrix && matrix.length > 0) {
        console.log(`\nPRICE_MATRIX (sample):`);
        console.log(JSON.stringify(matrix, null, 2));
      }

      // 4. Check tiers
      const { data: tiers } = await supabase
        .from("product_price_tiers")
        .select("*")
        .in("product_id", productIds)
        .limit(3);

      if (tiers && tiers.length > 0) {
        console.log(`\nPRICE_TIERS (sample):`);
        console.log(JSON.stringify(tiers, null, 2));
      }
    }
  }
}

auditCategories();
