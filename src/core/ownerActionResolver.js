/**
 * Owner Action Resolver Layer
 * READ-ONLY layer that translates recommendations into executable actions
 * Provides templates and contact info without modifying any data
 *
 * @module ownerActionResolver
 * @author JOGLO POS Team
 * @version 1.0.0
 */

/**
 * Action type constants
 */
export const ACTION_TYPES = {
  CONTACT_CUSTOMER: "CONTACT_CUSTOMER",
  REVIEW_PAYMENT: "REVIEW_PAYMENT",
  MONITOR_ONLY: "MONITOR_ONLY",
  NO_ACTION: "NO_ACTION",
};

/**
 * Communication channel constants
 */
export const CHANNELS = {
  WHATSAPP: "WHATSAPP",
  CALL: "CALL",
  EMAIL: "EMAIL",
  VISIT: "VISIT",
};

/**
 * Action labels (owner-friendly)
 */
const ACTION_LABELS = {
  [ACTION_TYPES.CONTACT_CUSTOMER]: "Hubungi Customer",
  [ACTION_TYPES.REVIEW_PAYMENT]: "Review Data Pembayaran",
  [ACTION_TYPES.MONITOR_ONLY]: "Pantau Saja",
  [ACTION_TYPES.NO_ACTION]: "Tidak Perlu Tindakan",
};

/**
 * Message templates for different scenarios
 */
const MESSAGE_TEMPLATES = {
  OVERDUE_REMINDER:
    "Halo {{name}}, kami mengingatkan tagihan {{orderNumber}} sebesar Rp {{amount}} yang sudah lewat {{days}} hari. Mohon segera dilunasi. Terima kasih.",

  DUE_SOON_REMINDER:
    "Halo {{name}}, tagihan {{orderNumber}} sebesar Rp {{amount}} akan jatuh tempo. Mohon diperhatikan. Terima kasih.",

  PAYMENT_VERIFICATION:
    "Halo {{name}}, kami perlu verifikasi pembayaran untuk order {{orderNumber}}. Mohon hubungi kami. Terima kasih.",

  GENERAL_FOLLOWUP:
    "Halo {{name}}, terkait order {{orderNumber}} dengan sisa tagihan Rp {{amount}}, mohon konfirmasi jadwal pembayaran. Terima kasih.",
};

/**
 * Resolve a single recommendation into executable action
 *
 * @param {Object} recommendation - Recommendation from decision engine
 * @param {Object} context - Context data (orders, customers, etc.)
 * @returns {Object} Resolved action with templates and targets
 *
 * @example
 * const action = resolveOwnerAction(recommendation, context);
 * console.log(action.messageTemplate); // WhatsApp template
 */
