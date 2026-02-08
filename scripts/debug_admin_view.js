// 🧪 SIMULASI: Debug Payload Realtime (Admin View)
// Tujuan: Melihat apakah 'productionStatus' hilang saat diterima via Realtime.

const mockPayload = {
  new: {
    id: "ord_123",
    order_number: "ORD-001",
    customer_name: "Budi",
    total_amount: 100000,
    paid_amount: 100000,
    payment_status: "PAID",
    // ⚠️ SKENARIO TERSANGKA: production_status KOSONG/NULL
    production_status: null,
    created_at: new Date().toISOString(),
  },
};

// Logika Normalisasi (Kopian dari useOrderStore.js)
const internalNormalizeOrder = (dbOrder) => {
  return {
    id: dbOrder.id,
    productionStatus:
      dbOrder.production_status || dbOrder.productionStatus || "PENDING", // <-- PERHATIKAN INI
    paymentStatus: dbOrder.payment_status || "UNPAID",
  };
};

const processed = internalNormalizeOrder(mockPayload.new);

console.log("📥 Payload Mentah:", mockPayload.new);
console.log("🔄 Hasil Normalisasi:", processed);

if (processed.productionStatus === "PENDING") {
  console.log("✅ AMAN: Default ke PENDING jika null.");
} else {
  console.log("❌ BAHAYA: Status aneh:", processed.productionStatus);
}

// SKENARIO 2: production_status ada tapi typo
const mockPayloadTypo = {
  new: {
    ...mockPayload.new,
    production_status: "pending", // Huruf kecil?
  },
};

const processedTypo = internalNormalizeOrder(mockPayloadTypo.new);
console.log("\n🧪 Test Case Typo (lowercase):", processedTypo.productionStatus);

// SKENARIO 3: Perbedaan Logic Permission
// Jika Admin load data, apakah dia punya 'canUpdateOrderStatus'?
// (Simulasi logic di OrderCard)
const canUpdateOrderStatus = true; // Admin pasti true
const mainAction = (status) => {
  if (status === "PENDING") return "PROSES SPK";
  return null;
};

console.log("\n🔘 Tombol Admin:", mainAction(processed.productionStatus));
