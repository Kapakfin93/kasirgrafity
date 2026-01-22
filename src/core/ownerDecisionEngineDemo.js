/**
 * Owner Decision Engine - Demo Usage Examples
 * Demonstrates how to use the decision intelligence layer
 *
 * @module ownerDecisionEngineDemo
 */

import {
  getOwnerDailySnapshot,
  getTopRiskyOrders,
  getCustomerRiskSummary,
  getSystemHealthStatus,
} from "./ownerDecisionEngine";

/**
 * EXAMPLE 1: Get daily snapshot
 */
export const exampleDailySnapshot = async () => {
  const snapshot = await getOwnerDailySnapshot();

  if (snapshot.success) {
    console.log("📊 SNAPSHOT HARIAN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(snapshot.summary.message);
    console.log("");

    console.log("HARI INI:");
    console.log(
      `  Order Baru: ${snapshot.today.newOrders} (Rp ${snapshot.today.newOrdersAmount.toLocaleString()})`,
    );
    console.log(
      `  Pembayaran Masuk: ${snapshot.today.paymentsReceived} (Rp ${snapshot.today.paymentsAmount.toLocaleString()})`,
    );
    console.log(
      `  Cashflow: Rp ${snapshot.today.netCashflow.toLocaleString()}`,
    );
    console.log("");

    console.log("PIUTANG:");
    console.log(
      `  Lancar (0-7 hari): ${snapshot.receivables.current.count} order (Rp ${snapshot.receivables.current.total.toLocaleString()})`,
    );
    console.log(
      `  Jatuh Tempo (8-30): ${snapshot.receivables.dueSoon.count} order (Rp ${snapshot.receivables.dueSoon.total.toLocaleString()})`,
    );
    console.log(
      `  Lewat Tempo (>30): ${snapshot.receivables.overdue.count} order (Rp ${snapshot.receivables.overdue.total.toLocaleString()})`,
    );
    console.log(
      `  Total Piutang: Rp ${snapshot.receivables.totalOutstanding.toLocaleString()}`,
    );
    console.log("");

    if (snapshot.issues.length > 0) {
      console.log("⚠️ PERLU PERHATIAN:");
      snapshot.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.message}`);
        if (issue.amount) {
          console.log(`     Nilai: Rp ${issue.amount.toLocaleString()}`);
        }
      });
      console.log("");
    }

    if (snapshot.recommendations.length > 0) {
      console.log("💡 REKOMENDASI:");
      snapshot.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.message}`);
      });
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /*
  Output:
  📊 SNAPSHOT HARIAN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Ada 2 hal yang perlu perhatian

  HARI INI:
    Order Baru: 5 (Rp 12,500,000)
    Pembayaran Masuk: 8 (Rp 8,300,000)
    Cashflow: Rp 8,300,000

  PIUTANG:
    Lancar (0-7 hari): 10 order (Rp 5,000,000)
    Jatuh Tempo (8-30): 3 order (Rp 2,000,000)
    Lewat Tempo (>30): 2 order (Rp 3,500,000)
    Total Piutang: Rp 10,500,000

  ⚠️ PERLU PERHATIAN:
    1. 2 piutang lewat 30 hari
       Nilai: Rp 3,500,000

  💡 REKOMENDASI:
    1. [HIGH] Hubungi 2 customer dengan piutang lewat tempo
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
};

/**
 * EXAMPLE 2: Get top risky orders
 */
