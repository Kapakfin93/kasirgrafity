/**
 * Owner Action Resolver - Test Scenarios
 * Test script for action resolver functionality
 */

import {
  resolveOwnerAction,
  resolveActionsFromSnapshot,
  getActionSummary,
  formatActionForWhatsApp,
  ACTION_TYPES,
} from "./ownerActionResolver";

console.log("🧪 Testing Owner Action Resolver...\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

/**
 * TEST 1: HIGH Priority - Follow up overdue
 */
console.log("TEST 1: HIGH Priority - Follow Up Overdue");
const highPriorityRec = {
  action: "FOLLOW_UP_OVERDUE",
  message: "Hubungi 2 customer dengan piutang lewat tempo",
  priority: "HIGH",
};

const highPriorityContext = {
  orders: [
    {
      customerName: "PT ABC",
      customerPhone: "08123456789",
      orderNumber: "TEST-001",
      remainingAmount: 5000000,
      ageInDays: 45,
      agingBucket: "OVERDUE_30",
    },
  ],
};

const action1 = resolveOwnerAction(highPriorityRec, highPriorityContext);
console.log(`Action Type: ${action1.actionType}`);
console.log(`Expected: ${ACTION_TYPES.CONTACT_CUSTOMER}`);
console.log(`Risk Level: ${action1.riskLevel}`);
console.log(`Targets: ${action1.targets.length}`);
console.log(`Has Message Template: ${!!action1.messageTemplate}`);
console.log(`Has WhatsApp Channel: ${action1.channels.includes("WHATSAPP")}`);

const isValid =
  action1.actionType === ACTION_TYPES.CONTACT_CUSTOMER &&
  action1.riskLevel === "HIGH" &&
  action1.targets.length === 1 &&
  action1.channels.includes("WHATSAPP");

console.log(isValid ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 2: MEDIUM Priority - Reminder
 */
console.log("TEST 2: MEDIUM Priority - Reminder");
const mediumPriorityRec = {
  action: "REMINDER",
  message: "Kirim reminder pembayaran ke customer",
  priority: "MEDIUM",
};

const mediumPriorityContext = {
  orders: [
    {
      customerName: "Toko XYZ",
      customerPhone: "08198765432",
      orderNumber: "TEST-002",
      remainingAmount: 1500000,
      ageInDays: 15,
      agingBucket: "DUE_8_30",
    },
  ],
};

const action2 = resolveOwnerAction(mediumPriorityRec, mediumPriorityContext);
console.log(`Action Type: ${action2.actionType}`);
console.log(`Label: ${action2.label}`);
console.log(`Risk Level: ${action2.riskLevel}`);
console.log(`Targets: ${action2.targets.length}`);

const isValid2 =
  action2.actionType === ACTION_TYPES.CONTACT_CUSTOMER &&
  action2.riskLevel === "MEDIUM" &&
  action2.targets.length === 1;

console.log(isValid2 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 3: LOW Priority - Monitor only
 */
console.log("TEST 3: LOW Priority - Monitor Only");
const lowPriorityRec = {
  action: "MONITOR",
  message: "Pantau saja",
  priority: "LOW",
};

const action3 = resolveOwnerAction(lowPriorityRec, {});
console.log(`Action Type: ${action3.actionType}`);
console.log(`Expected: ${ACTION_TYPES.MONITOR_ONLY}`);
console.log(`Channels: ${action3.channels.length}`);
console.log(`Targets: ${action3.targets.length}`);

const isValid3 =
  action3.actionType === ACTION_TYPES.MONITOR_ONLY &&
  action3.channels.length === 0;

console.log(isValid3 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 4: Payment verification action
 */
console.log("TEST 4: Payment Verification");
const paymentRec = {
  action: "VERIFY_PAYMENTS",
  message: "Periksa dan perbaiki data pembayaran",
  priority: "MEDIUM",
};

const paymentContext = {
  orders: [
    {
      customerName: "Customer A",
      customerPhone: "08111111111",
      orderNumber: "TEST-003",
      remainingAmount: 2000000,
      isFinancialRisk: true,
      validationStatus: "MISMATCH_PAID",
    },
  ],
};

const action4 = resolveOwnerAction(paymentRec, paymentContext);
console.log(`Action Type: ${action4.actionType}`);
console.log(`Expected: ${ACTION_TYPES.REVIEW_PAYMENT}`);
console.log(`Targets: ${action4.targets.length}`);
console.log(`Target has issue: ${!!action4.targets[0]?.issue}`);

const isValid4 =
  action4.actionType === ACTION_TYPES.REVIEW_PAYMENT &&
  action4.targets.length === 1;

console.log(isValid4 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 5: Message template population
 */
console.log("TEST 5: Message Template Population");
const templateContext = {
  orders: [
    {
      customerName: "Test Customer",
      customerPhone: "08999999999",
      orderNumber: "TEST-004",
      remainingAmount: 1000000,
      ageInDays: 35,
      agingBucket: "OVERDUE_30",
    },
  ],
};

const action5 = resolveOwnerAction(highPriorityRec, templateContext);
const target = action5.targets[0];

console.log(`Has populated message: ${!!target.message}`);
console.log(
  `Message contains customer name: ${target.message.includes("Test Customer")}`,
);
console.log(
  `Message contains order number: ${target.message.includes("TEST-004")}`,
);
console.log(`Message contains amount: ${target.message.includes("1.000.000")}`);

const hasValidTemplate =
  target.message &&
  target.message.includes("Test Customer") &&
  target.message.includes("TEST-004");

console.log(hasValidTemplate ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 6: WhatsApp formatting
 */
console.log("TEST 6: WhatsApp Formatting");
const waAction = resolveOwnerAction(highPriorityRec, templateContext);
const waFormat = formatActionForWhatsApp(waAction, 0);

console.log(`Has phone: ${!!waFormat.phone}`);
console.log(`Has message: ${!!waFormat.message}`);
console.log(`Has customer name: ${!!waFormat.customerName}`);
console.log(`Has order number: ${!!waFormat.orderNumber}`);
console.log(`Has URL: ${!!waFormat.url}`);

const isValidWA =
  waFormat.phone && waFormat.message && waFormat.customerName && waFormat.url;

console.log(isValidWA ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 7: Action summary calculation
 */
console.log("TEST 7: Action Summary Calculation");
const testActions = [
  {
    actionType: ACTION_TYPES.CONTACT_CUSTOMER,
    riskLevel: "HIGH",
    targets: [1, 2, 3],
    channels: ["WHATSAPP"],
  },
  {
    actionType: ACTION_TYPES.CONTACT_CUSTOMER,
    riskLevel: "MEDIUM",
    targets: [1, 2],
    channels: ["WHATSAPP"],
  },
  {
    actionType: ACTION_TYPES.REVIEW_PAYMENT,
    riskLevel: "MEDIUM",
    targets: [1],
    channels: [],
  },
  {
    actionType: ACTION_TYPES.MONITOR_ONLY,
    riskLevel: "LOW",
    targets: [],
    channels: [],
  },
];

const summary = getActionSummary(testActions);
console.log(`Total Actions: ${summary.totalActions} (expected: 4)`);
console.log(`Total Targets: ${summary.totalTargets} (expected: 6)`);
console.log(`Requires Contact: ${summary.requiresContact} (expected: 2)`);
console.log(`HIGH Priority: ${summary.byPriority.HIGH} (expected: 1)`);
console.log(`MEDIUM Priority: ${summary.byPriority.MEDIUM} (expected: 2)`);

const isValidSummary =
  summary.totalActions === 4 &&
  summary.totalTargets === 6 &&
  summary.requiresContact === 2 &&
  summary.byPriority.HIGH === 1;

console.log(isValidSummary ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 8: Multiple targets handling
 */
console.log("TEST 8: Multiple Targets Handling");
const multiTargetContext = {
  orders: [
    {
      customerName: "C1",
      customerPhone: "081",
      orderNumber: "O1",
      remainingAmount: 1000000,
      ageInDays: 40,
      agingBucket: "OVERDUE_30",
    },
    {
      customerName: "C2",
      customerPhone: "082",
      orderNumber: "O2",
      remainingAmount: 2000000,
      ageInDays: 35,
      agingBucket: "OVERDUE_30",
    },
    {
      customerName: "C3",
      customerPhone: "083",
      orderNumber: "O3",
      remainingAmount: 3000000,
      ageInDays: 50,
      agingBucket: "OVERDUE_30",
    },
  ],
};

const action8 = resolveOwnerAction(highPriorityRec, multiTargetContext);
console.log(`Targets: ${action8.targets.length} (expected: 3)`);
console.log(`All have messages: ${action8.targets.every((t) => !!t.message)}`);
console.log(`All have phone: ${action8.targets.every((t) => !!t.phone)}`);

const isValid8 =
  action8.targets.length === 3 &&
  action8.targets.every((t) => t.message && t.phone);

console.log(isValid8 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 9: Empty context handling
 */
console.log("TEST 9: Empty Context Handling");
const action9 = resolveOwnerAction(highPriorityRec, {});
console.log(`Action Type: ${action9.actionType}`);
console.log(`Targets: ${action9.targets.length}`);
console.log(`Handles gracefully: ${action9.targets.length === 0}`);

const isValid9 = action9.targets.length === 0;
console.log(isValid9 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 10: Read-only verification
 */
console.log("TEST 10: Read-Only Verification");
const originalContext = {
  orders: [
    {
      customerName: "Original",
      orderNumber: "ORIG-001",
      remainingAmount: 1000000,
    },
  ],
};

const contextCopy = JSON.parse(JSON.stringify(originalContext));
resolveOwnerAction(highPriorityRec, originalContext);

const isUnmodified =
  JSON.stringify(originalContext) === JSON.stringify(contextCopy);
console.log(`Context unchanged: ${isUnmodified}`);
console.log(`Is read-only: ${isUnmodified}`);

console.log(isUnmodified ? "✅ PASS" : "❌ FAIL");
console.log("");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎉 All Tests Complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Export test data
export const testData = {
  highPriority: action1,
  mediumPriority: action2,
  lowPriority: action3,
  paymentVerification: action4,
  templatePopulation: action5,
  whatsappFormat: waFormat,
  actionSummary: summary,
  multipleTargets: action8,
};
