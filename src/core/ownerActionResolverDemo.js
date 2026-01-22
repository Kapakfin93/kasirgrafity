/**
 * Owner Action Resolver - Demo Usage Examples
 * Demonstrates how to use the action resolver layer
 *
 * @module ownerActionResolverDemo
 */

import {
  resolveOwnerAction,
  resolveActionsFromSnapshot,
  resolveActionsFromRiskyOrders,
  getActionSummary,
  formatActionForWhatsApp,
  ACTION_TYPES,
} from "./ownerActionResolver";

import {
  getOwnerDailySnapshot,
  getTopRiskyOrders,
} from "./ownerDecisionEngine";

/**
 * EXAMPLE 1: Resolve single recommendation
 */
export const exampleResolveSingleRecommendation = () => {
  const recommendation = {
    action: "FOLLOW_UP_OVERDUE",
    message: "Hubungi 2 customer dengan piutang lewat tempo",
    priority: "HIGH",
  };

  const context = {
    orders: [
      {
        customerName: "PT ABC",
        customerPhone: "08123456789",
        orderNumber: "JGL-A-20260110-0001",
        remainingAmount: 3500000,
        ageInDays: 38,
        agingBucket: "OVERDUE_30",
      },
      {
        customerName: "Toko XYZ",
        customerPhone: "08198765432",
        orderNumber: "JGL-A-20260105-0002",
        remainingAmount: 1500000,
        ageInDays: 45,
        agingBucket: "OVERDUE_30",
      },
    ],
  };

  const action = resolveOwnerAction(recommendation, context);

  console.log("📋 RESOLVED ACTION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Type: ${action.actionType}`);
  console.log(`Label: ${action.label}`);
  console.log(`Risk Level: ${action.riskLevel}`);
  console.log(`Channels: ${action.channels.join(", ")}`);
  console.log(`Targets: ${action.targets.length}`);
  console.log("");

  action.targets.forEach((target, i) => {
    console.log(`${i + 1}. ${target.customerName} (${target.orderNumber})`);
    console.log(`   Phone: ${target.phone}`);
    console.log(`   Amount: Rp ${target.remainingAmount.toLocaleString()}`);
    console.log(`   Message: ${target.message}`);
    console.log("");
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
  Output:
  📋 RESOLVED ACTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Type: CONTACT_CUSTOMER
  Label: Hubungi Customer
  Risk Level: HIGH
  Channels: WHATSAPP, CALL
  Targets: 2

  1. PT ABC (JGL-A-20260110-0001)
     Phone: 08123456789
     Amount: Rp 3,500,000
     Message: Halo PT ABC, kami mengingatkan tagihan JGL-A-20260110-0001 sebesar Rp 3,500,000 yang sudah lewat 38 hari. Mohon segera dilunasi. Terima kasih.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
};

/**
 * EXAMPLE 2: Resolve actions from snapshot
 */
export const exampleResolveFromSnapshot = async () => {
  const snapshot = await getOwnerDailySnapshot();
  const actions = resolveActionsFromSnapshot(snapshot);

  console.log("🎯 ACTIONS FROM SNAPSHOT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Actions: ${actions.length}\n`);

  actions.forEach((action, i) => {
    console.log(`${i + 1}. [${action.riskLevel}] ${action.label}`);
    console.log(`   Type: ${action.actionType}`);
    console.log(`   Targets: ${action.targets.length}`);
    console.log(`   Channels: ${action.channels.join(", ")}`);
    console.log("");
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 3: Resolve actions from risky orders
 */
export const exampleResolveFromRiskyOrders = async () => {
  const riskyOrders = await getTopRiskyOrders(5);
  const actions = resolveActionsFromRiskyOrders(riskyOrders);

  console.log("🚨 ACTIONS FROM RISKY ORDERS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  actions.forEach((action, i) => {
    console.log(`\n${i + 1}. ${action.label}`);
    console.log(`   Risk: ${action.riskLevel}`);
    console.log(`   Targets: ${action.targets.length}`);

    if (action.targets.length > 0) {
      console.log("   Top Targets:");
      action.targets.slice(0, 3).forEach((target, j) => {
        console.log(
          `     ${j + 1}. ${target.customerName} - Rp ${target.remainingAmount.toLocaleString()}`,
        );
      });
    }
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 4: Get action summary
 */
export const exampleActionSummary = async () => {
  const snapshot = await getOwnerDailySnapshot();
  const actions = resolveActionsFromSnapshot(snapshot);
  const summary = getActionSummary(actions);

  console.log("📊 ACTION SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Actions: ${summary.totalActions}`);
  console.log(`Total Targets: ${summary.totalTargets}`);
  console.log(`Requires Contact: ${summary.requiresContact}`);
  console.log("");
  console.log("By Priority:");
  console.log(`  HIGH: ${summary.byPriority.HIGH}`);
  console.log(`  MEDIUM: ${summary.byPriority.MEDIUM}`);
  console.log(`  LOW: ${summary.byPriority.LOW}`);
  console.log("");
  console.log("By Type:");
  Object.entries(summary.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 5: Format for WhatsApp
 */
export const exampleWhatsAppFormat = async () => {
  const riskyOrders = await getTopRiskyOrders(3);
  const actions = resolveActionsFromRiskyOrders(riskyOrders);

  if (actions.length > 0 && actions[0].targets.length > 0) {
    const action = actions[0];
    const waFormat = formatActionForWhatsApp(action, 0);

    console.log("💬 WHATSAPP FORMAT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Customer: ${waFormat.customerName}`);
    console.log(`Phone: ${waFormat.phone}`);
    console.log(`Order: ${waFormat.orderNumber}`);
    console.log("");
    console.log("Message:");
    console.log(waFormat.message);
    console.log("");
    if (waFormat.url) {
      console.log("WhatsApp URL:");
      console.log(waFormat.url);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
};

/**
 * EXAMPLE 6: Complete dashboard integration
 */
export const exampleCompleteDashboard = async () => {
  console.log("📱 OWNER DASHBOARD - ACTION CENTER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Get snapshot
  const snapshot = await getOwnerDailySnapshot();
  console.log(`📊 ${snapshot.summary.message}\n`);

  // 2. Resolve actions
  const actions = resolveActionsFromSnapshot(snapshot);
  const summary = getActionSummary(actions);

  console.log(`🎯 ${summary.totalActions} tindakan diperlukan`);
  console.log(`   ${summary.requiresContact} perlu hubungi customer`);
  console.log(`   ${summary.totalTargets} total target\n`);

  // 3. Show urgent actions
  const urgentActions = actions.filter((a) => a.riskLevel === "HIGH");
  if (urgentActions.length > 0) {
    console.log("🚨 URGENT (Hari Ini):");
    urgentActions.forEach((action, i) => {
      console.log(`${i + 1}. ${action.label}`);
      console.log(`   ${action.targets.length} customer`);
      action.targets.slice(0, 2).forEach((target) => {
        console.log(`   • ${target.customerName} - ${target.orderNumber}`);
      });
      console.log("");
    });
  }

  // 4. Show normal actions
  const normalActions = actions.filter((a) => a.riskLevel !== "HIGH");
  if (normalActions.length > 0) {
    console.log("📋 NORMAL (Minggu Ini):");
    normalActions.forEach((action, i) => {
      console.log(
        `${i + 1}. ${action.label} (${action.targets.length} target)`,
      );
    });
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 7: Action type filtering
 */
export const exampleFilterByActionType = async () => {
  const snapshot = await getOwnerDailySnapshot();
  const actions = resolveActionsFromSnapshot(snapshot);

  console.log("🔍 FILTER BY ACTION TYPE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Contact customer actions
  const contactActions = actions.filter(
    (a) => a.actionType === ACTION_TYPES.CONTACT_CUSTOMER,
  );
  console.log(`💬 Contact Customer: ${contactActions.length}`);
  contactActions.forEach((action) => {
    console.log(`   ${action.label} - ${action.targets.length} targets`);
  });

  // Review payment actions
  const reviewActions = actions.filter(
    (a) => a.actionType === ACTION_TYPES.REVIEW_PAYMENT,
  );
  console.log(`\n📝 Review Payment: ${reviewActions.length}`);
  reviewActions.forEach((action) => {
    console.log(`   ${action.label} - ${action.targets.length} targets`);
  });

  // Monitor only actions
  const monitorActions = actions.filter(
    (a) => a.actionType === ACTION_TYPES.MONITOR_ONLY,
  );
  console.log(`\n👁️  Monitor Only: ${monitorActions.length}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

// Export all examples
export default {
  exampleResolveSingleRecommendation,
  exampleResolveFromSnapshot,
  exampleResolveFromRiskyOrders,
  exampleActionSummary,
  exampleWhatsAppFormat,
  exampleCompleteDashboard,
  exampleFilterByActionType,
};
