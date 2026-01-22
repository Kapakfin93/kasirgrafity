/**
 * Owner Decision Intelligence Layer
 * READ-ONLY layer that aggregates data from all analysis layers
 * Provides actionable business insights in owner-friendly language
 *
 * @module ownerDecisionEngine
 * @author JOGLO POS Team
 * @version 1.0.0
 */

import { getPaymentDiscrepancyReport } from "./paymentValidator";
import { getAgingReport, getAgingStatistics } from "./receivableAging";
import { getAuditSummaryByDateRange } from "./orderAuditTimeline";
import { supabase } from "../services/supabaseClient";

/**
 * Get comprehensive daily snapshot for owner
 * Combines all key metrics into single dashboard view
 *
 * @returns {Promise<Object>} Daily snapshot with actionable insights
 *
 * @example
 * const snapshot = await getOwnerDailySnapshot();
 * console.log(snapshot.summary.message); // "Hari ini ada 3 hal yang perlu perhatian"
 */
export const getOwnerDailySnapshot = async () => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Fetch today's orders
    const { data: todayOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .neq("production_status", "CANCELLED");

    if (ordersError) throw ordersError;

    // Fetch today's payments
    const { data: todayPayments, error: paymentsError } = await supabase
      .from("order_payments")
      .select("*")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (paymentsError) throw paymentsError;

    // Get aging statistics
    const agingStats = await getAgingStatistics();

    // Get payment validation summary
    const validationReport = await getPaymentDiscrepancyReport({
      onlyMismatches: true,
    });

    // Calculate metrics
    const totalOrdersToday = todayOrders?.length || 0;
    const totalPaymentsToday = todayPayments?.length || 0;
    const totalPaymentAmount =
      todayPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

    const newOrdersAmount =
      todayOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) ||
      0;

    // Identify issues
    const issues = [];
    const recommendations = [];

    // Check for overdue receivables
    if (agingStats.success && agingStats.buckets.overdue.count > 0) {
      issues.push({
        type: "OVERDUE_RECEIVABLES",
        severity: "HIGH",
        message: `${agingStats.buckets.overdue.count} piutang lewat 30 hari`,
        amount: agingStats.buckets.overdue.total,
      });
      recommendations.push({
        action: "FOLLOW_UP_OVERDUE",
        message: `Hubungi ${agingStats.buckets.overdue.count} customer dengan piutang lewat tempo`,
        priority: "HIGH",
      });
    }

    // Check for payment mismatches
    if (
      validationReport.success &&
      validationReport.summary.totalMismatches > 0
    ) {
      issues.push({
        type: "PAYMENT_MISMATCH",
        severity: "MEDIUM",
        message: `${validationReport.summary.totalMismatches} order dengan ketidaksesuaian pembayaran`,
        amount: validationReport.summary.totalDiscrepancyAmount,
      });
      recommendations.push({
        action: "VERIFY_PAYMENTS",
        message: "Periksa dan perbaiki data pembayaran yang tidak sesuai",
        priority: "MEDIUM",
      });
    }

    // Check for due soon receivables
    if (agingStats.success && agingStats.buckets.due.count > 0) {
      issues.push({
        type: "DUE_SOON",
        severity: "LOW",
        message: `${agingStats.buckets.due.count} piutang akan jatuh tempo (8-30 hari)`,
        amount: agingStats.buckets.due.total,
      });
      recommendations.push({
        action: "REMINDER",
        message: "Kirim reminder pembayaran ke customer",
        priority: "LOW",
      });
    }

    // Generate summary message
    let summaryMessage = "✅ Semua baik-baik saja";
    if (issues.length > 0) {
      summaryMessage = `⚠️ Ada ${issues.length} hal yang perlu perhatian`;
    }

    return {
      success: true,
      summary: {
        message: summaryMessage,
        date: today.toISOString(),
        issuesCount: issues.length,
        recommendationsCount: recommendations.length,
      },
      today: {
        newOrders: totalOrdersToday,
        newOrdersAmount,
        paymentsReceived: totalPaymentsToday,
        paymentsAmount: totalPaymentAmount,
        netCashflow: totalPaymentAmount, // Simplified
      },
      receivables: {
        current: agingStats.success
          ? agingStats.buckets.current
          : { count: 0, total: 0 },
        dueSoon: agingStats.success
          ? agingStats.buckets.due
          : { count: 0, total: 0 },
        overdue: agingStats.success
          ? agingStats.buckets.overdue
          : { count: 0, total: 0 },
        totalOutstanding: agingStats.success
          ? agingStats.totals.receivables
          : 0,
      },
      issues,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Daily snapshot error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get top risky orders that need immediate attention
 * Combines aging, validation, and payment status
 *
 * @param {number} limit - Number of orders to return (default: 5)
 * @returns {Promise<Array>} Top risky orders with action recommendations
 *
 * @example
 * const riskyOrders = await getTopRiskyOrders(5);
 * riskyOrders.forEach(order => {
 *   console.log(`${order.orderNumber}: ${order.riskReason}`);
 * });
 */
export const getTopRiskyOrders = async (limit = 5) => {
  try {
    // Get aging report with validation
    const agingReport = await getAgingReport({ includeValidation: true });

    if (!agingReport.success) {
      return [];
    }

    // Score each order by risk level
    const scoredOrders = agingReport.orders.map((order) => {
      let riskScore = 0;
      const riskFactors = [];
      let riskReason = "";
      let recommendedAction = "";

      // Factor 1: Aging (highest weight)
      if (order.agingBucket === "OVERDUE_30") {
        riskScore += 50;
        riskFactors.push("Lewat tempo >30 hari");
      } else if (order.agingBucket === "DUE_8_30") {
        riskScore += 20;
        riskFactors.push("Akan jatuh tempo");
      }

      // Factor 2: Financial risk from validator
      if (order.isFinancialRisk) {
        riskScore += 30;
        riskFactors.push("Data pembayaran tidak sesuai");
      }

      // Factor 3: Amount (higher amount = higher risk)
      if (order.remainingAmount > 5000000) {
        riskScore += 15;
        riskFactors.push("Nilai piutang besar");
      } else if (order.remainingAmount > 1000000) {
        riskScore += 5;
      }

      // Factor 4: Age in days
      if (order.ageInDays > 60) {
        riskScore += 10;
        riskFactors.push("Sudah sangat lama");
      }

      // Determine reason and action
      if (riskScore >= 50) {
        riskReason = "URGENT: " + riskFactors.join(", ");
        recommendedAction =
          "Hubungi customer segera atau pertimbangkan write-off";
      } else if (riskScore >= 30) {
        riskReason = "PERHATIAN: " + riskFactors.join(", ");
        recommendedAction = "Follow up pembayaran dengan customer";
      } else {
        riskReason = riskFactors.join(", ");
        recommendedAction = "Kirim reminder pembayaran";
      }

      return {
        ...order,
        riskScore,
        riskReason,
        recommendedAction,
        riskFactors,
      };
    });

    // Sort by risk score and return top N
    return scoredOrders
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      .map((order) => ({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        remainingAmount: order.remainingAmount,
        ageInDays: order.ageInDays,
        agingBucket: order.agingBucket,
        riskScore: order.riskScore,
        riskReason: order.riskReason,
        recommendedAction: order.recommendedAction,
        riskFactors: order.riskFactors,
      }));
  } catch (error) {
    console.error("❌ Top risky orders error:", error);
    return [];
  }
};

/**
 * Get customer risk summary
 * Identifies customers with payment issues or patterns
 *
 * @returns {Promise<Object>} Customer risk analysis
 *
 * @example
 * const customerRisk = await getCustomerRiskSummary();
 * console.log(`${customerRisk.highRiskCustomers.length} customer berisiko tinggi`);
 */
export const getCustomerRiskSummary = async () => {
  try {
    // Get all orders with outstanding balance
    const agingReport = await getAgingReport({ includeValidation: true });

    if (!agingReport.success) {
      return {
        success: false,
        error: "Failed to load aging report",
      };
    }

    // Group by customer
    const customerMap = {};

    agingReport.orders.forEach((order) => {
      const customerKey = order.customerName || "Unknown";

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = {
          customerName: customerKey,
          customerPhone: order.customerPhone,
          orders: [],
          totalOutstanding: 0,
          oldestAge: 0,
          hasFinancialRisk: false,
        };
      }

      customerMap[customerKey].orders.push(order);
      customerMap[customerKey].totalOutstanding += order.remainingAmount;
      customerMap[customerKey].oldestAge = Math.max(
        customerMap[customerKey].oldestAge,
        order.ageInDays,
      );
      if (order.isFinancialRisk) {
        customerMap[customerKey].hasFinancialRisk = true;
      }
    });

    // Convert to array and score
    const customers = Object.values(customerMap).map((customer) => {
      let riskLevel = "LOW";
      const issues = [];

      if (customer.oldestAge > 30) {
        riskLevel = "HIGH";
        issues.push(`Piutang lewat ${customer.oldestAge} hari`);
      } else if (customer.oldestAge > 7) {
        riskLevel = "MEDIUM";
        issues.push(`Piutang ${customer.oldestAge} hari`);
      }

      if (customer.hasFinancialRisk) {
        riskLevel = "HIGH";
        issues.push("Ada masalah data pembayaran");
      }

      if (customer.orders.length > 3) {
        issues.push(`${customer.orders.length} order belum lunas`);
      }

      return {
        ...customer,
        riskLevel,
        issues,
        orderCount: customer.orders.length,
      };
    });

    // Categorize
    const highRisk = customers.filter((c) => c.riskLevel === "HIGH");
    const mediumRisk = customers.filter((c) => c.riskLevel === "MEDIUM");
    const lowRisk = customers.filter((c) => c.riskLevel === "LOW");

    return {
      success: true,
      summary: {
        totalCustomers: customers.length,
        highRiskCount: highRisk.length,
        mediumRiskCount: mediumRisk.length,
        lowRiskCount: lowRisk.length,
        totalOutstanding: customers.reduce(
          (sum, c) => sum + c.totalOutstanding,
          0,
        ),
      },
      highRiskCustomers: highRisk.sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding,
      ),
      mediumRiskCustomers: mediumRisk.sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding,
      ),
      lowRiskCustomers: lowRisk.sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding,
      ),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Customer risk summary error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get system health status
 * Overall health check of financial data integrity
 *
 * @returns {Promise<Object>} System health report
 *
 * @example
 * const health = await getSystemHealthStatus();
 * console.log(health.status); // "HEALTHY" | "WARNING" | "CRITICAL"
 */