export const exampleTopRiskyOrders = async () => {
  const riskyOrders = await getTopRiskyOrders(5);

  console.log("🚨 TOP 5 ORDER BERISIKO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  riskyOrders.forEach((order, i) => {
    console.log(`\n${i + 1}. ${order.orderNumber} - ${order.customerName}`);
    console.log(
      `   Sisa Tagihan: Rp ${order.remainingAmount.toLocaleString()}`,
    );
    console.log(`   Umur: ${order.ageInDays} hari`);
    console.log(`   Risk Score: ${order.riskScore}/100`);
    console.log(`   Alasan: ${order.riskReason}`);
    console.log(`   Tindakan: ${order.recommendedAction}`);
    if (order.customerPhone) {
      console.log(`   Kontak: ${order.customerPhone}`);
    }
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
  Output:
  🚨 TOP 5 ORDER BERISIKO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. JGL-A-20251215-0001 - PT ABC
     Sisa Tagihan: Rp 5,000,000
     Umur: 38 hari
     Risk Score: 65/100
     Alasan: URGENT: Lewat tempo >30 hari, Nilai piutang besar
     Tindakan: Hubungi customer segera atau pertimbangkan write-off
     Kontak: 08123456789

  2. JGL-A-20260107-0002 - Toko XYZ
     Sisa Tagihan: Rp 2,500,000
     Umur: 15 hari
     Risk Score: 35/100
     Alasan: PERHATIAN: Akan jatuh tempo, Data pembayaran tidak sesuai
     Tindakan: Follow up pembayaran dengan customer
     Kontak: 08198765432
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
};

/**
 * EXAMPLE 3: Get customer risk summary
 */
export const exampleCustomerRiskSummary = async () => {
  const customerRisk = await getCustomerRiskSummary();

  if (customerRisk.success) {
    console.log("👥 ANALISIS RISIKO CUSTOMER");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Customer: ${customerRisk.summary.totalCustomers}`);
    console.log(
      `Total Piutang: Rp ${customerRisk.summary.totalOutstanding.toLocaleString()}`,
    );
    console.log("");
    console.log(
      `🚨 Risiko Tinggi: ${customerRisk.summary.highRiskCount} customer`,
    );
    console.log(
      `⚠️  Risiko Sedang: ${customerRisk.summary.mediumRiskCount} customer`,
    );
    console.log(
      `✅ Risiko Rendah: ${customerRisk.summary.lowRiskCount} customer`,
    );
    console.log("");

    if (customerRisk.highRiskCustomers.length > 0) {
      console.log("🚨 CUSTOMER RISIKO TINGGI:");
      customerRisk.highRiskCustomers.slice(0, 5).forEach((customer, i) => {
        console.log(`\n${i + 1}. ${customer.customerName}`);
        console.log(
          `   Piutang: Rp ${customer.totalOutstanding.toLocaleString()}`,
        );
        console.log(`   Order Belum Lunas: ${customer.orderCount}`);
        console.log(`   Umur Tertua: ${customer.oldestAge} hari`);
        console.log(`   Masalah: ${customer.issues.join(", ")}`);
        if (customer.customerPhone) {
          console.log(`   Kontak: ${customer.customerPhone}`);
        }
      });
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /*
  Output:
  👥 ANALISIS RISIKO CUSTOMER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Customer: 25
  Total Piutang: Rp 15,000,000

  🚨 Risiko Tinggi: 3 customer
  ⚠️  Risiko Sedang: 8 customer
  ✅ Risiko Rendah: 14 customer

  🚨 CUSTOMER RISIKO TINGGI:

  1. PT ABC Indonesia
     Piutang: Rp 5,000,000
     Order Belum Lunas: 2
     Umur Tertua: 45 hari
     Masalah: Piutang lewat 45 hari, Ada masalah data pembayaran
     Kontak: 08123456789
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
};

/**
 * EXAMPLE 4: Get system health status
 */
export const exampleSystemHealthStatus = async () => {
  const health = await getSystemHealthStatus();

  if (health.success) {
    console.log("🏥 STATUS KESEHATAN SISTEM");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Status: ${health.status}`);
    console.log(`Score: ${health.score}/100`);
    console.log(`${health.message}`);
    console.log("");
    console.log("PEMERIKSAAN:");

    health.healthChecks.forEach((check, i) => {
      const icon =
        check.status === "HEALTHY"
          ? "✅"
          : check.status === "WARNING"
            ? "⚠️"
            : "🚨";
      console.log(`\n${i + 1}. ${icon} ${check.check}`);
      console.log(`   ${check.message}`);
      if (check.impact) {
        console.log(`   Dampak: ${check.impact}`);
      }
    });

    console.log("");
    console.log(`💡 Rekomendasi: ${health.recommendation}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /*
  Output:
  🏥 STATUS KESEHATAN SISTEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Status: WARNING
  Score: 75/100
  ⚠️ Perlu perhatian

  PEMERIKSAAN:

  1. ✅ Data Pembayaran
     Data pembayaran konsisten

  2. ⚠️ Piutang
     15.0% piutang lewat tempo
     Dampak: Perlu follow up customer

  3. ✅ Aktivitas Pembayaran
     Pola pembayaran normal

  💡 Rekomendasi: Fokus pada area yang bermasalah
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  */
};

/**
 * EXAMPLE 5: Complete dashboard integration
 */
export const exampleCompleteDashboard = async () => {
  console.log("📱 OWNER DASHBOARD - COMPLETE VIEW");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Daily snapshot
  const snapshot = await getOwnerDailySnapshot();
  if (snapshot.success) {
    console.log("📊 RINGKASAN HARI INI");
    console.log(snapshot.summary.message);
    console.log(`Cashflow: Rp ${snapshot.today.netCashflow.toLocaleString()}`);
    console.log(
      `Piutang Total: Rp ${snapshot.receivables.totalOutstanding.toLocaleString()}\n`,
    );
  }

  // 2. System health
  const health = await getSystemHealthStatus();
  if (health.success) {
    console.log("🏥 KESEHATAN SISTEM");
    console.log(`${health.message} (${health.score}/100)\n`);
  }

  // 3. Top risky orders
  const riskyOrders = await getTopRiskyOrders(3);
  if (riskyOrders.length > 0) {
    console.log("🚨 TOP 3 ORDER PERLU PERHATIAN:");
    riskyOrders.forEach((order, i) => {
      console.log(
        `  ${i + 1}. ${order.orderNumber} - Rp ${order.remainingAmount.toLocaleString()}`,
      );
      console.log(`     ${order.riskReason}`);
    });
    console.log("");
  }

  // 4. Customer risk
  const customerRisk = await getCustomerRiskSummary();
  if (customerRisk.success && customerRisk.summary.highRiskCount > 0) {
    console.log(
      `👥 ${customerRisk.summary.highRiskCount} customer berisiko tinggi\n`,
    );
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 6: Action-oriented report
 */
export const exampleActionReport = async () => {
  console.log("📋 LAPORAN TINDAKAN YANG DIPERLUKAN");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const snapshot = await getOwnerDailySnapshot();
  const riskyOrders = await getTopRiskyOrders(10);

  // Categorize actions
  const urgentActions = [];
  const normalActions = [];

  riskyOrders.forEach((order) => {
    const action = {
      order: order.orderNumber,
      customer: order.customerName,
      phone: order.customerPhone,
      amount: order.remainingAmount,
      action: order.recommendedAction,
    };

    if (order.riskScore >= 50) {
      urgentActions.push(action);
    } else {
      normalActions.push(action);
    }
  });

  if (urgentActions.length > 0) {
    console.log("🚨 URGENT (Hari Ini):");
    urgentActions.forEach((action, i) => {
      console.log(`${i + 1}. ${action.customer} (${action.order})`);
      console.log(`   Tagihan: Rp ${action.amount.toLocaleString()}`);
      console.log(`   Tindakan: ${action.action}`);
      console.log(`   Kontak: ${action.phone || "-"}\n`);
    });
  }

  if (normalActions.length > 0) {
    console.log("⏰ MINGGU INI:");
    normalActions.forEach((action, i) => {
      console.log(
        `${i + 1}. ${action.customer} - Rp ${action.amount.toLocaleString()}`,
      );
      console.log(`   ${action.action}\n`);
    });
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

// Export all examples
export default {
  exampleDailySnapshot,
  exampleTopRiskyOrders,
  exampleCustomerRiskSummary,
  exampleSystemHealthStatus,
  exampleCompleteDashboard,
  exampleActionReport,
};
