/**
 * STRESS TEST SEEDER - 5000 Dummy Transactions
 * Performance testing for dashboard and order pagination
 *
 * Rules:
 * - Random dates: Spread over last 12 months
 * - Status Mix: 70% LUNAS, 30% TEMPO (partial payment)
 * - Discount Mix: 20% of orders have random discounts (5k-50k)
 * - Items: Random products with random quantities
 *
 * Usage in browser console:
 *   import('/src/data/seeders/stressTestSeeder.js').then(m => m.runStressTestSeeder(5000))
 */

import db from "../db/schema";
import { v4 as uuid } from "uuid";

// Sample product data for generating items
const SAMPLE_PRODUCTS = [
  {
    id: "prod-spanduk-1",
    name: "CETAK SPANDUK (Outdoor)",
    basePrice: 18000,
    pricingType: "AREA",
  },
  {
    id: "prod-jersey-1",
    name: "Jersey Futsal Custom",
    basePrice: 85000,
    pricingType: "UNIT",
  },
  {
    id: "prod-booklet-1",
    name: "Print Dokumen A4",
    basePrice: 500,
    pricingType: "BOOKLET",
  },
  {
    id: "prod-poster-1",
    name: "CETAK POSTER A2",
    basePrice: 25000,
    pricingType: "MATRIX",
  },
  {
    id: "prod-stiker-1",
    name: "Cetak Stiker Vinyl",
    basePrice: 35000,
    pricingType: "LINEAR",
  },
  {
    id: "prod-banner-1",
    name: "Roll Up Banner",
    basePrice: 150000,
    pricingType: "UNIT",
  },
  {
    id: "prod-kartu-1",
    name: "Kartu Nama Premium",
    basePrice: 75000,
    pricingType: "UNIT",
  },
  {
    id: "prod-undangan-1",
    name: "Undangan Pernikahan",
    basePrice: 4500,
    pricingType: "UNIT",
  },
];

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
  "Udin Sedunia",
  "Vina Panduwinata",
  "Wahyu Hidayat",
  "Xena Warrior",
  "Yanto Sugiarto",
  "Zahra Nabila",
  "Anton Saputra",
  "Bella Safitri",
  "Candra Wijaya",
  "Doni Kusuma",
];

// Helper: Random integer between min and max (inclusive)
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: Random date within last N months
const randomDateInRange = (monthsBack) => {
  const now = new Date();
  const past = new Date();
  past.setMonth(past.getMonth() - monthsBack);
  const randomTime =
    past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime).toISOString();
};

// Helper: Generate order number
const generateOrderNumber = (index, date) => {
  const d = new Date(date);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `ST-${dateStr}-${String(index).padStart(5, "0")}`;
};

// Generate a single random order
const generateRandomOrder = (index) => {
  // Random product selection (1-4 items per order)
  const numItems = randomInt(1, 4);
  const items = [];
  let subtotal = 0;

  for (let i = 0; i < numItems; i++) {
    const product = SAMPLE_PRODUCTS[randomInt(0, SAMPLE_PRODUCTS.length - 1)];
    const qty = randomInt(1, 10);
    const unitPrice =
      product.basePrice *
      (product.pricingType === "AREA" ? randomInt(1, 5) : 1);
    const totalPrice = unitPrice * qty;

    items.push({
      id: uuid(),
      productId: product.id,
      name: product.name,
      productName: product.name,
      pricingType: product.pricingType,
      qty: qty,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      finishings: [],
      description: `${product.name} x${qty}`,
    });

    subtotal += totalPrice;
  }

  // Random discount (20% chance, 5k-50k)
  const hasDiscount = Math.random() < 0.2;
  const discount = hasDiscount ? randomInt(5000, 50000) : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  // Random payment status (70% LUNAS, 30% TEMPO)
  const isLunas = Math.random() < 0.7;
  const paymentStatus = isLunas
    ? "PAID"
    : Math.random() < 0.5
      ? "DP"
      : "UNPAID";

  // Calculate payment amounts
  let paidAmount = 0;
  let remainingAmount = grandTotal;

  if (paymentStatus === "PAID") {
    paidAmount = grandTotal;
    remainingAmount = 0;
  } else if (paymentStatus === "DP") {
    paidAmount = Math.floor(grandTotal * (randomInt(30, 70) / 100));
    remainingAmount = grandTotal - paidAmount;
  }

  // Random production status
  const productionStatuses = ["PENDING", "IN_PROGRESS", "READY", "DELIVERED"];
  const productionStatus = isLunas
    ? productionStatuses[randomInt(0, 3)]
    : productionStatuses[randomInt(0, 2)];

  // Random customer
  const customerName = CUSTOMER_NAMES[randomInt(0, CUSTOMER_NAMES.length - 1)];
  const phone = `08${randomInt(11, 99)}${randomInt(1000000, 9999999)}`;

  // Random date within last 12 months
  const createdAt = randomDateInRange(12);

  return {
    id: uuid(),
    orderNumber: generateOrderNumber(index, createdAt),
    items: items,
    customerSnapshot: {
      name: customerName,
      whatsapp: phone,
    },
    customerName: customerName,
    subtotal: subtotal,
    discount: discount,
    grandTotal: grandTotal,
    finalAmount: grandTotal,
    totalAmount: grandTotal,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    paymentStatus: paymentStatus,
    paymentMode: isLunas ? "TUNAI" : "TEMPO",
    productionStatus: productionStatus,
    createdAt: createdAt,
    updatedAt: createdAt,
    source: "STRESS_TEST",
    meta: {
      seeder: "stressTestSeeder",
      generatedAt: new Date().toISOString(),
    },
  };
};

