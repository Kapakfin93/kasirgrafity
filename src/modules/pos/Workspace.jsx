import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print"; // <--- 1. IMPORT PENTING
import { useTransaction, TRANSACTION_STAGES } from "../../hooks/useTransaction";
import { useOrderStore } from "../../stores/useOrderStore";
import { useProductStore } from "../../stores/useProductStore"; // ✅ NEW
import { useAuth } from "../../context/AuthContext";
import { useCS } from "../../context/CSContext";
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
    productionPriority,
    setProductionPriority,
    // Discount
    discount,
    setDiscount,
    isInitialized, // ✅ Guard for Race Condition
  } = useTransaction();

  const { createOrder } = useOrderStore();
  const { profile } = useAuth();
  const { csName, locked, setCSName, lock, unlock } = useCS();

  // CS Name Error State
  const [csNameError, setCsNameError] = useState("");

  // ✅ DYNAMIC SHORTCUT: Tarik produk Jasa Desain secara spesifik
  const designProduct = useProductStore((state) => {
    const customCat = state.categories.find((c) => c.id === "CUSTOM_SERVICES");
    return customCat?.products?.find((p) => p.id === "master_jasa_desain");
  });



  // Handle Incoming Web Order (Safe-Mount Pattern)
  useEffect(() => {
    // ATURAN 1 (SAFE-MOUNT): Tunggu sampai master data produk siap
    if (!isInitialized) return;

    // 1. Periksa Loker (sessionStorage)
    const rawData = sessionStorage.getItem("pendingWebOrder");
    if (rawData) {
      try {
        const { cartItem, customer } = JSON.parse(rawData);
        console.log("📥 Receiving Burned Web Order Payload:", cartItem);

        // A. Add Item to Cart
        if (cartItem) {
          addItemToCart(cartItem);
        }

        // B. Set Customer
        if (customer) {
          updateCustomerSnapshot({
            name: customer.name || "",
            whatsapp: customer.phone || "",
            phone: customer.phone || "",
          });
        }

        // C. Bakar Kunci Loker (Self-Cleaning)
        sessionStorage.removeItem("pendingWebOrder");
      } catch (err) {
        console.error("❌ Failed to parse web order:", err);
        sessionStorage.removeItem("pendingWebOrder");
      }
    }
  }, [isInitialized, addItemToCart, updateCustomerSnapshot]); // ✅ Re-run ONLY when initialized


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

  // === JEMBATAN SYNC: Update Nomor Struk Otomatis ===
  // Ambil data terbaru dari Zustand
  const ordersList = useOrderStore((state) => state.orders);

  // Pantau jika status nomor order berubah dari LOCAL- ke ORD- hasil background sync
  useEffect(() => {
    if (!lastOrder?.id) return;
    const updatedOrder = ordersList.find((o) => o.id === lastOrder.id);
    if (
      updatedOrder &&
      updatedOrder.orderNumber?.startsWith("ORD-") &&
      lastOrder.orderNumber !== updatedOrder.orderNumber
    ) {
      setLastOrder(updatedOrder);
      console.log(
        "🔄 [RECEIPT BRIDGE] Nomor struck ter-update jadi:",
        updatedOrder.orderNumber,
      );
    }
  }, [ordersList, lastOrder?.id]);
  // ===============================================

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [gridMode, setGridMode] = useState("normal");
  const [isTempo, setIsTempo] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Validate CS Name
  const validateCsName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return "Nama CS wajib diisi";
    if (trimmed.length < 2) return "Nama CS minimal 2 karakter";
    if (/^\d+$/.test(trimmed)) return "Nama CS tidak boleh hanya angka";
    if (trimmed.length > 20) return "Nama CS maksimal 20 karakter";
    return "";
  };

  const handleCsNameChange = (e) => {
    const value = e.target.value;
    setCSName(value);
    const error = validateCsName(value);
    setCsNameError(error);
  };

  const handleLockToggle = () => {
    if (locked) {
      unlock();
    } else {
      const error = validateCsName(csName);
      if (error) {
        setCsNameError(error);
        alert(`Tidak bisa lock: ${error}`);
        return;
      }
      lock();
    }
  };

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    console.log("=== PROSES PEMBAYARAN BUTTON CLICKED ===");

    // Safe CS name handling
    const safeCSName = (csName || "").trim();

    // Validate CS name before proceeding
    const csError = validateCsName(safeCSName);
    if (csError) {
      setCsNameError(csError);
      alert(`Tidak bisa checkout: ${csError}`);
      return;
    }

    // 🔥 SECURITY LOCK: Prevent checkout if name is not locked
    if (!locked) {
      alert(
        "⚠️ AKSES DITOLAK: Harap klik tombol GEMBOK (🔒) untuk mengunci Nama CS sebelum melakukan pembayaran.",
      );
      return;
    }

    try {
      const success = confirmPayment(isTempo);
      if (!success) return;

      // Use CS name from context
      const csUser = { name: safeCSName };
      const order = await finalizeOrder(createOrder, csUser, isTempo);
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
    setCsNameError("");
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
  const safeCSName = (csName || "").trim();
  const currentCalculation = calculateTotal();

  const receiptData = lastOrder || {
    orderNumber: "PREVIEW / DRAFT",
    customerName: customerSnapshot?.name || "Pelanggan Umum",
    receivedBy: safeCSName || "CS",
    customerPhone: customerSnapshot?.phone || "-",
    items: items,
    totalAmount: currentCalculation.itemsSubtotal || 0,
    discountAmount: discount || 0,
    finalAmount: currentCalculation.finalAmount || 0,
    meta: {
      production_service: {
        fee: currentCalculation.serviceFee || 0,
        label: "Layanan (Preview)",
      },
    },
    paidAmount: paymentState.amountPaid || 0,
    remainingAmount:
      (currentCalculation.finalAmount || 0) - (paymentState.amountPaid || 0),
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

        {/* CS Name Input Field with Lock/Unlock */}
        {!isLocked && (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              border: csNameError
                ? "1px solid rgba(239, 68, 68, 0.5)"
                : locked
                  ? "1px solid rgba(34, 197, 94, 0.5)"
                  : "1px solid rgba(6, 182, 212, 0.2)",
              borderRadius: "12px",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start", // Group tightly
                alignItems: "center",
                marginBottom: "6px",
                gap: "10px", // Visual separation
              }}
            >
              <label
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                👤 Nama CS (Wajib)
              </label>
              <button
                onClick={handleLockToggle}
                style={{
                  background: locked
                    ? "rgba(34, 197, 94, 0.2)"
                    : "rgba(100, 116, 139, 0.2)",
                  border: locked
                    ? "1px solid rgba(34, 197, 94, 0.5)"
                    : "1px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  color: locked ? "#22c55e" : "#94a3b8",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
                title={
                  locked
                    ? "Unlock untuk ubah CS"
                    : "Lock CS untuk semua transaksi"
                }
              >
                {locked ? "🔒 Locked" : "🔓 Unlock"}
              </button>
            </div>
            <input
              type="text"
              value={csName || ""}
              onChange={handleCsNameChange}
              placeholder="Masukkan nama CS..."
              disabled={locked}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: locked
                  ? "rgba(30, 41, 59, 0.5)"
                  : "rgba(30, 41, 59, 0.8)",
                border: csNameError
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: locked ? "#22c55e" : "white",
                fontSize: "14px",
                outline: "none",
                transition: "all 0.2s",
                cursor: locked ? "not-allowed" : "text",
              }}
              onFocus={(e) => {
                if (!locked) {
                  e.target.style.borderColor = "rgba(6, 182, 212, 0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(6, 182, 212, 0.1)";
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = csNameError
                  ? "rgba(239, 68, 68, 0.5)"
                  : "rgba(71, 85, 105, 0.5)";
                e.target.style.boxShadow = "none";
              }}
            />
            {csNameError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "11px",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ⚠️ {csNameError}
              </div>
            )}
            {locked && csName && (
              <div
                style={{
                  color: "#22c55e",
                  fontSize: "11px",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ✓ CS terkunci - semua transaksi pakai nama ini
              </div>
            )}
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
                // OLD: Fixed Columns based on mode
                // gridTemplateColumns: gridMode === "compact" ? "repeat(4, 1fr)" ...

                // NEW: Responsive Auto-Fill based on Min-Width
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  gridMode === "compact"
                    ? "180px"
                    : gridMode === "large"
                      ? "320px"
                      : "240px"
                }, 1fr))`,
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
        onAddItem={addItemToCart}
        designProduct={designProduct} // ✅ NEW: Dynamic Source of Truth
        items={items}
        removeItem={removeItem}
        totalAmount={calculateTotal()}
        paymentState={paymentState}
        isLocked={isLocked}
        onPrint={handleThermalPrint}
        onReset={handleNewTransaction}
        customerSnapshot={customerSnapshot}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        onLoadDraft={(draft) => {
          console.log("📂 LOAD DRAFT TRIGGERED:", draft);
          // 1. Reset Form
          resetTransaction();

          // 2. Hydrate Customer
          if (draft.customer_name) {
            updateCustomerSnapshot({
              name: draft.customer_name,
              whatsapp: draft.customer_phone || "",
              phone: draft.customer_phone || "",
            });
          }

          // 3. Hydrate Items (Sequential Restore)
          // FIX: Handle structure both direct items (legacy) and items_json (POS V2)
          const itemsToLoad = draft.items || draft.items_json?.items || [];

          if (Array.isArray(itemsToLoad)) {
            // Small delay to ensure reset state is processed if needed,
            // but usually callback updates are queue-safe.
            // We map items to ensure they match 'preConfiguredItem' expectation
            itemsToLoad.forEach((item) => {
              // Mapping EKSPLISIT (Tanpa Spread) untuk keamanan maksimal
              const restoreItem = {
                // 1. Mandatory Object Structure (Pemicu "New Structure" di useTransaction)
                product: {
                  id: item.productId || item.product_id,
                  name: item.productName || item.product_name || item.name,
                  price: item.unitPrice || item.price || 0,
                },

                // 2. Core Quantity & Price Bypass
                qty: item.qty || 1,
                finalTotal: item.totalPrice > 0 ? item.totalPrice : undefined, // Guard per request
                pricingSnapshot: item.pricingSnapshot || null,

                // 3. Configuration / Specs
                dimensions: item.dimensions || {},
                finishings: item.finishings || [], // Default empty array
                specs: item.specs || null,
                pricingType: item.pricingType || "MANUAL", // Default MANUAL

                // 4. Metadata & Notes
                notes: item.notes || item.selected_details?.notes || "",
                selected_details: item.selected_details || null,
                detail_options: item.detail_options || null,

                // 5. Advanced Financials
                revenue_print: item.revenue_print || 0,
                revenue_finish: item.revenue_finish || 0,
              };

              addItemToCart(restoreItem);
            });
          }

          // 4. Feedback
          // alert("✅ Draft dimuat!"); // Optional, maybe too noisy
        }}
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
        productionPriority={productionPriority}
        setProductionPriority={setProductionPriority}
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
      {/* FIX: Gunakan visibility hidden & fixed position agar ref tetap terbaca oleh react-to-print */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <ReceiptTemplate ref={componentRef} order={receiptData} />
      </div>
    </div>
  );
}
