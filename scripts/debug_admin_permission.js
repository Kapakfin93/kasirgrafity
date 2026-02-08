// 🧪 SIMULASI: Test Permission Logic (Admin View)

// Mock Data (based on useAuthStore.js logic)
const OWNER = { role: "owner", permissions: [] };
const ADMIN = { role: "admin", permissions: ["view_orders", "transaction"] }; // Skenario: Lupa kasih 'update_status'
const SUPER_ADMIN = {
  role: "admin",
  permissions: ["view_orders", "transaction", "update_status"],
};

const hasPermission = (user, permission) => {
  if (user.role === "owner") return true;
  return (user.permissions || []).includes(permission);
};

const canUpdateOrderStatus = (user) => {
  // Logic from usePermissions.js
  return hasPermission(user, "update_status") || user.role === "owner";
};

console.log("👑 Owner can update?", canUpdateOrderStatus(OWNER));
console.log(
  "👮 Admin (No Update Perm) can update?",
  canUpdateOrderStatus(ADMIN),
);
console.log("🦸 Super Admin can update?", canUpdateOrderStatus(SUPER_ADMIN));

if (!canUpdateOrderStatus(ADMIN)) {
  console.log(
    "\n🚨 TEMUAN: Admin biasa GAGAL karena tidak punya permission 'update_status'.",
  );
  console.log("   Tombol 'PROSES SPK' akan HILANG.");
}