export const getSystemHealthStatus = async () => {
  try {
    // Get validation report
    const validationReport = await getPaymentDiscrepancyReport();

    // Get aging statistics
    const agingStats = await getAgingStatistics();

    // Get audit summary for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const auditSummary = await getAuditSummaryByDateRange(
      thirtyDaysAgo,
      new Date(),
    );

    // Calculate health scores
    const healthChecks = [];
    let overallScore = 100;

    // Check 1: Payment data integrity
    if (validationReport.success) {
      const mismatchRate =
        validationReport.summary.totalOrders > 0
          ? (validationReport.summary.totalMismatches /
              validationReport.summary.totalOrders) *
            100
          : 0;

      if (mismatchRate > 10) {
        healthChecks.push({
          check: "Data Pembayaran",
          status: "CRITICAL",
          message: `${mismatchRate.toFixed(1)}% order memiliki ketidaksesuaian`,
          impact: "Integritas data keuangan bermasalah",
        });
        overallScore -= 30;
      } else if (mismatchRate > 5) {
        healthChecks.push({
          check: "Data Pembayaran",
          status: "WARNING",
          message: `${mismatchRate.toFixed(1)}% order memiliki ketidaksesuaian`,
          impact: "Perlu review data pembayaran",
        });
        overallScore -= 15;
      } else {
        healthChecks.push({
          check: "Data Pembayaran",
          status: "HEALTHY",
          message: "Data pembayaran konsisten",
        });
      }
    }

    // Check 2: Receivables aging
    if (agingStats.success) {
      const overdueRate =
        agingStats.totals.orders > 0
          ? (agingStats.buckets.overdue.count / agingStats.totals.orders) * 100
          : 0;

      if (overdueRate > 20) {
        healthChecks.push({
          check: "Piutang",
          status: "CRITICAL",
          message: `${overdueRate.toFixed(1)}% piutang lewat tempo`,
          impact: "Cashflow berisiko",
        });
        overallScore -= 25;
      } else if (overdueRate > 10) {
        healthChecks.push({
          check: "Piutang",
          status: "WARNING",
          message: `${overdueRate.toFixed(1)}% piutang lewat tempo`,
          impact: "Perlu follow up customer",
        });
        overallScore -= 10;
      } else {
        healthChecks.push({
          check: "Piutang",
          status: "HEALTHY",
          message: "Penagihan piutang lancar",
        });
      }
    }

    // Check 3: Payment activity
    if (auditSummary.success) {
      const avgPaymentsPerOrder =
        auditSummary.summary.totalOrders > 0
          ? auditSummary.summary.totalPayments /
            auditSummary.summary.totalOrders
          : 0;

      if (avgPaymentsPerOrder > 2) {
        healthChecks.push({
          check: "Aktivitas Pembayaran",
          status: "WARNING",
          message: `Rata-rata ${avgPaymentsPerOrder.toFixed(1)} kali pembayaran per order`,
          impact: "Banyak pembayaran cicilan",
        });
        overallScore -= 5;
      } else {
        healthChecks.push({
          check: "Aktivitas Pembayaran",
          status: "HEALTHY",
          message: "Pola pembayaran normal",
        });
      }
    }

    // Determine overall status
    let overallStatus = "HEALTHY";
    let statusMessage = "✅ Sistem keuangan sehat";
    let recommendation = "Pertahankan praktik saat ini";

    if (overallScore < 60) {
      overallStatus = "CRITICAL";
      statusMessage = "🚨 Perlu tindakan segera";
      recommendation = "Review dan perbaiki masalah keuangan secara menyeluruh";
    } else if (overallScore < 80) {
      overallStatus = "WARNING";
      statusMessage = "⚠️ Perlu perhatian";
      recommendation = "Fokus pada area yang bermasalah";
    }

    return {
      success: true,
      status: overallStatus,
      score: overallScore,
      message: statusMessage,
      recommendation,
      healthChecks,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ System health error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
