/**
 * OWNER DASHBOARD SEEDER V5 (DATA-DRIVEN FROM DB)
 *
 * Purpose: Generate 600 realistic dummy orders over 30 days
 * Method: Uses create_pos_order_atomic RPC + LIVE products from Supabase
 *
 * V5 CHANGES:
 * - Fetches VALID products directly from Supabase (base_price > 0)
 * - NO hardcoded product IDs
 * - NO matrix products (only UNIT/TIERED with base_price)
 * - Discount capped to 10% of subtotal
 * - Quantity range: 1-10
 *
 * Usage:
 *   import('/src/data/seeders/ownerDashboardSeeder.js').then(m => m.runOwnerDashboardSeeder())
 */

import { supabase } from "../../services/supabaseClient.js";
import { v4 as uuid } from "uuid";

// ============================================================================
// 1. CONFIGURATION
// ============================================================================

const CONFIG = {
  TOTAL_ORDERS: 600,
  DAYS_BACK: 30,

  // Payment Status Distribution
  PAID_RATIO: 0.6,
  PARTIAL_RATIO: 0.3,
  UNPAID_RATIO: 0.1,

  // DP Settings
  DP_MIN_PERCENT: 30,
  DP_MAX_PERCENT: 50,
  PELUNASAN_DELAY_MIN_DAYS: 1,
  PELUNASAN_DELAY_MAX_DAYS: 3,

  // Discount Settings (10% of item total max)
  DISCOUNT_CHANCE: 0.15,
  DISCOUNT_MAX_PERCENT: 0.1,

  // Quantity range
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 10,

  // Debug
  DEBUG_FIRST_N_ORDERS: 3,
};

// ============================================================================
// 2. LIVE PRODUCT CATALOG (FROM DATABASE)
// ============================================================================

let VALID_PRODUCTS = [];

/**
 * Fetch VALID products directly from Supabase
 * Criteria: is_active = true AND base_price > 0
 */
async function fetchValidProducts() {
  console.log("📦 Fetching VALID products from Supabase (base_price > 0)...\n");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category_id, calc_engine, base_price")
    .eq("is_active", true)
    .gt("base_price", 0)
    .order("base_price", { ascending: false });

  if (error) {
    console.error("❌ Failed to fetch products:", error.message);
    return false;
  }

  if (!products || products.length === 0) {
    console.error("❌ No valid products found (base_price > 0)!");
    return false;
  }

  VALID_PRODUCTS = products;

  // ============ REPORT VALID PRODUCTS ============
  console.log("=".repeat(60));
  console.log("📊 VALID PRODUCTS REPORT (from Supabase)");
  console.log("=".repeat(60));
  console.log(`\n✅ Total Valid Products: ${VALID_PRODUCTS.length}\n`);

  // Group by category
  const byCategory = {};
  for (const p of VALID_PRODUCTS) {
    if (!byCategory[p.category_id]) {
      byCategory[p.category_id] = [];
    }
    byCategory[p.category_id].push(p);
  }

  console.log("📁 Breakdown by Category:");
  for (const [catId, prods] of Object.entries(byCategory)) {
    const minPrice = Math.min(...prods.map((p) => p.base_price));
    const maxPrice = Math.max(...prods.map((p) => p.base_price));
    console.log(
      `   ${catId}: ${prods.length} products (Rp ${minPrice.toLocaleString()} - Rp ${maxPrice.toLocaleString()})`,
    );
  }

  // Group by calc_engine
  const byEngine = {};
  for (const p of VALID_PRODUCTS) {
    byEngine[p.calc_engine] = (byEngine[p.calc_engine] || 0) + 1;
  }

  console.log("\n⚙️ Breakdown by Calc Engine:");
  for (const [engine, count] of Object.entries(byEngine)) {
    console.log(`   ${engine}: ${count} products`);
  }

  // Show first 10 products
  console.log("\n📋 Sample Products (first 10):");
  for (let i = 0; i < Math.min(10, VALID_PRODUCTS.length); i++) {
    const p = VALID_PRODUCTS[i];
    console.log(
      `   ${i + 1}. ${p.id} - ${p.name} (Rp ${p.base_price.toLocaleString()})`,
    );
  }

  console.log("\n" + "=".repeat(60) + "\n");

  return true;
}