export const resolveOwnerAction = (recommendation, context = {}) => {
  const { action, message, priority } = recommendation;
  const { orders = [], customers = [] } = context;

  // Default action structure
  const resolvedAction = {
    actionType: ACTION_TYPES.NO_ACTION,
    label: ACTION_LABELS[ACTION_TYPES.NO_ACTION],
    channels: [],
    targets: [],
    messageTemplate: "",
    riskLevel: priority || "LOW",
    source: "OWNER_DECISION_ENGINE",
    originalRecommendation: message,
  };

  // Map recommendation action to action type
  switch (action) {
    case "FOLLOW_UP_OVERDUE":
      resolvedAction.actionType = ACTION_TYPES.CONTACT_CUSTOMER;
      resolvedAction.label = ACTION_LABELS[ACTION_TYPES.CONTACT_CUSTOMER];
      resolvedAction.channels = [CHANNELS.WHATSAPP, CHANNELS.CALL];
      resolvedAction.messageTemplate = MESSAGE_TEMPLATES.OVERDUE_REMINDER;

      // Extract overdue orders as targets
      resolvedAction.targets = orders
        .filter((o) => o.agingBucket === "OVERDUE_30" || o.ageInDays > 30)
        .map((order) => ({
          customerName: order.customerName,
          phone: order.customerPhone || "-",
          orderNumber: order.orderNumber,
          remainingAmount: order.remainingAmount,
          ageInDays: order.ageInDays,
          message: MESSAGE_TEMPLATES.OVERDUE_REMINDER.replace(
            "{{name}}",
            order.customerName,
          )
            .replace("{{orderNumber}}", order.orderNumber)
            .replace("{{amount}}", order.remainingAmount.toLocaleString())
            .replace("{{days}}", order.ageInDays),
        }));
      break;

    case "REMINDER":
      resolvedAction.actionType = ACTION_TYPES.CONTACT_CUSTOMER;
      resolvedAction.label = "Kirim Reminder";
      resolvedAction.channels = [CHANNELS.WHATSAPP];
      resolvedAction.messageTemplate = MESSAGE_TEMPLATES.DUE_SOON_REMINDER;

      // Extract due soon orders
      resolvedAction.targets = orders
        .filter((o) => o.agingBucket === "DUE_8_30")
        .map((order) => ({
          customerName: order.customerName,
          phone: order.customerPhone || "-",
          orderNumber: order.orderNumber,
          remainingAmount: order.remainingAmount,
          ageInDays: order.ageInDays,
          message: MESSAGE_TEMPLATES.DUE_SOON_REMINDER.replace(
            "{{name}}",
            order.customerName,
          )
            .replace("{{orderNumber}}", order.orderNumber)
            .replace("{{amount}}", order.remainingAmount.toLocaleString()),
        }));
      break;

    case "VERIFY_PAYMENTS":
      resolvedAction.actionType = ACTION_TYPES.REVIEW_PAYMENT;
      resolvedAction.label = ACTION_LABELS[ACTION_TYPES.REVIEW_PAYMENT];
      resolvedAction.channels = [CHANNELS.WHATSAPP, CHANNELS.CALL];
      resolvedAction.messageTemplate = MESSAGE_TEMPLATES.PAYMENT_VERIFICATION;

      // Extract orders with payment issues
      resolvedAction.targets = orders
        .filter(
          (o) => o.isFinancialRisk || o.validationStatus === "MISMATCH_PAID",
        )
        .map((order) => ({
          customerName: order.customerName,
          phone: order.customerPhone || "-",
          orderNumber: order.orderNumber,
          remainingAmount: order.remainingAmount,
          issue: "Data pembayaran tidak sesuai",
          message: MESSAGE_TEMPLATES.PAYMENT_VERIFICATION.replace(
            "{{name}}",
            order.customerName,
          ).replace("{{orderNumber}}", order.orderNumber),
        }));
      break;

    case "MONITOR":
    case "SYSTEM_HEALTH_WARNING":
      resolvedAction.actionType = ACTION_TYPES.MONITOR_ONLY;
      resolvedAction.label = ACTION_LABELS[ACTION_TYPES.MONITOR_ONLY];
      resolvedAction.channels = [];
      resolvedAction.messageTemplate = "";
      resolvedAction.targets = [];
      break;

    default:
      // Generic follow-up
      if (orders.length > 0) {
        resolvedAction.actionType = ACTION_TYPES.CONTACT_CUSTOMER;
        resolvedAction.label = "Follow Up";
        resolvedAction.channels = [CHANNELS.WHATSAPP, CHANNELS.CALL];
        resolvedAction.messageTemplate = MESSAGE_TEMPLATES.GENERAL_FOLLOWUP;

        resolvedAction.targets = orders.slice(0, 5).map((order) => ({
          customerName: order.customerName,
          phone: order.customerPhone || "-",
          orderNumber: order.orderNumber,
          remainingAmount: order.remainingAmount,
          message: MESSAGE_TEMPLATES.GENERAL_FOLLOWUP.replace(
            "{{name}}",
            order.customerName,
          )
            .replace("{{orderNumber}}", order.orderNumber)
            .replace("{{amount}}", order.remainingAmount.toLocaleString()),
        }));
      }
  }

  return resolvedAction;
};

/**
 * Resolve all actions from owner daily snapshot
 * Converts all recommendations into executable action items
 *
 * @param {Object} snapshot - Output from getOwnerDailySnapshot()
 * @returns {Array} Array of resolved actions ready for dashboard
 *
 * @example
 * const snapshot = await getOwnerDailySnapshot();
 * const actions = resolveActionsFromSnapshot(snapshot);
 * actions.forEach(action => {
 *   console.log(`${action.label}: ${action.targets.length} targets`);
 * });
 */
export const resolveActionsFromSnapshot = (snapshot) => {
  if (!snapshot.success || !snapshot.recommendations) {
    return [];
  }

  const actions = [];

  // Get relevant orders from snapshot
  const allOrders = [];

  // Extract orders from issues context
  snapshot.issues?.forEach((issue) => {
    if (issue.type === "OVERDUE_RECEIVABLES") {
      // These would come from aging report
      // For now, we'll use placeholder structure
    }
  });

  // Resolve each recommendation
  snapshot.recommendations.forEach((recommendation) => {
    const context = {
      orders: allOrders,
      generatedAt: snapshot.generatedAt,
    };

    const resolvedAction = resolveOwnerAction(recommendation, context);

    // Only add actions that have targets or are meaningful
    if (
      resolvedAction.actionType !== ACTION_TYPES.NO_ACTION &&
      (resolvedAction.targets.length > 0 ||
        resolvedAction.actionType === ACTION_TYPES.MONITOR_ONLY)
    ) {
      actions.push(resolvedAction);
    }
  });

  // Sort by priority
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  actions.sort((a, b) => {
    return (
      (priorityOrder[a.riskLevel] || 3) - (priorityOrder[b.riskLevel] || 3)
    );
  });

  return actions;
};

