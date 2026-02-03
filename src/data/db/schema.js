/**
 * IndexedDB Schema using Dexie
 * Local-first database for offline capability
 */

import Dexie from "dexie";

// SSR-SAFE: Only create Dexie instance in browser
let db;
if (typeof window !== "undefined") {
  db = new Dexie("JogloPOSDatabase");

  // Define database schema
  // VERSION 6: Added status + idempotency_key indexes for STATE 3 sync
  db.version(6).stores({
    // === TRANSACTION DATA ===
    orders:
      "id, orderNumber, customerId, paymentStatus, productionStatus, createdAt, customerName, status, idempotency_key",
    employees: "id, name, role, status",
    attendance: "id, employeeId, date",
    customers: "id, name, phone",
    settings: "key, value",

    // === FINANCIAL DATA ===
    expenses: "id, date, category, createdAt",

    // === MASTER DATA ===
    categories: "id, name, logic_type, sort_order, is_active",
    products:
      "id, categoryId, name, price, is_active, input_mode, calc_engine, is_archived",
    finishings: "id, categoryId, name, price, is_active",
  });
}

export { db };

/**
 * SCHEMA DOCUMENTATION
 *
 * orders table:
 * - id: auto-increment primary key
 * - customerId: reference to customers table (optional)
 * - paymentStatus: UNPAID | DP | PAID
 * - productionStatus: PENDING | IN_PROGRESS | READY | DELIVERED
 * - createdAt: timestamp
 * - estimatedReady: estimated completion date
 * - totalAmount: total order value
 * - paidAmount: amount already paid
 * - remainingAmount: calculated field (totalAmount - paidAmount)
 * - notes: customer notes/instructions
 *
 * order_items table:
 * - id: auto-increment primary key
 * - orderId: foreign key to orders table
 * - productId: reference to product in MASTER_DATA
 * - productName: snapshot of product name (for audit)
 * - description: full item description (for nota display)
 * - pricingType: AREA | LINEAR | MATRIX | UNIT | UNIT_SHEET | MANUAL
 * - qty: quantity ordered
 * - specs_snapshot: JSONB field containing:
 *   {
 *     "description": "Banner 2.5m × 1.5m + Laminating",  // for nota & audit
 *     "dimensions": {
 *       "length": 2.5,
 *       "width": 1.5,
 *       "sizeKey": "A3",
 *       "printType": "DIGITAL",
 *       "material": "VINYL",
 *       "cuttingCost": 0
 *     },
 *     "finishings": [
 *       {"id": "f1", "name": "Laminating", "price": 5000}
 *     ]
 *   }
 * - unitPrice: calculated unit price
 * - totalPrice: final calculated price (qty × unitPrice + finishings)
 * - createdAt: timestamp
 */

// Helper functions for common queries

/**
 * Get orders by date range
 */
export const getOrdersByDateRange = async (startDate, endDate) => {
  return await db.orders
    .where("createdAt")
    .between(startDate, endDate, true, true)
    .toArray();
};

/**
 * Get today's orders
 */
export const getTodayOrders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await getOrdersByDateRange(today, tomorrow);
};

/**
 * Get active employees
 */
export const getActiveEmployees = async () => {
  return await db.employees.where("status").equals("ACTIVE").toArray();
};

/**
 * Get attendance by employee and date
 */
export const getAttendanceByEmployeeAndDate = async (employeeId, date) => {
  const dateStr = date.toISOString().split("T")[0];
  return await db.attendance
    .where(["employeeId", "date"])
    .equals([employeeId, dateStr])
    .first();
};

/**
 * Get orders by status
 */
export const getOrdersByStatus = async (status) => {
  return await db.orders.where("productionStatus").equals(status).toArray();
};

/**
 * Get orders by payment status
 */
export const getOrdersByPaymentStatus = async (paymentStatus) => {
  return await db.orders.where("paymentStatus").equals(paymentStatus).toArray();
};

/**
 * Get order items by order ID
 */
export const getOrderItemsByOrderId = async (orderId) => {
  return await db.order_items.where("orderId").equals(orderId).toArray();
};

/**
 * Initialize default settings
 */
export const initializeDefaultSettings = async () => {
  const existingSettings = await db.settings.count();

  if (existingSettings === 0) {
    await db.settings.bulkAdd([
      { key: "owner_pin", value: "1234" },
      { key: "store_name", value: "JOGLO PRINTING" },
      { key: "store_address", value: "Jl. Diponegoro, Rw. 4, Jogoloyo" },
      { key: "store_city", value: "Demak, Jawa Tengah" },
      { key: "store_phone", value: "0813-9028-6826" },
      { key: "auto_print", value: "false" },
      { key: "default_printer", value: "thermal" },
    ]);
  }
};

/**
 * Get setting value
 */
export const getSetting = async (key) => {
  const setting = await db.settings.get(key);
  return setting?.value;
};

/**
 * Update setting value
 */
export const updateSetting = async (key, value) => {
  await db.settings.put({ key, value });
};

// SSR-SAFE: Initialize database only in browser
if (typeof window !== "undefined") {
  initializeDefaultSettings().catch(console.error);
}

export default db;