// ============================================================================
// 3. DUMMY DATA POOLS
// ============================================================================

const CUSTOMER_NAMES = [
  "Budi Santoso",
  "Siti Rahma",
  "Ahmad Wijaya",
  "Dewi Lestari",
  "Eko Prasetyo",
  "Fitri Handayani",
  "Gunawan Putra",
  "Heni Susanti",
  "Irfan Hakim",
  "Joko Widodo",
  "Kartini Sari",
  "Lukman Hakim",
  "Maya Indah",
  "Nurul Aini",
  "Oscar Pratama",
  "Putri Maharani",
  "Qori Rahman",
  "Rina Wati",
  "Surya Darma",
  "Tuti Wulandari",
];

const ADDRESSES = [
  "Jl. Diponegoro No. 12, Demak",
  "Jl. Sudirman No. 45, Demak",
  "Jl. Gatot Subroto No. 78, Demak",
  "Jl. Ahmad Yani No. 23, Demak",
];

const EMPLOYEES = ["Kasir 1", "Kasir 2", "Owner", "Admin"];

const PAYMENT_METHODS = ["TUNAI", "TRANSFER", "QRIS"];

// ============================================================================
// 4. HELPER FUNCTIONS
// ============================================================================

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (array) => array[randomInt(0, array.length - 1)];

