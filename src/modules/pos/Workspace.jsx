import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print"; // <--- 1. IMPORT PENTING
import { useTransaction, TRANSACTION_STAGES } from "../../hooks/useTransaction";
import { useOrderStore } from "../../stores/useOrderStore";
import { useAuth } from "../../context/AuthContext";
import { CustomerSelector } from "./CustomerSelector";
import { ReceiptSection } from "./ReceiptSection";
import { PaymentModal } from "./PaymentModal";
import { NotaPreview } from "./NotaPreview";
import ProductConfigModal from "./ProductConfigModal";
import ProductCard from "./ProductCard";
import { ReceiptTemplate } from "./ReceiptTemplate"; // <--- 2. IMPORT TEMPLATE STRUK

/**
 * Workspace - Modern POS Interface
 * Clean product grid + modal configuration
 */
export function Workspace() {
  const {
    categories,
    currentCategory,
    selectCategory,
    items,
    addItemToCart,
    removeItem,
    calculateTotal,
    paymentState,
    updatePaymentState,
    confirmPayment,
    finalizeOrder,
    customerSnapshot,
    updateCustomerSnapshot,
    transactionStage,
    setTransactionStage,
    resetTransaction,
    calculateItemPrice,
    // Priority System
    targetDate,
    setTargetDate,
    setPriorityStandard,
    setPriorityExpress,
    setPriorityUrgent,
    // Discount
    discount,
    setDiscount,
  } = useTransaction();

  const { createOrder } = useOrderStore();
  const { profile } = useAuth();

  // Web Order Prefill State
  const [webOrderPrefill, setWebOrderPrefill] = useState(null);

  // Read prefill from sessionStorage on mount
  useEffect(() => {
    try {
      const prefillData = sessionStorage.getItem("webOrderPrefill");
      if (prefillData) {
        const parsed = JSON.parse(prefillData);

        // Check if stale (older than 5 minutes)
        const age = Date.now() - (parsed.timestamp || 0);
        if (age > 5 * 60 * 1000) {
          sessionStorage.removeItem("webOrderPrefill");
          return;
        }

        // Set prefill state
        setWebOrderPrefill(parsed);

        // Auto-fill customer data
        if (parsed.customerName || parsed.customerPhone) {
          updateCustomerSnapshot({
            name: parsed.customerName || "",
            whatsapp: parsed.customerPhone || "",
            email: parsed.customerSnapshot?.email || "",
          });
        }

        // Clear sessionStorage after reading
        sessionStorage.removeItem("webOrderPrefill");
      }
    } catch (error) {
      console.error("Failed to read prefill:", error);
      sessionStorage.removeItem("webOrderPrefill");
    }
  }, []);

  // --- SETUP PRINTER THERMAL ---
  const componentRef = useRef(); // Pengait ke kertas struk

  const handleThermalPrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Struk_Belanja_Joglo",
    onAfterPrint: () => console.log("🖨️ Cetak Struk Berhasil!"),
  });
  // -----------------------------

  const [showNotaPreview, setShowNotaPreview] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [gridMode, setGridMode] = useState("normal");
  const [isTempo, setIsTempo] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    console.log("=== PROSES PEMBAYARAN BUTTON CLICKED ===");
    try {
      const success = confirmPayment(isTempo);
      if (!success) return;

      // Use admin profile for order
      const adminUser = profile ? { name: profile.name } : { name: "Admin" };
      const order = await finalizeOrder(createOrder, adminUser, isTempo);
      setLastOrder(order);
      setTransactionStage(TRANSACTION_STAGES.POST_PAYMENT);

      // OPSI: Langsung cetak struk otomatis setelah bayar?
      // Jika mau otomatis, uncomment baris di bawah ini:
      // setTimeout(() => handleThermalPrint(), 500);

      setShowNotaPreview(true); // Tetap buka preview nota besar (opsional)
      setIsTempo(false);
    } catch (error) {
      console.error("❌ FULL ERROR:", error);
      alert(`GAGAL PROSES PEMBAYARAN:\n\n${error.message}`);
    }
  };

  const handleCloseNota = () => setShowNotaPreview(false);

  const handleNewTransaction = () => {
    setShowNotaPreview(false);
    setLastOrder(null);
    resetTransaction();
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleAddFromModal = (itemData) => {
    addItemToCart(itemData);
    setSelectedProduct(null);
  };

  const isLocked = transactionStage === TRANSACTION_STAGES.POST_PAYMENT;

  // DATA UNTUK STRUK (Bisa dari order terakhir ATAU keranjang aktif)
  const receiptData = lastOrder || {
    orderNumber: "DRAFT", // Belum ada nomor
    customerName: customerSnapshot?.name || "Umum",
    receivedBy: profile?.name || "Admin",
    items: items,
    totalAmount: calculateTotal(),
    discountAmount: discount || 0,
    paidAmount: paymentState.amountPaid || 0,
    remainingAmount: calculateTotal() - (paymentState.amountPaid || 0),
    finalAmount: calculateTotal(),
  };

  const getModeButton = (mode) => ({
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    background:
      gridMode === mode
        ? "linear-gradient(135deg, #06b6d4, #3b82f6)"
        : "transparent",
    color: gridMode === mode ? "white" : "#64748b",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow: gridMode === mode ? "0 0 12px rgba(6, 182, 212, 0.4)" : "none",
  });

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#020617",
        gap: "16px",
        padding: "16px",
      }}
    >
      {/* Left Panel - Clean & Full */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            borderBottom: "1px solid rgba(6, 182, 212, 0.2)",
            background: "rgba(15, 23, 42, 0.9)",
            borderRadius: "12px",
          }}
        >
          <h1
            className="neon-header-dramatic"
            style={{
              fontSize: "26px",
              fontWeight: "900",
              background:
                "linear-gradient(90deg, #06b6d4, #a78bfa, #3b82f6, #06b6d4)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "2px",
              margin: 0,
              animation:
                "neonHeartbeat 3s ease-in-out infinite, neonColorShift 6s ease-in-out infinite",
              filter: "drop-shadow(0 0 20px rgba(6, 182, 212, 0.8))",
            }}
          >
            ⚡ JOGLO PRINTING
          </h1>
          {profile && (
            <div
              style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}
            >
              👤 {profile.name}
            </div>
          )}
        </div>

        {/* Web Order Banner */}
        {webOrderPrefill && !isLocked && (
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flex: 1,
              }}
            >
              <span style={{ fontSize: "20px" }}>🌐</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#3b82f6",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Order dari Web (Belum Disimpan)
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "11px",
                    marginTop: "2px",
                  }}
                >
                  💡 Harga: Rp{" "}
                  {webOrderPrefill.suggestedAmount?.toLocaleString() || "-"}{" "}
                  (saran dari web)
                  {webOrderPrefill.fileRef && " • 📎 File tersedia"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setWebOrderPrefill(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px",
              }}
              title="Tutup banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* Customer Selector */}
        <CustomerSelector
          customerSnapshot={customerSnapshot}
          updateCustomerSnapshot={updateCustomerSnapshot}
          isLocked={isLocked}
        />

        {/* Toolbar: Categories + Grid Mode */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: "flex",
              flex: 1,
              flexWrap: "wrap",
              justifyContent: "center",
              gap: gridMode === "compact" ? "6px" : "8px",
              padding: "4px 0",
            }}
          >
            {categories.map((cat) => {
              const isActive = currentCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  disabled={isLocked}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "10px",
                    border: `2px solid ${isActive ? "#06b6d4" : "#334155"}`,
                    background: isActive
                      ? "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
                      : "transparent",
                    color: isActive ? "#0f172a" : "#94a3b8",
                    fontSize: "13px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    transform: isActive ? "scale(1.02)" : "scale(1)",
                    boxShadow: isActive
                      ? "0 0 20px rgba(6, 182, 212, 0.5)"
                      : "none",
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Grid Mode Toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "10px",
              padding: "3px",
              border: "1px solid rgba(100, 116, 139, 0.2)",
            }}
          >
            <button
              onClick={() => setGridMode("compact")}
              style={getModeButton("compact")}
              title="Padat"
            >
              🖥️
            </button>
            <button
              onClick={() => setGridMode("normal")}
              style={getModeButton("normal")}
              title="Normal"
            >
              💻
            </button>
            <button
              onClick={() => setGridMode("large")}
              style={getModeButton("large")}
              title="Besar"
            >
              📱
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "8px",
            background: "rgba(15, 23, 42, 0.3)",
            borderRadius: "12px",
          }}
        >
          {!currentCategory || categories.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#64748b",
              }}
            >
              <span style={{ fontSize: "48px", opacity: 0.2 }}>📦</span>
              <p>
                {categories.length === 0 ? "⏳ Memuat..." : "Pilih kategori"}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  gridMode === "compact"
                    ? "repeat(4, 1fr)"
                    : gridMode === "large"
                      ? "repeat(2, 1fr)"
                      : "repeat(3, 1fr)",
                gap: "12px",
                padding: "4px",
              }}
            >
              {currentCategory.products?.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onClick={(product) =>
                    !isLocked && handleProductClick(product)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Receipt */}
      <ReceiptSection
        items={items}
        removeItem={removeItem}
        totalAmount={calculateTotal()}
        paymentState={paymentState}
        isLocked={isLocked}
        onPrint={handleThermalPrint} // <--- SEKARANG TOMBOL PRINT DI PANEL KANAN AKAN MENCETAK STRUK
        onReset={handleNewTransaction}
        customerSnapshot={customerSnapshot}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={calculateTotal()}
        onConfirmPayment={() => {
          setIsPaymentModalOpen(false);
          handleConfirmPayment();
        }}
        discount={discount}
        setDiscount={setDiscount}
        paymentState={paymentState}
        updatePayment={updatePaymentState}
        customerName={customerSnapshot?.name}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        setPriorityStandard={setPriorityStandard}
        setPriorityExpress={setPriorityExpress}
        setPriorityUrgent={setPriorityUrgent}
        isTempo={isTempo}
        setIsTempo={setIsTempo}
        items={items}
      />

      {/* Product Config Modal */}
      <ProductConfigModal
        key={selectedProduct?.id || "closed"}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        category={currentCategory}
        onAddToCart={handleAddFromModal}
        calculatePreview={calculateItemPrice}
      />

      {/* Nota Preview (Modal Besar) */}
      {showNotaPreview && (items.length > 0 || lastOrder) && (
        <NotaPreview
          items={lastOrder?.items || items}
          totalAmount={lastOrder?.totalAmount || calculateTotal()}
          paymentState={paymentState}
          order={
            lastOrder || {
              orderNumber: "TMP-PREVIEW",
              customerSnapshot: customerSnapshot,
            }
          }
          onClose={handleCloseNota}
          onPrint={() => window.print()}
          onReset={handleNewTransaction}
        />
      )}

      {/* --- KOMPONEN RAHASIA (STRUK THERMAL) --- */}
      {/* Ini tidak terlihat di layar, tapi inilah yang dicetak oleh printer */}
      <div style={{ display: "none" }}>
        <ReceiptTemplate ref={componentRef} order={receiptData} />
      </div>
    </div>
  );
}