// Main seeder function
export async function runStressTestSeeder(count = 5000) {
  console.log(`\n🚀 STRESS TEST SEEDER - Generating ${count} orders...\n`);
  const startTime = performance.now();

  // Step 1: Clear old stress test data
  console.log("🗑️ Clearing old stress test data...");
  try {
    const existingOrders = await db.orders
      .where("source")
      .equals("STRESS_TEST")
      .toArray();
    const idsToDelete = existingOrders.map((o) => o.id);
    if (idsToDelete.length > 0) {
      await db.orders.bulkDelete(idsToDelete);
      console.log(`✅ Deleted ${idsToDelete.length} old stress test orders`);
    } else {
      console.log("✅ No old stress test data to clear");
    }
  } catch (e) {
    console.log("⚠️ Could not clear old data (may not exist):", e.message);
  }

  // Step 2: Generate all orders
  console.log(`📦 Generating ${count} orders...`);
  const allOrders = [];
  for (let i = 0; i < count; i++) {
    allOrders.push(generateRandomOrder(i + 1));
  }
  console.log(`✅ Generated ${count} orders in memory`);

  // Step 3: Insert in batches for performance
  const BATCH_SIZE = 500;
  const batches = Math.ceil(count / BATCH_SIZE);
  let totalInserted = 0;

  console.log(`💾 Inserting to IndexedDB in ${batches} batches...`);
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const batchOrders = allOrders.slice(batchStart, batchEnd);

    try {
      await db.orders.bulkAdd(batchOrders);
      totalInserted += batchOrders.length;
      const progress = Math.round((totalInserted / count) * 100);
      console.log(
        `📦 Batch ${batch + 1}/${batches}: ${batchOrders.length} orders inserted (${progress}%)`,
      );
    } catch (error) {
      console.error(`❌ Batch ${batch + 1}/${batches} failed:`, error.message);
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Calculate stats
  const ordersWithDiscount = allOrders.filter((o) => o.discount > 0).length;
  const paidOrders = allOrders.filter((o) => o.paymentStatus === "PAID").length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalDiscount = allOrders.reduce((sum, o) => sum + o.discount, 0);

  console.log(`\n✅ STRESS TEST COMPLETE!`);
  console.log(`📊 Total Orders Inserted: ${totalInserted}`);
  console.log(`⏱️ Time: ${duration}s`);
  console.log(
    `📈 Rate: ${Math.round(totalInserted / parseFloat(duration))} orders/sec`,
  );
  console.log(`\n📊 STATS:`);
  console.log(
    `   - PAID (LUNAS): ${paidOrders} (${Math.round((paidOrders / count) * 100)}%)`,
  );
  console.log(
    `   - TEMPO/DP/UNPAID: ${count - paidOrders} (${Math.round(((count - paidOrders) / count) * 100)}%)`,
  );
  console.log(
    `   - Orders with Discount: ${ordersWithDiscount} (${Math.round((ordersWithDiscount / count) * 100)}%)`,
  );
  console.log(`   - Total Revenue: Rp ${totalRevenue.toLocaleString()}`);
  console.log(`   - Total Discount: Rp ${totalDiscount.toLocaleString()}`);
  console.log(`\n🔄 Refresh the page to see the data!\n`);

  // Return stats
  return {
    totalOrders: totalInserted,
    durationSeconds: parseFloat(duration),
    ordersPerSecond: Math.round(totalInserted / parseFloat(duration)),
    paidOrders,
    ordersWithDiscount,
    totalRevenue,
    totalDiscount,
  };
}

// Quick summary stats
export async function getStressTestStats() {
  try {
    const data = await db.orders
      .where("source")
      .equals("STRESS_TEST")
      .toArray();

    return {
      totalOrders: data.length,
      paidOrders: data.filter((o) => o.paymentStatus === "PAID").length,
      unpaidOrders: data.filter((o) => o.paymentStatus !== "PAID").length,
      ordersWithDiscount: data.filter((o) => (o.discount || 0) > 0).length,
      totalRevenue: data.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      totalDiscount: data.reduce((sum, o) => sum + (o.discount || 0), 0),
    };
  } catch (e) {
    console.error("Error getting stats:", e);
    return null;
  }
}

// Clear all stress test data
export async function clearStressTestData() {
  console.log("🗑️ Clearing all stress test data...");
  const startTime = performance.now();

  try {
    const existingOrders = await db.orders
      .where("source")
      .equals("STRESS_TEST")
      .toArray();
    const idsToDelete = existingOrders.map((o) => o.id);

    if (idsToDelete.length > 0) {
      await db.orders.bulkDelete(idsToDelete);
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Deleted ${idsToDelete.length} orders in ${duration}s`);
      return idsToDelete.length;
    } else {
      console.log("✅ No stress test data to clear");
      return 0;
    }
  } catch (e) {
    console.error("❌ Failed to clear data:", e);
    return 0;
  }
}

export default runStressTestSeeder;
