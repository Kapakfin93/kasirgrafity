/**
 * Application Constants
 * Single source of truth for all magic numbers and configuration
 */

// Machine Configuration for Multi-Computer Environment
// IMPORTANT: Each computer/terminal MUST have a unique MACHINE_ID
// Set this to 'A', 'B', 'C', 'D', or 'E' on each computer
// This prevents order number conflicts when multiple computers are offline
export const MACHINE_ID = "A"; // Change to 'B', 'C', etc. on other computers

// Calculation Constants
export const CALCULATION = {
  MIN_BILLABLE_AREA: 1, // m²
  DEFAULT_CUTTING_COST: 0, // Rp
  AREA_ROUNDING: "CEIL", // CEIL | FLOOR | ROUND
};

// Pricing Types
export const PRICING_TYPES = {
  AREA: "AREA", // Area-based (m²) - Banner, Sticker
  LINEAR: "LINEAR", // Linear-based (m) - Cloth Banner
  MATRIX: "MATRIX", // Size matrix - Poster, Fotocopy
  UNIT: "UNIT", // Per unit - Merchandise, Office
  UNIT_SHEET: "UNIT_SHEET", // Per sheet with cutting - A3+
  MANUAL: "MANUAL", // Manual input
};

// Business Rules
export const BUSINESS_RULES = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,
  MIN_DIMENSION: 0.1, // meters
  MAX_DIMENSION: 100, // meters
};

// Shift Configuration
export const SHIFT_CONFIG = {
  PAGI: {
    name: "Pagi",
    start: "07:00",
    end: "19:00",
    gracePeriod: 15, // minutes
  },
  MALAM: {
    name: "Malam",
    start: "19:00",
    end: "07:00",
    gracePeriod: 15, // minutes
  },
};

// User Roles
export const ROLES = {
  OWNER: {
    id: "OWNER",
    name: "Owner",
    permissions: ["all"],
  },
  CASHIER: {
    id: "CASHIER",
    name: "Kasir",
    permissions: ["transaction", "view_orders"],
  },
  PRODUCTION: {
    id: "PRODUCTION",
    name: "Produksi",
    permissions: ["view_orders", "update_status"],
  },
};

// Order Status
export const ORDER_STATUS = {
  PENDING: { id: "PENDING", label: "Menunggu", color: "#94a3b8" },
  IN_PROGRESS: { id: "IN_PROGRESS", label: "Dikerjakan", color: "#3b82f6" },
  READY: { id: "READY", label: "Siap", color: "#22c55e" },
  DELIVERED: { id: "DELIVERED", label: "Terkirim", color: "#64748b" },
  CANCELLED: { id: "CANCELLED", label: "Dibatalkan", color: "#ef4444" },
};

// Payment Status
export const PAYMENT_STATUS = {
  UNPAID: { id: "UNPAID", label: "Belum Bayar", color: "#ef4444" },
  PARTIAL: { id: "PARTIAL", label: "DP", color: "#f59e0b" },
  PAID: { id: "PAID", label: "Lunas", color: "#22c55e" },
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: { id: "PRESENT", label: "Hadir", color: "#22c55e" },
  LATE: { id: "LATE", label: "Terlambat", color: "#f59e0b" },
  ABSENT: { id: "ABSENT", label: "Tidak Hadir", color: "#ef4444" },
};

// Print Templates
export const PRINT_TEMPLATES = {
  NOTA_THERMAL: "thermal",
  NOTA_A4: "a4",
  DAILY_REPORT: "daily_report",
  ATTENDANCE_SHEET: "attendance",
  ORDER_TICKET: "order_ticket",
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_USER: "joglo_auth_user",
  CURRENT_SHIFT: "joglo_current_shift",
  LAST_TRANSACTION: "joglo_last_transaction",
};