const generatePhone = () =>
  `08${randomInt(11, 99)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;

const generateDateInRange = (daysBack) => {
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - daysBack);
  const randomTime =
    past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ============================================================================
// 5. ITEM GENERATOR (DATA-DRIVEN - NO MATRIX)
// ============================================================================

function generateOrderItems() {
  const numItems = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const product = randomChoice(VALID_PRODUCTS);
    const quantity = randomInt(CONFIG.QUANTITY_MIN, CONFIG.QUANTITY_MAX);

    // Simple item - NO material_id, NO size_id (base_price only)
    items.push({
      product_id: product.id,
      quantity: quantity,
      notes: Math.random() < 0.2 ? "Custom order" : "",
      // Store base_price for subtotal estimation
      _base_price: product.base_price,
    });
  }

  return items;
}

// Calculate estimated subtotal for discount capping
function estimateSubtotal(items) {
  let total = 0;
  for (const item of items) {
    total += (item._base_price || 0) * item.quantity;
  }
  return total;
}

// ============================================================================
// 6. ORDER INTENT GENERATOR
// ============================================================================

function generateOrderIntent(orderDate, paymentStatus) {
  const customer = {
    name: randomChoice(CUSTOMER_NAMES),
    phone: generatePhone(),
    address: randomChoice(ADDRESSES),
  };

  const items = generateOrderItems();
  const paymentMethod = randomChoice(PAYMENT_METHODS);

  // Payment amount logic
  let paymentAmount = 0;
  if (paymentStatus === "PAID") {
    paymentAmount = 999999999;
  } else if (paymentStatus === "PARTIAL") {
    paymentAmount = 1;
  }

  const targetDate = addDays(orderDate, randomInt(3, 7));

  // Calculate safe discount (max 10% of estimated subtotal)
  let discount = 0;
  if (Math.random() < CONFIG.DISCOUNT_CHANCE) {
    const estimatedTotal = estimateSubtotal(items);
    const maxDiscount = Math.floor(
      estimatedTotal * CONFIG.DISCOUNT_MAX_PERCENT,
    );
    discount = Math.min(
      maxDiscount,
      Math.floor(randomInt(5000, Math.max(5000, maxDiscount)) / 1000) * 1000,
    );
    if (discount < 5000) discount = 0;
  }

  // Clean items for RPC (remove _base_price)
  const cleanItems = items.map(({ _base_price, ...rest }) => rest);

  return {
    idempotency_key: `SEED-${uuid()}`,
    customer,
    items: cleanItems,
    payment_attempt: {
      method: paymentMethod,
      amount: paymentAmount,
    },
    meta: {
      discount_request: discount,
      production_priority: Math.random() < 0.1 ? "EXPRESS" : "STANDARD",
      received_by: randomChoice(EMPLOYEES),
      target_date: targetDate.toISOString(),
    },
    _internal: {
      order_date: orderDate,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
    },
  };
}

// ============================================================================
// 7. RPC CALLER WITH ERROR LOGGING
// ============================================================================

async function createOrderViaRPC(intent, orderIndex) {
  try {
    if (orderIndex <= CONFIG.DEBUG_FIRST_N_ORDERS) {
      console.log(
        `🔍 [DEBUG Order ${orderIndex}] Intent items:`,
        JSON.stringify(intent.items, null, 2),
      );
    }

    const { data, error } = await supabase.rpc("create_pos_order_atomic", {
      p_raw_intent: intent,
    });

    if (error) {
      console.error(
        `❌ [Order ${orderIndex}] RPC Network Error:`,
        error.message,
      );
      return { success: false, error: error.message, code: "NETWORK_ERROR" };
    }

    if (orderIndex <= CONFIG.DEBUG_FIRST_N_ORDERS) {
      console.log(
        `🔍 [DEBUG Order ${orderIndex}] RPC Response:`,
        JSON.stringify(data, null, 2),
      );
    }

    if (!data.success) {
      console.error(
        `❌ [Order ${orderIndex}] RPC Error: ${data.error} - ${data.message}`,
      );
      if (data.product_id) {
        console.error(`   └── Product ID: ${data.product_id}`);
      }
      return {
        success: false,
        error: data.error,
        message: data.message,
        product_id: data.product_id,
      };
    }

    return data;
  } catch (err) {
    console.error(`❌ [Order ${orderIndex}] Exception:`, err.message);
    return { success: false, error: "EXCEPTION", message: err.message };
  }
}

// ============================================================================
// 8. PELUNASAN HANDLER
// ============================================================================

async function createPelunasanPayment(
  orderId,
  remainingAmount,
  orderDate,
  paymentMethod,
) {
  const pelunasanDate = addDays(
    orderDate,
    randomInt(CONFIG.PELUNASAN_DELAY_MIN_DAYS, CONFIG.PELUNASAN_DELAY_MAX_DAYS),
  );

  const pelunasanMethod =
    Math.random() < 0.5 ? paymentMethod : randomChoice(PAYMENT_METHODS);

  const { error } = await supabase.from("order_payments").insert({
    order_id: orderId,
    amount: remainingAmount,
    payment_method: pelunasanMethod,
    received_by: randomChoice(EMPLOYEES),
    created_at: pelunasanDate.toISOString(),
  });

  if (error) {
    console.error("❌ Pelunasan insert error:", error.message);
    return false;
  }

  const { data: orderData } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("id", orderId)
    .single();

  if (!orderData) {
    console.error("❌ Failed to fetch order for pelunasan update");
    return false;
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      paid_amount: orderData.total_amount,
      remaining_amount: 0,
      payment_status: "PAID",
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("❌ Order update error:", updateError.message);
    return false;
  }

  return true;
}

// ============================================================================
// 9. PRODUCTION STATUS UPDATER
// ============================================================================

async function updateProductionStatus(orderId, orderDate) {
  const now = new Date();
  const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

  let status = "PENDING";
  if (daysSinceOrder >= 7) status = "DELIVERED";
  else if (daysSinceOrder >= 4) status = "READY";
  else if (daysSinceOrder >= 2) status = "IN_PROGRESS";

  await supabase
    .from("orders")
    .update({ production_status: status })
    .eq("id", orderId);
}

// ============================================================================
// 10. PARTIAL PAYMENT ADJUSTER
// ============================================================================

async function adjustPartialPayment(
  orderId,
  totalAmount,
  orderDate,
  paymentMethod,
) {
  const dpPercent =
    randomInt(CONFIG.DP_MIN_PERCENT, CONFIG.DP_MAX_PERCENT) / 100;
  const dpAmount = Math.floor(totalAmount * dpPercent);
  const remaining = totalAmount - dpAmount;

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      paid_amount: dpAmount,
      remaining_amount: remaining,
      payment_status: "PARTIAL",
    })
    .eq("id", orderId);

  if (orderError) {
    console.error("❌ PARTIAL update error:", orderError.message);
    return { success: false };
  }

  const { error: paymentError } = await supabase
    .from("order_payments")
    .update({ amount: dpAmount })
    .eq("order_id", orderId);

  if (paymentError) {
    console.error("❌ DP payment update error:", paymentError.message);
    return { success: false };
  }

  const pelunasanSuccess = await createPelunasanPayment(
    orderId,
    remaining,
    orderDate,
    paymentMethod,
  );

  return { success: pelunasanSuccess, dpAmount, remaining };
}

// ============================================================================
// 11. MAIN SEEDER FUNCTION
// ============================================================================

export async function runOwnerDashboardSeeder() {
  console.log(
    "\n🎯 OWNER DASHBOARD SEEDER V5 (DATA-DRIVEN FROM DB) - STARTING\n",
  );

  const startTime = performance.now();

  // Step 1: Fetch valid products from database
  const productsLoaded = await fetchValidProducts();
  if (!productsLoaded) {
    console.error("❌ SEEDER ABORTED: No valid products in database");
    return { success: false, error: "NO_VALID_PRODUCTS" };
  }

  console.log(
    `📊 Target: ${CONFIG.TOTAL_ORDERS} orders over ${CONFIG.DAYS_BACK} days`,
  );
  console.log(
    `💰 Distribution: ${CONFIG.PAID_RATIO * 100}% PAID, ${CONFIG.PARTIAL_RATIO * 100}% PARTIAL, ${CONFIG.UNPAID_RATIO * 100}% UNPAID`,
  );
  console.log(
    `🔢 Quantity range: ${CONFIG.QUANTITY_MIN}-${CONFIG.QUANTITY_MAX}`,
  );
  console.log(
    `💸 Discount: max ${CONFIG.DISCOUNT_MAX_PERCENT * 100}% of subtotal\n`,
  );

  const stats = {
    total: 0,
    paid: 0,
    partial: 0,
    unpaid: 0,
    errors: 0,
    errorDetails: {},
    total_revenue: 0,
    total_discount: 0,
    valid_products_count: VALID_PRODUCTS.length,
  };

  const paymentStatuses = [];
  const paidCount = Math.floor(CONFIG.TOTAL_ORDERS * CONFIG.PAID_RATIO);
  const partialCount = Math.floor(CONFIG.TOTAL_ORDERS * CONFIG.PARTIAL_RATIO);
  const unpaidCount = CONFIG.TOTAL_ORDERS - paidCount - partialCount;

  for (let i = 0; i < paidCount; i++) paymentStatuses.push("PAID");
  for (let i = 0; i < partialCount; i++) paymentStatuses.push("PARTIAL");
  for (let i = 0; i < unpaidCount; i++) paymentStatuses.push("UNPAID");
  paymentStatuses.sort(() => Math.random() - 0.5);

  console.log("📦 Generating orders...\n");

  for (let i = 0; i < CONFIG.TOTAL_ORDERS; i++) {
    const orderDate = generateDateInRange(CONFIG.DAYS_BACK);
    const paymentStatus = paymentStatuses[i];

    const intent = generateOrderIntent(orderDate, paymentStatus);
    const result = await createOrderViaRPC(intent, i + 1);

    if (!result.success) {
      stats.errors++;
      const errorKey = result.error || "UNKNOWN";
      stats.errorDetails[errorKey] = (stats.errorDetails[errorKey] || 0) + 1;
      continue;
    }

    stats.total++;
    stats.total_revenue += result.calculated_total || 0;
    stats.total_discount += result.discount || 0;

    if (paymentStatus === "PARTIAL") {
      const adjustResult = await adjustPartialPayment(
        result.order_id,
        result.calculated_total,
        orderDate,
        intent._internal.payment_method,
      );
      if (adjustResult.success) {
        stats.paid++;
      } else {
        stats.partial++;
      }
    } else if (paymentStatus === "PAID") {
      stats.paid++;
    } else {
      stats.unpaid++;
    }

    await updateProductionStatus(result.order_id, orderDate);

    if ((i + 1) % 50 === 0) {
      const progress = Math.round(((i + 1) / CONFIG.TOTAL_ORDERS) * 100);
      const errorRate = Math.round((stats.errors / (i + 1)) * 100);
      console.log(
        `📦 Progress: ${i + 1}/${CONFIG.TOTAL_ORDERS} (${progress}%) | Created: ${stats.total} | Errors: ${stats.errors} (${errorRate}%)`,
      );
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  const errorRate = Math.round((stats.errors / CONFIG.TOTAL_ORDERS) * 100);

  // ============ FINAL REPORT ============
  console.log("\n" + "=".repeat(60));
  console.log("✅ SEEDER COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📊 RESULTS:");
  console.log(`   Valid Products Used: ${stats.valid_products_count}`);
  console.log(`   Total Orders Created: ${stats.total}`);
  console.log(`   - PAID: ${stats.paid}`);
  console.log(`   - PARTIAL (still pending): ${stats.partial}`);
  console.log(`   - UNPAID: ${stats.unpaid}`);
  console.log(`   Total Revenue: Rp ${stats.total_revenue.toLocaleString()}`);
  console.log(`   Total Discount: Rp ${stats.total_discount.toLocaleString()}`);
  console.log(`   Duration: ${duration}s`);
  console.log(
    `   Rate: ${Math.round(stats.total / parseFloat(duration))} orders/sec`,
  );

  console.log("\n⚠️ ERROR SUMMARY:");
  console.log(`   Total Errors: ${stats.errors} (${errorRate}%)`);
  if (Object.keys(stats.errorDetails).length > 0) {
    console.log("   Breakdown:");
    for (const [code, count] of Object.entries(stats.errorDetails)) {
      console.log(`     - ${code}: ${count}`);
    }
  }

  console.log("\n🎯 VALIDATION:");
  const passOrders = stats.total >= 500 ? "✅ PASS" : "❌ FAIL";
  const passErrorRate = errorRate < 5 ? "✅ PASS" : "❌ FAIL";
  console.log(`   Orders Created >= 500: ${passOrders} (${stats.total})`);
  console.log(`   Error Rate < 5%: ${passErrorRate} (${errorRate}%)`);

  console.log("\n" + "=".repeat(60));

  return stats;
}

// ============================================================================
// 12. CLEANUP FUNCTION
// ============================================================================

export async function clearSeederData() {
  console.log("🗑️ Clearing seeder data...");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id")
    .like("idempotency_key", "SEED-%");

  if (error || !orders || orders.length === 0) {
    console.log("✅ No seeder data to clear");
    return 0;
  }

  const orderIds = orders.map((o) => o.id);

  await supabase.from("order_payments").delete().in("order_id", orderIds);
  await supabase.from("order_items").delete().in("order_id", orderIds);
  await supabase.from("orders").delete().in("id", orderIds);

  console.log(`✅ Deleted ${orders.length} seeder orders`);
  return orders.length;
}

// Global exposure
if (typeof window !== "undefined") {
  window.runOwnerDashboardSeeder = runOwnerDashboardSeeder;
  window.clearSeederData = clearSeederData;
  console.log("✅ window.runOwnerDashboardSeeder() ready");
  console.log("✅ window.clearSeederData() ready");
}

export default runOwnerDashboardSeeder;
