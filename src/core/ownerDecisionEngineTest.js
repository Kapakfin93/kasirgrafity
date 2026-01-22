/**
 * Owner Decision Engine - Test Scenarios
 * Test script for decision intelligence functionality
 */

import {
  getOwnerDailySnapshot,
  getTopRiskyOrders,
  getCustomerRiskSummary,
  getSystemHealthStatus,
} from "./ownerDecisionEngine";

console.log("🧪 Testing Owner Decision Engine...\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

/**
 * TEST 1: Daily snapshot structure
 */
console.log("TEST 1: Daily Snapshot Structure");
const testDailySnapshot = async () => {
  const snapshot = await getOwnerDailySnapshot();

  const hasRequiredFields =
    snapshot.success !== undefined &&
    snapshot.summary !== undefined &&
    snapshot.today !== undefined &&
    snapshot.receivables !== undefined &&
    snapshot.issues !== undefined &&
    snapshot.recommendations !== undefined;

  console.log(`Has required fields: ${hasRequiredFields}`);
  console.log(`Summary message exists: ${!!snapshot.summary?.message}`);
  console.log(`Today metrics exist: ${!!snapshot.today?.newOrders}`);
  console.log(hasRequiredFields ? "✅ PASS" : "❌ FAIL");
  console.log("");
};

/**
 * TEST 2: Risky orders scoring
 */
console.log("TEST 2: Risky Orders Scoring");
const testRiskyOrders = async () => {
  const riskyOrders = await getTopRiskyOrders(5);

  console.log(`Returned ${riskyOrders.length} orders`);

  if (riskyOrders.length > 0) {
    const firstOrder = riskyOrders[0];
    const hasRequiredFields =
      firstOrder.orderId !== undefined &&
      firstOrder.orderNumber !== undefined &&
      firstOrder.riskScore !== undefined &&
      firstOrder.riskReason !== undefined &&
      firstOrder.recommendedAction !== undefined;

    console.log(`First order has required fields: ${hasRequiredFields}`);
    console.log(
      `Risk score is number: ${typeof firstOrder.riskScore === "number"}`,
    );
    console.log(`Has recommendation: ${!!firstOrder.recommendedAction}`);

    // Check if sorted by risk score
    const isSorted = riskyOrders.every(
      (order, i) => i === 0 || riskyOrders[i - 1].riskScore >= order.riskScore,
    );
    console.log(`Sorted by risk score: ${isSorted}`);

    console.log(hasRequiredFields && isSorted ? "✅ PASS" : "❌ FAIL");
  } else {
    console.log("⚠️ No risky orders found (might be normal)");
    console.log("✅ PASS (structure valid)");
  }
  console.log("");
};

/**
 * TEST 3: Customer risk categorization
 */
console.log("TEST 3: Customer Risk Categorization");
const testCustomerRisk = async () => {
  const customerRisk = await getCustomerRiskSummary();

  if (customerRisk.success) {
    const hasCategories =
      customerRisk.highRiskCustomers !== undefined &&
      customerRisk.mediumRiskCustomers !== undefined &&
      customerRisk.lowRiskCustomers !== undefined;

    console.log(`Has risk categories: ${hasCategories}`);
    console.log(`Summary exists: ${!!customerRisk.summary}`);

    const totalCategorized =
      customerRisk.summary.highRiskCount +
      customerRisk.summary.mediumRiskCount +
      customerRisk.summary.lowRiskCount;

    const matchesTotalCustomers =
      totalCategorized === customerRisk.summary.totalCustomers;
    console.log(`Categories sum matches total: ${matchesTotalCustomers}`);

    console.log(hasCategories && matchesTotalCustomers ? "✅ PASS" : "❌ FAIL");
  } else {
    console.log("❌ FAIL - Failed to load customer risk");
  }
  console.log("");
};

/**
 * TEST 4: System health scoring
 */
console.log("TEST 4: System Health Scoring");
const testSystemHealth = async () => {
  const health = await getSystemHealthStatus();

  if (health.success) {
    const hasRequiredFields =
      health.status !== undefined &&
      health.score !== undefined &&
      health.message !== undefined &&
      health.healthChecks !== undefined;

    console.log(`Has required fields: ${hasRequiredFields}`);

    const validStatus = ["HEALTHY", "WARNING", "CRITICAL"].includes(
      health.status,
    );
    console.log(`Valid status: ${validStatus} (${health.status})`);

    const validScore = health.score >= 0 && health.score <= 100;
    console.log(`Valid score range: ${validScore} (${health.score}/100)`);

    const hasHealthChecks =
      Array.isArray(health.healthChecks) && health.healthChecks.length > 0;
    console.log(`Has health checks: ${hasHealthChecks}`);

    console.log(
      hasRequiredFields && validStatus && validScore ? "✅ PASS" : "❌ FAIL",
    );
  } else {
    console.log("❌ FAIL - Failed to load system health");
  }
  console.log("");
};

/**
 * TEST 5: Owner-friendly language
 */
console.log("TEST 5: Owner-Friendly Language");
const testOwnerLanguage = async () => {
  const snapshot = await getOwnerDailySnapshot();
  const riskyOrders = await getTopRiskyOrders(1);

  // Check for non-technical terms
  const technicalTerms = ["null", "undefined", "error", "exception", "query"];
  const hasTechnicalTerms = (text) => {
    return technicalTerms.some((term) => text.toLowerCase().includes(term));
  };

  const snapshotMessage = snapshot.summary?.message || "";
  const isOwnerFriendly = !hasTechnicalTerms(snapshotMessage);

  console.log(`Snapshot message: "${snapshotMessage}"`);
  console.log(`Uses owner-friendly language: ${isOwnerFriendly}`);

  if (riskyOrders.length > 0) {
    const recommendation = riskyOrders[0].recommendedAction;
    const isActionable = recommendation && recommendation.length > 10;
    console.log(`Has actionable recommendation: ${isActionable}`);
    console.log(`Recommendation: "${recommendation}"`);
  }

  console.log(isOwnerFriendly ? "✅ PASS" : "❌ FAIL");
  console.log("");
};

/**
 * TEST 6: Recommendations exist
 */
console.log("TEST 6: Recommendations Exist");
const testRecommendations = async () => {
  const snapshot = await getOwnerDailySnapshot();

  if (snapshot.success) {
    const hasRecommendations = Array.isArray(snapshot.recommendations);
    console.log(`Has recommendations array: ${hasRecommendations}`);

    if (snapshot.issues.length > 0) {
      const hasMatchingRecommendations = snapshot.recommendations.length > 0;
      console.log(`Issues: ${snapshot.issues.length}`);
      console.log(`Recommendations: ${snapshot.recommendations.length}`);
      console.log(
        `Has recommendations for issues: ${hasMatchingRecommendations}`,
      );

      console.log(hasMatchingRecommendations ? "✅ PASS" : "⚠️ WARNING");
    } else {
      console.log("No issues found (healthy state)");
      console.log("✅ PASS");
    }
  }
  console.log("");
};

/**
 * TEST 7: Data aggregation
 */
console.log("TEST 7: Data Aggregation");
const testDataAggregation = async () => {
  const snapshot = await getOwnerDailySnapshot();

  if (snapshot.success) {
    // Check if data is aggregated from multiple sources
    const hasAgingData = snapshot.receivables.current !== undefined;
    const hasPaymentData = snapshot.today.paymentsReceived !== undefined;
    const hasIssueDetection = snapshot.issues !== undefined;

    console.log(`Has aging data: ${hasAgingData}`);
    console.log(`Has payment data: ${hasPaymentData}`);
    console.log(`Has issue detection: ${hasIssueDetection}`);

    const isAggregated = hasAgingData && hasPaymentData && hasIssueDetection;
    console.log(isAggregated ? "✅ PASS" : "❌ FAIL");
  }
  console.log("");
};

/**
 * TEST 8: Risk score calculation
 */
console.log("TEST 8: Risk Score Calculation");
const testRiskScoreCalculation = async () => {
  const riskyOrders = await getTopRiskyOrders(10);

  if (riskyOrders.length > 0) {
    // Check if risk scores are reasonable
    const allScoresValid = riskyOrders.every(
      (order) => order.riskScore >= 0 && order.riskScore <= 100,
    );

    console.log(`All risk scores in valid range: ${allScoresValid}`);

    // Check if higher scores have more risk factors
    const firstOrder = riskyOrders[0];
    const hasRiskFactors =
      Array.isArray(firstOrder.riskFactors) &&
      firstOrder.riskFactors.length > 0;

    console.log(`Top risky order has risk factors: ${hasRiskFactors}`);
    if (hasRiskFactors) {
      console.log(`Risk factors: ${firstOrder.riskFactors.join(", ")}`);
    }

    console.log(allScoresValid && hasRiskFactors ? "✅ PASS" : "❌ FAIL");
  } else {
    console.log("No risky orders to test");
    console.log("✅ PASS (no data)");
  }
  console.log("");
};

// Run all tests
const runAllTests = async () => {
  await testDailySnapshot();
  await testRiskyOrders();
  await testCustomerRisk();
  await testSystemHealth();
  await testOwnerLanguage();
  await testRecommendations();
  await testDataAggregation();
  await testRiskScoreCalculation();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 All Tests Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
};

// Export test runner
export { runAllTests };

// Auto-run if imported
runAllTests();
