// 🧪 SIMULASI: Realtime Listener Safety Test
// Tujuan: Memastikan penambahan listener tidak merusak state yang ada.

const mockStore = {
  orders: [
    { id: 1, status: "PENDING", note: "Order Lama" },
    { id: 2, status: "PENDING", note: "Order Lama" },
  ],

  // Fungsi yang akan kita inject (Simulasi)
  handleRealtimeEvent: (payload) => {
    console.log(`\n📡 EVENT DITERIMA: ${payload.eventType}`);

    if (payload.eventType === "INSERT") {
      // Skenario: Admin tambah order baru
      const newOrder = payload.new;
      mockStore.orders = [newOrder, ...mockStore.orders];
      console.log(
        `   ✅ INSERT SUKSES: Order ${newOrder.id} masuk ke paling atas.`,
      );
    }

    if (payload.eventType === "UPDATE") {
      // Skenario: Admin ubah status jadi "DONE"
      const updatedOrder = payload.new;
      mockStore.orders = mockStore.orders.map((o) =>
        o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o,
      );
      console.log(
        `   ✅ UPDATE SUKSES: Order ${updatedOrder.id} status berubah jadi ${updatedOrder.status}.`,
      );
    }
  },
};

console.log("📊 STATE AWAL:", JSON.stringify(mockStore.orders));

// 1. Simulasi INSERT (Admin tambah order)
mockStore.handleRealtimeEvent({
  eventType: "INSERT",
  new: { id: 3, status: "PENDING", note: "Order Baru dari Admin" },
});

// 2. Simulasi UPDATE (Admin selesaikan order)
mockStore.handleRealtimeEvent({
  eventType: "UPDATE",
  new: { id: 1, status: "DONE", note: "Order Lama (Selesai)" },
});

console.log(
  "\n📊 STATE AKHIR (Harapan Owner):",
  JSON.stringify(mockStore.orders, null, 2),
);

// Verifikasi Safety
if (mockStore.orders.length === 3 && mockStore.orders[2].status === "DONE") {
  // Note: index 2 in result listing order logic (3, 2, 1) -> id 1 is at index 2?
  // Wait, [3, 1, 2] -> id 1 is index 1.
  // Let's check logic: [New(3), Old(1), Old(2)]
  // Map updates Old(1) -> DONE.
}

const finalId1 = mockStore.orders.find((o) => o.id === 1);
const finalId3 = mockStore.orders.find((o) => o.id === 3);

if (finalId1.status === "DONE" && finalId3) {
  console.log(
    "\n✅ KESIMPULAN: AMAN. Logika Realtime tidak merusak data lain.",
  );
} else {
  console.error("\n❌ BAHAYA: Data rusak.");
}
