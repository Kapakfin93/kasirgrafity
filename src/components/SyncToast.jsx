import { useLocation } from "react-router-dom";
import { useSyncFeedbackStore } from "../stores/useSyncFeedbackStore";
import { OrderSyncService } from "../services/OrderSyncService";
import { formatRupiah } from "../core/formatters";

export function SyncToast() {
  const location = useLocation();
  const { failedOrders, lastSuccess, dismissOrder, clearAll } =
    useSyncFeedbackStore();

  // Hanya tampil di halaman /orders — jangan ganggu kasir di /pos
  if (!location.pathname.includes("/orders")) return null;

  // Tidak ada yang perlu ditampilkan
  if (failedOrders.length === 0 && !lastSuccess) return null;

  const handleRetryAll = () => {
    OrderSyncService.syncOfflineOrders();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "360px",
      }}
    >
      {/* Toast sukses — auto-dismiss via store */}
      {lastSuccess && (
        <div
          style={{
            background: "#14532d",
            border: "1px solid #22c55e",
            borderRadius: "12px",
            padding: "12px 16px",
            color: "white",
            fontSize: "13px",
          }}
        >
          ✅ Order {lastSuccess.orderNumber} tersimpan ke server
        </div>
      )}

      {/* Toast gagal — batch jika lebih dari 1 */}
      {failedOrders.length > 0 && (
        <div
          style={{
            background: "#1c1917",
            border: "1px solid #f59e0b",
            borderRadius: "12px",
            padding: "14px 16px",
            color: "white",
            fontSize: "13px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
            ⚠️{" "}
            {failedOrders.length === 1
              ? `Order ${failedOrders[0].orderNumber} belum tersimpan`
              : `${failedOrders.length} order belum tersimpan ke server`}
          </div>

          {/* Detail order — tampil jika hanya 1 */}
          {failedOrders.length === 1 && (
            <div
              style={{
                color: "#d1d5db",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            >
              {failedOrders[0].customerName} —{" "}
              {formatRupiah(failedOrders[0].totalAmount)}
              <br />
              <span style={{ color: "#9ca3af" }}>
                Data aman di perangkat ini
              </span>
            </div>
          )}

          {/* Detail batch — tampil jika lebih dari 1 */}
          {failedOrders.length > 1 && (
            <div
              style={{
                color: "#9ca3af",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            >
              Data aman di perangkat — belum tersync ke server
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleRetryAll}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "8px",
                border: "none",
                background: "#f59e0b",
                color: "#1c1917",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🔄 Coba Sync Ulang
            </button>
            <button
              onClick={
                failedOrders.length === 1
                  ? () => dismissOrder(failedOrders[0].id)
                  : clearAll
              }
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #4b5563",
                background: "transparent",
                color: "#9ca3af",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✕ Abaikan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
