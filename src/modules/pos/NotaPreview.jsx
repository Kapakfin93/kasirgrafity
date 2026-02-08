/**
 * NotaPreview Component (V2 - HUMANIZED & OMNIVORE)
 * Updates:
 * - Added 'humanizeActor' helper to fix "POS_WORKSPACE" on printed receipts.
 * - Ensures customer sees professional names, not system codes.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { formatRupiah } from "../../core/formatters";

// --- HELPER: PENERJEMAH BAHASA MANUSIA (Agar Nota Rapi) ---
const humanizeActor = (actorCode) => {
  if (!actorCode) return "Kasir"; // Default fallback
  const code = actorCode.toUpperCase();

  if (code.includes("POS_WORKSPACE")) return "Admin/Kasir";
  if (code.includes("ORDER_BOARD")) return "Tim Produksi";
  if (code.includes("OWNER")) return "Owner";
  if (code.includes("SYSTEM")) return "Sistem";

  // Jika nama orang asli (misal: "Alex"), kembalikan apa adanya
  return actorCode;
};

export const NotaPreview = React.forwardRef(
  (
    {
      order,
      onClose,
      onReset,
      autoPrint = false,
      type = "NOTA",
      paymentState, // Fallback for draft mode
    },
    externalRef,
  ) => {
    // --- 1. SMART DATA EXTRACTION (Logic Omnivore) ---
    const items = order?.items || [];

    // 💰 NOTA TOTALS DEBUG
    console.log("💰 NOTA TOTALS DEBUG:", {
      order_totalAmount: order?.totalAmount,
      order_total_amount: order?.total_amount,
      order_paidAmount: order?.paidAmount,
      order_paid_amount: order?.paid_amount,
      order_remainingAmount: order?.remainingAmount,
      order_remaining_amount: order?.remaining_amount,
      order_serviceFee: order?.serviceFee,
      order_meta_service_fee: order?.meta?.service_fee,
      order_discountAmount: order?.discountAmount,
      order_discount_amount: order?.discount_amount,
      items_length: order?.items?.length,
    });

    // Header Fallback
    const custName =
      order?.customerName || order?.customerSnapshot?.name || "Pelanggan Umum";
    const custWA =
      order?.customerPhone || order?.customerSnapshot?.whatsapp || "";

    // 🔥 PERBAIKAN DISINI: Gunakan Humanizer
    const rawCsName = order?.receivedBy || order?.received_by || "Kasir";
    const csName = humanizeActor(rawCsName);

    const orderNumber = order?.orderNumber || "DRAFT";

    // TOTALS (Read from order, jangan hitung ulang!)
    const itemsTotal = items.reduce((sum, item) => {
      return sum + (Number(item.subtotal) || Number(item.totalPrice) || 0);
    }, 0);

    const serviceFee = Number(
      order?.meta?.service_fee || order?.serviceFee || 0,
    );
    const discount = Number(
      order?.discountAmount || order?.discount_amount || 0,
    );

    // Grand total = dari database (authority)
    const grandTotal = Number(
      order?.totalAmount ||
        order?.total_amount ||
        itemsTotal + serviceFee - discount,
    );

    const paidAmount = Number(order?.paidAmount || order?.paid_amount || 0);
    const remainingAmount = Number(
      order?.remainingAmount ||
        order?.remaining_amount ||
        grandTotal - paidAmount,
    );

    // const safeTotal = rawTotal; // DEPRECATED
    const safeTotal = grandTotal;

    // RESTORED MISSING DEFINITIONS
    const statusText =
      order?.paymentStatus === "PAID" ? "LUNAS" : "BELUM LUNAS";
    const mode = order?.paymentMethod || paymentState?.mode || "TUNAI";

    // Legacy mapping for existing code compatibility
    const serviceLabel =
      order?.meta?.production_priority === "EXPRESS"
        ? "Biaya Express"
        : order?.meta?.production_priority === "URGENT"
          ? "Biaya Urgent"
          : "Biaya Layanan";

    // --- SPK LOGIC EXTRACTION ---
    const priorityLevel = order?.meta?.production_priority || "STANDARD"; // EXPRESS / STANDARD
    const orderDate = order?.createdAt ? new Date(order.createdAt) : new Date();

    // Format Waktu: "Sabtu, 25/01/2026 - 14:30 WIB"
    const formattedDate =
      orderDate.toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " WIB";

    // --- 2. REF MERGING LOGIC (PENTING UNTUK PRINT) ---
    const internalRef = useRef(null);

    // Gabungkan ref internal (untuk fitur share WA) dengan external (untuk print parent)
    useEffect(() => {
      if (!externalRef) return;
      if (typeof externalRef === "function") {
        externalRef(internalRef.current);
      } else {
        externalRef.current = internalRef.current;
      }
    }, [externalRef]);

    // --- 3. STATE & HANDLERS ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [showWatermark, setShowWatermark] = useState(false);
    const [printMode, setPrintMode] = useState(type); // Use type prop as initial

    // REF Element for overlay (outside click)
    // Unused sisaBayar removed
    // Unused overlayRef removed

    // === EVENT LISTENERS (Modal & Keys) ===
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      // Note: Click outside is handled via onClick on overlay
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [onClose]);

    // === AUTO PRINT LOGIC ===
    useEffect(() => {
      if (autoPrint) {
        setPrintMode(type);
        const timer = setTimeout(() => {
          globalThis.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [autoPrint, type]);

    // 1. Print Nota (Thermal Style - Via Iframe)
    const handlePrintNota = useCallback(() => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.zIndex = "9999";

      const style = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                }
                .print-wrapper {
                    width: 100%;
                    max-width: 80mm;
                    margin: 0;
                    padding: 5mm; 
                    box-sizing: border-box;
                }
                /* COPY STYLE DARI PREVIEW */
                .nota-header { text-align: center; margin-bottom: 10px; }
                .nota-header h1 { font-size: 14pt; font-weight: 900; margin: 0 0 5px 0; text-transform: uppercase; }
                .nota-header p { font-size: 9pt; margin: 2px 0; }
                .nota-divider { border-bottom: 1px dashed black; margin: 10px 0; height: 1px; width: 100%; }
                .nota-datetime { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 5px; }
                .nota-row { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 3px; }
                .nota-items { margin: 10px 0; }
                .nota-item { margin-bottom: 8px; }
                .nota-item-title { font-weight: bold; font-size: 10pt; }
                .nota-item-spec { font-size: 8pt; padding-left: 10px; font-style: italic; }
                .nota-item-price { display: flex; justify-content: space-between; font-size: 9pt; padding-left: 10px; }
                .nota-summary { margin-top: 10px; }
                .nota-total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 12pt; margin: 5px 0; border-top: 2px solid black; padding-top: 5px; }
                .nota-remaining { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; color: black; margin-top: 5px; }
                .nota-status-stempel {
                    border: 3px double black;
                    padding: 5px;
                    text-align: center;
                    font-weight: 900;
                    font-size: 14pt;
                    margin: 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                }
                .nota-footer { text-align: center; font-size: 9pt; margin-top: 20px; font-weight: bold; }
                .nota-watermark, .no-print { display: none !important; }
                @page { size: 80mm auto; margin: 0; }
            </style>
        `;

      const content = document.getElementById("printable-nota").innerHTML;

      iframe.srcdoc = `
            <html>
            <head><title>Cetak Nota - Joglo Print</title>${style}</head>
            <body>
                <div class="print-wrapper">${content}</div>
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 2000);
    }, []);

    // 3. Share Image (WA) dengan Watermark
    const handleShareImage = useCallback(async () => {
      if (!internalRef.current || isGenerating) return;
      setIsGenerating(true);
      setShowWatermark(true);

      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        const canvas = await html2canvas(internalRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        // Backup Manual Watermark
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.font = "bold 60px Arial";
        ctx.fillStyle = "#000000";
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("JOGLO PRINT", 0, 0);
        ctx.restore();

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `NOTA-${orderNumber}-${Date.now()}.png`;
        link.click();

        // Smart WA Share
        const formatWA = (number) => {
          if (!number) return "";
          let clean = number.replaceAll(/\D/g, "");
          if (clean.startsWith("0")) clean = "62" + clean.slice(1);
          if (!clean.startsWith("62")) clean = "62" + clean;
          return clean;
        };

        if (custWA) {
          const text = `Halo Kak *${custName}*,\n\nTerima kasih sudah order di *JOGLO PRINTING* 🎨\n\nBerikut kami lampirkan nota digital pesanan:\n📋 *${orderNumber}*\n\n💰 Total: ${formatRupiah(safeTotal)}\n📌 Status: ${statusText}\n\n_Gambar nota sudah didownload._\nMohon dicek kembali. Terima kasih! 🙏`;
          const waUrl = `https://wa.me/${formatWA(custWA)}?text=${encodeURIComponent(text)}`;
          setTimeout(() => window.open(waUrl, "_blank"), 500);
        } else {
          alert("✅ Gambar nota didownload!\n⚠️ No WA tidak tersedia.");
        }
      } catch (err) {
        console.error("Gagal generate image:", err);
        alert("Gagal membuat gambar.");
      } finally {
        setShowWatermark(false);
        setIsGenerating(false);
      }
    }, [
      isGenerating,
      orderNumber,
      custName,
      custWA,
      safeTotal,
      statusText,
      internalRef,
    ]);

    const showPrices = printMode === "NOTA";
    // --- 4. RENDER JSX ---
    const modalContent = (
      <div className="nota-preview-overlay" onClick={onClose}>
        <div
          className="nota-preview-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* AREA KERTAS NOTA */}
          <div
            className="nota-content"
            id="printable-nota"
            ref={internalRef} // <--- GUNAKAN INTERNAL REF
            style={{ position: "relative" }}
          >
            {/* Watermark */}
            {showWatermark && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-45deg)",
                  fontSize: "40px",
                  fontWeight: "bold",
                  color: "rgba(0, 0, 0, 0.08)",
                  pointerEvents: "none",
                  zIndex: 999,
                  whiteSpace: "nowrap",
                }}
              >
                JOGLO PRINT
              </div>
            )}

            {/* 🚨 SECURITY WATERMARK: CANCELLED ORDER */}
            {order?.productionStatus === "CANCELLED" && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-45deg)",
                  fontSize: "3.5rem",
                  fontWeight: "900",
                  color: "rgba(220, 38, 38, 0.3)",
                  border: "5px solid rgba(220, 38, 38, 0.3)",
                  padding: "20px 40px",
                  pointerEvents: "none",
                  zIndex: 50,
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                }}
              >
                DIBATALKAN
              </div>
            )}

            {/* HEADER SPK KHUSUS (Gantikan showUrgencyHeader yang lama) */}
            {printMode === "SPK" && (
              <div
                style={{
                  marginBottom: "20px",
                  borderBottom: "2px dashed black",
                  paddingBottom: "15px",
                }}
              >
                {/* 1. BANNER PRIORITAS (HEMAT TINTA) */}
                <div
                  style={{
                    border: "3px solid black",
                    background: "transparent", // Hemat Tinta
                    color: "black",
                    textAlign: "center",
                    padding: "10px",
                    marginBottom: "15px",
                    fontWeight: "900",
                    fontSize: "20px", // Lebih Besar
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  {priorityLevel === "STANDARD"
                    ? "📋 ANTRIAN STANDARD"
                    : priorityLevel === "URGENT"
                      ? "🔥 PRIORITY: URGENT"
                      : "⚡ PRIORITY: EXPRESS"}
                </div>

                {/* 2. JUDUL & JAM MASUK */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: "15px",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                      SURAT PERINTAH KERJA
                    </div>
                    <div style={{ fontSize: "10px" }}>No: {orderNumber}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px" }}>Masuk:</div>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                      {formattedDate}
                    </div>
                  </div>
                </div>

                {/* 3. DEADLINE DISPLAY (BESAR & JELAS) */}
                <div
                  style={{
                    border: "1px solid black",
                    padding: "10px",
                    borderRadius: "5px",
                    background: "#f9f9f9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                      CUSTOMER:
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                      {custName}
                    </span>
                  </div>
                  <div
                    style={{ borderTop: "1px solid #ccc", margin: "5px 0" }}
                  ></div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: priorityLevel !== "STANDARD" ? "red" : "black",
                      }}
                    >
                      DEADLINE:
                    </span>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "900",
                        textTransform: "uppercase",
                      }}
                    >
                      {order?.meta?.estimate_date
                        ? new Date(order.meta.estimate_date).toLocaleString(
                            "id-ID",
                            {
                              weekday: "long",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* HEADER NOTA BIASA (Kondisi Else) */}
            {printMode === "NOTA" && (
              <div className="nota-header">
                <h1
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    marginBottom: "6px",
                  }}
                >
                  JOGLO PRINTING
                </h1>
                <p style={{ fontSize: "11px" }}>
                  Jl. Diponegoro, Rw. 4, Jogoloyo
                </p>
                <p style={{ fontSize: "11px" }}>Demak, Jawa Tengah</p>
                <p style={{ fontSize: "11px" }}>Telp: 0813-9028-6826</p>
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  BUKA 24 JAM
                </p>
              </div>
            )}

            <div className="receipt-divider"></div>

            <div className="nota-datetime">
              <span>{new Date().toLocaleDateString("id-ID")}</span>
              <span>{orderNumber}</span>
            </div>

            {custName && (
              <div
                className="nota-row"
                style={{ fontWeight: "bold", marginBottom: "8px" }}
              >
                <span>Cust: {custName}</span>
                {custWA && <span>WA: {custWA}</span>}
              </div>
            )}

            {/* CS Name (HUMANIZED) */}
            <div className="nota-row" style={{ marginBottom: "8px" }}>
              <span>Kasir</span>
              <span>: {csName}</span>
            </div>

            <div className="receipt-divider"></div>

            {/* Items Loop */}
            <div className="nota-items">
              {items.map((item, idx) => {
                // 🕵️ FORENSIC LOG START
                console.group(
                  `🔍 AUDIT ITEM: ${item.product_name || "Unknown Product"}`,
                );
                console.log("1. RAW ITEM KEYS:", Object.keys(item)); // Apa saja yg dibawa?
                console.log("2. RAW DIMENSIONS:", item.dimensions); // Apakah Null?
                console.log("3. RAW SPECS:", item.specs); // Apakah ada di sini?
                console.log("4. RAW META:", item.meta); // Atau di sini?
                console.log("5. RAW SUBTOTAL:", item.subtotal); // 0 atau undefined?
                console.log("6. RAW PRICE & QTY:", item.price, item.quantity);
                // Cek Logika Ekstraksi (Simulasi)
                const checkVariant =
                  item.dimensions?.variant_info ||
                  item.specs?.variant_info ||
                  "❌ NOT FOUND";
                console.log("7. EXTRACTION CHECK (Variant):", checkVariant);
                console.groupEnd();
                // 🕵️ FORENSIC LOG END
                // 1. Logic Harga Satuan & Qty (STRICT: DB READ ONLY)
                const displayPrice = Number(
                  item.unit_price || item.unitPrice || item.price || 0,
                );
                // --- SURGICAL FIX START ---
                // Map incoming 'qty' to 'quantity'
                const quantity = item.quantity || item.qty || 0;
                const displayQty = Number(quantity);

                // Map incoming 'totalPrice' to 'subtotal'
                const subtotal =
                  item.subtotal ||
                  item.totalPrice ||
                  item.price * quantity ||
                  0;
                const displaySubtotal = Number(subtotal);
                // --- SURGICAL FIX END ---

                // 2. Ekstraksi Meta & Specs (USER REQUEST: SINGLE SOURCE OF TRUTH)
                // Ambil satu saja yang paling lengkap. ABAIKAN sumber lain.
                const finalSpecs = item.dimensions || item.specs || {};

                // Use finalSpecs as the authority
                const specs = finalSpecs;

                // 🔍 DEBUG: Log extracted specs
                console.log("📋 NOTA ITEM DEEP SEARCH:", {
                  productName: item.productName,
                  source_dimensions: item.dimensions,
                  extracted_variant_info: specs.variant_info,
                  extracted_finishings: specs.finishing_list?.length,
                  quantity,
                  subtotal,
                });

                // 3. Logic "Display Priority" (Mutually Exclusive)
                // USER REQUEST: PRIORITAS 1 > 2 > 3
                let finalDescription = "";

                // Prioritas 1: variant_info (from dimensions/specs)
                if (specs.variant_info) {
                  finalDescription = specs.variant_info;
                }
                // Prioritas 2: summary (from dimensions/specs)
                else if (specs.summary) {
                  finalDescription = specs.summary;
                }
                // Prioritas 3: Manual Inputs (Length x Width)
                else {
                  const inputs = specs.inputs || {};
                  const origSpecs = specs.original_specs || {};

                  let w = 0,
                    h = 0;
                  if (inputs.length && inputs.width) {
                    w = inputs.length;
                    h = inputs.width;
                  } else if (origSpecs.length && origSpecs.width) {
                    w = parseFloat(origSpecs.length);
                    h = parseFloat(origSpecs.width);
                  } else if (specs.length && specs.width) {
                    w = specs.length;
                    h = specs.width;
                  }

                  if (w > 0 && h > 0) {
                    finalDescription = `${w}m x ${h}m`;
                  } else if (specs.variantLabel) {
                    finalDescription = specs.variantLabel;
                  } else if (
                    item.description &&
                    item.description !== item.productName
                  ) {
                    finalDescription = item.description;
                  }
                }

                // 4. Finishing (Allowed Separate)
                const finishingList = specs.finishing_list || [];

                // 5. Notes & Booklet Info
                const notes = specs.note || specs.notes || item.notes || "";
                const sheets = specs.sheetsPerBook || 0;
                const printMode = specs.printModeLabel || "";

                const detailOpts = specs.detail_options || {};
                const showPrices = type !== "SPK";

                return (
                  <div key={item.id || idx} className="nota-item">
                    {/* Baris 1: Qty & Nama Produk */}
                    <div className="nota-item-title">
                      {displayQty}x {item.productName}
                    </div>

                    {/* Baris 2: Final Description (SINGLE SOURCE) */}
                    {finalDescription && (
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "500", // Agak tebal tapi tidak bold
                          color: "#333",
                          paddingLeft: "10px",
                        }}
                      >
                        {finalDescription}
                      </div>
                    )}

                    {/* BARIS KHUSUS BOOKLET: JUMLAH LEMBAR & WARNA */}
                    {(sheets > 0 || printMode) && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#444",
                          paddingLeft: "10px",
                        }}
                      >
                        📖 {sheets > 0 ? `${sheets} Lembar` : ""}{" "}
                        {printMode ? `(${printMode})` : ""}
                      </div>
                    )}

                    {/* Baris 5: Finishing List */}
                    {Array.isArray(finishingList) &&
                      finishingList.length > 0 && (
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            color: "#000",
                            paddingLeft: "10px",
                          }}
                        >
                          ✨ {finishingList.map((f) => f.name).join(", ")}
                        </div>
                      )}

                    {/* Baris 6: Catatan Item */}
                    {printMode === "SPK" && notes && (
                      <div
                        style={{
                          fontSize: "10px",
                          fontStyle: "italic",
                          color: "#000",
                          paddingLeft: "10px",
                          marginTop: "2px",
                          fontWeight: "bold",
                        }}
                      >
                        📝 Note: {notes}
                      </div>
                    )}

                    {/* Custom Inputs (SPK Only) */}
                    {printMode === "SPK" && detailOpts.custom_inputs && (
                      <div
                        style={{
                          fontSize: "9px",
                          fontFamily: "monospace",
                          background: "#eee",
                          padding: "4px",
                          margin: "4px 0 0 10px",
                        }}
                      >
                        <strong>DETAIL:</strong>
                        {Object.entries(detailOpts.custom_inputs).map(
                          ([k, v]) => (
                            <div key={k}>
                              {k}: {v}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {/* Baris Harga (STRICT: DB READ ONLY) */}
                    {showPrices && (
                      <div className="nota-item-price">
                        <span>@ {formatRupiah(displayPrice)}</span>
                        <span>{formatRupiah(displaySubtotal)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Service Fee Render */}

            {/* Footer Summary (FIXED DISPLAY ORDER) */}
            {showPrices ? (
              <div className="nota-summary" style={{ marginTop: "10px" }}>
                {/* Subtotal produk */}
                <div className="nota-row">
                  <span>Subtotal Produk</span>
                  <span>{formatRupiah(itemsTotal)}</span>
                </div>

                {/* Service fee (jika ada) */}
                {serviceFee > 0 && (
                  <div className="nota-row">
                    <span>{serviceLabel}</span>
                    <span>{formatRupiah(serviceFee)}</span>
                  </div>
                )}

                {/* Diskon (jika ada) */}
                {discount > 0 && (
                  <div className="nota-row" style={{ color: "red" }}>
                    <span>DISKON / POTONGAN</span>
                    <span>- {formatRupiah(discount)}</span>
                  </div>
                )}

                <div className="nota-total-row">
                  <span>TOTAL</span>
                  <span>{formatRupiah(grandTotal)}</span>
                </div>

                <div className="nota-remaining">
                  <span>Bayar ({mode || "TUNAI"})</span>
                  <span>{formatRupiah(paidAmount)}</span>
                </div>

                {remainingAmount > 0 ? (
                  <div className="nota-remaining" style={{ color: "red" }}>
                    <span>BELUM LUNAS</span>
                    <span>Sisa: {formatRupiah(remainingAmount)}</span>
                  </div>
                ) : (
                  <div className="nota-status-stempel">LUNAS ✓</div>
                )}
              </div>
            ) : (
              <div
                className="nota-status"
                style={{ textAlign: "center", padding: "10px 0" }}
              >
                <p style={{ fontWeight: "bold", fontSize: "14px" }}>
                  MOHON SEGERA DIKERJAKAN
                </p>
                <p style={{ marginTop: "5px" }}>
                  Total Item:{" "}
                  {items.reduce(
                    (sum, item) => sum + (Number(item.qty) || 1),
                    0,
                  )}{" "}
                  Pcs
                </p>
              </div>
            )}

            <div className="receipt-divider"></div>

            {/* Footer Text */}
            <div
              className="nota-footer"
              style={{
                textAlign: "center",
                fontSize: "11px",
                marginTop: "8px",
              }}
            >
              {printMode === "NOTA" ? (
                <>
                  <p style={{ fontWeight: "bold" }}>
                    Terima Kasih - BUKA 24 JAM
                  </p>
                  <p>Pembayaran via Transfer:</p>
                  <p>BCA 1234567890 / BRI 0987654321</p>
                </>
              ) : (
                <p>Dokumen Internal - JOGLO PRINTING</p>
              )}
            </div>

            {/* Cutter Spacer */}
            <div
              style={{ height: "40mm", display: "block", width: "100%" }}
            ></div>
          </div>

          {/* === END AREA PRINT === */}

          {/* TOMBOL AKSI */}
          <div
            className="nota-actions"
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handlePrintNota}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "white",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🖨️ CETAK NOTA
            </button>
            <button
              onClick={handleShareImage}
              disabled={isGenerating}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                color: "white",
                fontWeight: "700",
                fontSize: "13px",
                cursor: isGenerating ? "wait" : "pointer",
              }}
            >
              {isGenerating ? "⏳..." : "📸 SHARE WA"}
            </button>
            <button
              onClick={() => {
                onClose();
                if (onReset) onReset();
              }}
              style={{
                padding: "12px 24px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                color: "white",
                fontWeight: "800",
              }}
            >
              ✅ SELESAI
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "2px solid #64748b",
                background: "transparent",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ✕ TUTUP
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  },
);
