/**
 * SUPABASE DATA EXPORT SCRIPT
 * Purpose: Query order items structure from all product categories
 * Output: JSON file with real data structure for analysis
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Supabase credentials from mcp_config.json
const SUPABASE_URL = "https://batipgbnlfakwmbtdmdt.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdGlwZ2JubGZha3dtYnRkbWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1NjI0MiwiZXhwIjoyMDg0MzMyMjQyfQ.OCan8fcpJQMX2BuOCGjfKGQlk0BJdwFZzTpBqgftMaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function exportOrderStructures() {
  console.log("🔍 Querying Supabase for order item structures...\n");

  try {
    // Query recent orders with various product types
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, created_at, items")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ Query error:", error);
      return;
    }

    console.log(`✅ Found ${orders.length} orders\n`);

    // Analyze item structures by product type
    const structuresByProduct = {};
    const allProductNames = new Set();

    orders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;

      order.items.forEach((item) => {
        const productName = item.product_name || "Unknown";
        allProductNames.add(productName);

        if (!structuresByProduct[productName]) {
          structuresByProduct[productName] = {
            productName,
            sampleCount: 0,
            samples: [],
          };
        }

        // Only keep first 3 samples per product to avoid huge file
        if (structuresByProduct[productName].samples.length < 3) {
          structuresByProduct[productName].samples.push({
            orderId: order.id,
            orderNumber: order.order_number,
            item: item,
          });
          structuresByProduct[productName].sampleCount++;
        }
      });
    });

    // Generate report
    const report = {
      exportDate: new Date().toISOString(),
      totalOrders: orders.length,
      uniqueProducts: allProductNames.size,
      productList: Array.from(allProductNames).sort(),
      structuresByProduct: structuresByProduct,
    };

    // Save to file
    const filename = "supabase_order_structures.json";
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log("📊 EXPORT SUMMARY:");
    console.log(`   Total Orders: ${orders.length}`);
    console.log(`   Unique Products: ${allProductNames.size}`);
    console.log(`   Output File: ${filename}\n`);

    console.log("📦 PRODUCT LIST:");
    Array.from(allProductNames)
      .sort()
      .forEach((name, i) => {
        const count = structuresByProduct[name]?.sampleCount || 0;
        console.log(`   ${i + 1}. ${name} (${count} samples)`);
      });

    console.log(`\n✅ Export complete! Check ${filename}`);
  } catch (err) {
    console.error("❌ Script error:", err);
  }
}

// Run export
exportOrderStructures();