/**
 * Resolve actions from risky orders
 * Converts top risky orders into contact actions
 *
 * @param {Array} riskyOrders - Output from getTopRiskyOrders()
 * @returns {Array} Array of contact actions
 *
 * @example
 * const riskyOrders = await getTopRiskyOrders(5);
 * const actions = resolveActionsFromRiskyOrders(riskyOrders);
 */
export const resolveActionsFromRiskyOrders = (riskyOrders) => {
  if (!Array.isArray(riskyOrders) || riskyOrders.length === 0) {
    return [];
  }

  const actions = [];

  // Group by action type
  const urgentOrders = riskyOrders.filter((o) => o.riskScore >= 50);
  const normalOrders = riskyOrders.filter((o) => o.riskScore < 50);

  // Urgent contact action
  if (urgentOrders.length > 0) {
    actions.push({
      actionType: ACTION_TYPES.CONTACT_CUSTOMER,
      label: "URGENT: Hubungi Segera",
      channels: [CHANNELS.CALL, CHANNELS.WHATSAPP, CHANNELS.VISIT],
      targets: urgentOrders.map((order) => ({
        customerName: order.customerName,
        phone: order.customerPhone || "-",
        orderNumber: order.orderNumber,
        remainingAmount: order.remainingAmount,
        ageInDays: order.ageInDays,
        riskReason: order.riskReason,
        recommendedAction: order.recommendedAction,
        message: MESSAGE_TEMPLATES.OVERDUE_REMINDER.replace(
          "{{name}}",
          order.customerName,
        )
          .replace("{{orderNumber}}", order.orderNumber)
          .replace("{{amount}}", order.remainingAmount.toLocaleString())
          .replace("{{days}}", order.ageInDays),
      })),
      messageTemplate: MESSAGE_TEMPLATES.OVERDUE_REMINDER,
      riskLevel: "HIGH",
      source: "RISKY_ORDERS",
    });
  }

  // Normal follow-up action
  if (normalOrders.length > 0) {
    actions.push({
      actionType: ACTION_TYPES.CONTACT_CUSTOMER,
      label: "Follow Up Rutin",
      channels: [CHANNELS.WHATSAPP],
      targets: normalOrders.map((order) => ({
        customerName: order.customerName,
        phone: order.customerPhone || "-",
        orderNumber: order.orderNumber,
        remainingAmount: order.remainingAmount,
        ageInDays: order.ageInDays,
        message: MESSAGE_TEMPLATES.GENERAL_FOLLOWUP.replace(
          "{{name}}",
          order.customerName,
        )
          .replace("{{orderNumber}}", order.orderNumber)
          .replace("{{amount}}", order.remainingAmount.toLocaleString()),
      })),
      messageTemplate: MESSAGE_TEMPLATES.GENERAL_FOLLOWUP,
      riskLevel: "MEDIUM",
      source: "RISKY_ORDERS",
    });
  }

  return actions;
};

/**
 * Get action summary statistics
 * Provides overview of actions needed
 *
 * @param {Array} actions - Resolved actions
 * @returns {Object} Action summary
 */
export const getActionSummary = (actions) => {
  const summary = {
    totalActions: actions.length,
    byType: {},
    byPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    totalTargets: 0,
    requiresContact: 0,
  };

  actions.forEach((action) => {
    // Count by type
    summary.byType[action.actionType] =
      (summary.byType[action.actionType] || 0) + 1;

    // Count by priority
    if (summary.byPriority[action.riskLevel] !== undefined) {
      summary.byPriority[action.riskLevel]++;
    }

    // Count targets
    summary.totalTargets += action.targets.length;

    // Count contact actions
    if (action.actionType === ACTION_TYPES.CONTACT_CUSTOMER) {
      summary.requiresContact++;
    }
  });

  return summary;
};

/**
 * Format action for WhatsApp
 * Prepares action for WhatsApp integration
 *
 * @param {Object} action - Resolved action
 * @param {number} targetIndex - Index of target to format
 * @returns {Object} WhatsApp-ready format
 */
export const formatActionForWhatsApp = (action, targetIndex = 0) => {
  if (!action.targets || !action.targets[targetIndex]) {
    return null;
  }

  const target = action.targets[targetIndex];

  return {
    phone: target.phone,
    message: target.message || action.messageTemplate,
    customerName: target.customerName,
    orderNumber: target.orderNumber,
    url:
      target.phone && target.phone !== "-"
        ? `https://wa.me/${target.phone.replace(/\D/g, "")}?text=${encodeURIComponent(target.message || action.messageTemplate)}`
        : null,
  };
};
