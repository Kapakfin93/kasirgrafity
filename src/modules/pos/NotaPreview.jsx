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
import { sendWAMessage } from "../../services/fontteService";
import { supabase } from "../../services/supabaseClient";

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

// --- HELPER: DYNAMIC FINISHING EXTRACTOR (Vacuum Cleaner V2) ---
/**
 * Extracts ALL finishing details from complex variant structures.
 * Handles: finishing_list, selected_details, selected_finishing, finishing_selections, and fallback strings.
 * @param {Object} dims - item.dimensions or item.specs
 * @param {Object} item - The full item object
 * @returns {string} - Formatted finishing string or "-"
 */
const extractFinishingDetails = (dims, item) => {
  const parts = [];

  // STEP 1: Extract from finishing_list (Array) - Spanduk style
  if (dims.finishing_list && Array.isArray(dims.finishing_list)) {
    const names = dims.finishing_list.map((f) => f.name || f).filter(Boolean);
    parts.push(...names);
  }
  // ✅ ALSO CHECK: item.meta.finishing_list (X-Banner style)
  else if (
    item.meta?.finishing_list &&
    Array.isArray(item.meta.finishing_list)
  ) {
    const names = item.meta.finishing_list
      .map((f) => f.name || f)
      .filter(Boolean);
    parts.push(...names);
  }

  // STEP 2: Extract from selected_details (Dynamic Object) - Complex variants
  // Exclude common non-finishing keys to avoid duplication
  const excludeKeys = ["size", "material", "qty", "quantity", "variantLabel"];

  if (dims.selected_details && typeof dims.selected_details === "object") {
    Object.entries(dims.selected_details).forEach(([category, value]) => {
      // Skip excluded keys
      if (excludeKeys.includes(category)) return;

      // Handle nested objects: { "Laminasi": { "name": "Glossy" } }
      if (value && typeof value === "object" && value.name) {
        parts.push(`${category}: ${value.name}`);
      }
      // Handle direct strings: { "Laminasi": "Glossy" }
      else if (typeof value === "string") {
        parts.push(`${category}: ${value}`);
      }
    });
  }

  // STEP 3: Extract from selected_finishing (Object) - X-Banner style
  // Structure: { "OPT_DISPLAY_MAT": { "label": "Flexi 280gr", "price": 0 } }
  if (dims.selected_finishing && typeof dims.selected_finishing === "object") {
    Object.values(dims.selected_finishing).forEach((selection) => {
      if (selection && typeof selection === "object") {
        const label = selection.label || selection.name;
        if (label) parts.push(label);
      } else if (typeof selection === "string") {
        parts.push(selection);
      }
    });
  }

  // STEP 4: Extract from finishing_selections (Array) - Alternative X-Banner style
  // Structure: [{ "group_id": "...", "selected_label": "Flexi 280gr" }]
  if (dims.finishing_selections && Array.isArray(dims.finishing_selections)) {
    dims.finishing_selections.forEach((selection) => {
      const label =
        selection.selected_label ||
        selection.label ||
        selection.name ||
        selection.selected?.label ||
        selection.selected?.name;
      if (label) parts.push(label);
    });
  }

  // STEP 5: Extract from selected_variant (Object) - Variant-specific info
  // Structure: { "label": "X-Banner", "specs": "60x160 | Fiber Black" }
  if (dims.selected_variant && typeof dims.selected_variant === "object") {
    // Only add specs if they contain useful info (not just dimensions)
    const specs = dims.selected_variant.specs;
    if (specs && typeof specs === "string" && specs.includes("|")) {
      // Extract material part after "|" (e.g., "60x160 | Fiber Black" -> "Fiber Black")
      const materialPart = specs.split("|")[1]?.trim();
      if (materialPart) parts.push(materialPart);
    }
  }

  // STEP 6: Fallback to simple string fields (if no parts extracted yet)
  if (parts.length === 0) {
    if (dims.finishing) parts.push(dims.finishing);
    else if (item.finishing) parts.push(item.finishing);
    else if (item.meta?.finishing) parts.push(item.meta.finishing);
  }

  // STEP 7: Return formatted string or fallback
  return parts.length > 0 ? parts.join(", ") : "-";
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
    const rawCsName =
      order?.payment?.received_by ||
      order?.meta?.received_by ||
      order?.receivedBy ||
      order?.received_by ||
      "Kasir";
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

    // 🔥 FORENSIC FIX: Handle All Possible Data Paths
    // 1. Root Snake (DB default): order.payment_method
    // 2. Root Camel (Legacy/Front): order.paymentMethod
    // 3. Nested Object (User evidence): order.payment?.method
    // 4. Fallback State: paymentState?.mode
    const mode =
      order?.payment_method ||
      order?.paymentMethod ||
      order?.payment?.method ||
      paymentState?.mode ||
      "TUNAI";

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
    const [waStatus, setWaStatus] = useState(null);
    // null | "sending" | "sent" | "failed"
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
      setWaStatus(null);

      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        // STEP 1 — Generate canvas
        const canvas = await html2canvas(internalRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        // STEP 2 — Watermark (preserved from original)
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

        // STEP 3 — Download PNG (preserved)
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `NOTA-${orderNumber}-${Date.now()}.png`;
        link.click();

        // STEP 4 — Upload ke Supabase nota-shares
        let notaImageUrl = null;
        try {
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/png", 0.8),
          );

          // Hapus file lama order ini sebelum upload baru
          const { data: existingFiles } = await supabase.storage
            .from("nota-shares")
            .list("", { search: `nota-${orderNumber}` });

          if (existingFiles && existingFiles.length > 0) {
            const oldFiles = existingFiles.map((f) => f.name);
            await supabase.storage.from("nota-shares").remove(oldFiles);
            console.log("🗑️ File nota lama dihapus:", oldFiles);
          }

          const fileName = `nota-${orderNumber}-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("nota-shares")
            .upload(fileName, blob, {
              contentType: "image/png",
              upsert: false,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("nota-shares")
              .getPublicUrl(fileName);
            notaImageUrl = urlData?.publicUrl || null;
            console.log("📤 Nota uploaded:", notaImageUrl);
          } else {
            console.warn("⚠️ Upload nota gagal:", uploadError.message);
          }
        } catch (uploadErr) {
          console.warn("⚠️ Upload nota error:", uploadErr.message);
          // Lanjut kirim WA tanpa gambar jika upload gagal
        }

        // STEP 5 — Kirim via Fonnte
        if (custWA) {
          const text =
            `Halo Kak *${custName}*,\n\n` +
            `Terima kasih sudah order di *JOGLO PRINTING* 🎨\n\n` +
            `Berikut kami lampirkan nota digital pesanan:\n` +
            `📋 *${orderNumber}*\n\n` +
            `💰 Total: ${formatRupiah(safeTotal)}\n` +
            `📌 Status: ${statusText}\n\n` +
            `_Gambar nota terlampir._\n` +
            `Mohon dicek kembali. Terima kasih! 🙏`;

          setWaStatus("sending");
          const result = await sendWAMessage(custWA, text, notaImageUrl);

          if (result.success) {
            setWaStatus("sent");
            console.log("✅ WA Nota + gambar terkirim ke:", result.target);
          } else {
            console.warn("⚠️ Fonnte gagal:", result.error, "— fallback wa.me");
            setWaStatus("failed");
            const cleanNum = custWA.replace(/\D/g, "").replace(/^0/, "62");
            const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
            setTimeout(() => window.open(waUrl, "_blank"), 300);
          }
        } else {
          alert("✅ Gambar nota didownload!\n⚠️ No WA tidak tersedia.");
        }
      } catch (err) {
        console.error("❌ handleShareImage error:", err);
        setWaStatus("failed");
      } finally {
        setShowWatermark(false);
        setIsGenerating(false);
      }
    }, [
      internalRef,
      isGenerating,
      orderNumber,
      custWA,
      custName,
      safeTotal,
      statusText,
    ]);

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
                      {order?.targetDate || order?.meta?.estimate_date
                        ? new Date(
                            order.targetDate || order.meta.estimate_date,
                          ).toLocaleString("id-ID", {
                            weekday: "long",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SPK FACTORY VIEW (BODY) */}
            {printMode === "SPK" && (
              <div
                style={{ padding: "0 10px", fontFamily: "Arial, sans-serif" }}
              >
                {/* NOTE: Harga DISEMBUNYIKAN untuk Operator */}
                <div
                  style={{ borderTop: "2px solid black", marginTop: "10px" }}
                ></div>

                {items.map((item, idx) => {
                  const qty = item.quantity || item.qty || 0;
                  // Smart Variable Mapping (Forensic Fix)
                  const dims = item.dimensions || item.specs || {};

                  // 🕵️ DEBUG SPK: Log actual item data
                  console.log(`📋 SPK ITEM #${idx + 1}:`, {
                    product_name: item.productName || item.product_name,
                    dims_summary: dims.summary,
                    dims_material: dims.material,
                    dims_variantLabel: dims.variantLabel,
                    item_description: item.description,
                    item_note: item.note,
                    item_notes: item.notes,
                    full_dims: dims,
                  });

                  // 🔥 PRIORITY 1: Use pre-formatted summary from Cart (Gold Standard)
                  const smartSummary =
                    dims.summary || dims.description || item.description || "";

                  // 🔥 PRIORITY 2: Individual Components (Fallback)
                  const variantLabel =
                    dims.variantLabel ||
                    dims.material ||
                    dims.variant_name ||
                    "";
                  const sizeInfo =
                    dims.size_summary ||
                    (dims.length && dims.width
                      ? `${dims.length}m x ${dims.width}m`
                      : "");

                  // 🔥 SMART DETECTION: Trust summary if it has detail
                  // Indicators of detailed summary:
                  // 1. Contains "|" separator (enriched format: "X-Banner | Flexi 280gr")
                  // 2. Length > 15 characters (not just product name)
                  const hasDetailedSummary =
                    smartSummary &&
                    (smartSummary.includes("|") || smartSummary.length > 15);

                  // FINAL DECISION: Prioritize detailed summary, fallback to manual construction
                  const displaySpecs = hasDetailedSummary
                    ? smartSummary
                    : `${variantLabel} ${sizeInfo}`.trim() ||
                      smartSummary ||
                      "-";

                  console.log(`✅ SPK DISPLAY:`, {
                    smartSummary,
                    hasDetailedSummary,
                    finalDisplaySpecs: displaySpecs,
                  });

                  // 🔥 FINISHING: Dynamic extraction using helper
                  const finishing = extractFinishingDetails(dims, item);

                  // Extract notes from all possible sources
                  const notes =
                    item.notes || item.note || item.specs?.notes || "";

                  console.log(`📝 SPK NOTES:`, notes);

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "15px 0",
                        borderBottom: "1px dashed #ccc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "15px",
                        }}
                      >
                        {/* QTY BOX */}
                        <div
                          style={{
                            fontSize: "24px",
                            fontWeight: "900",
                            border: "3px solid black",
                            padding: "10px 15px",
                            minWidth: "60px",
                            textAlign: "center",
                            borderRadius: "8px",
                          }}
                        >
                          {qty}x
                        </div>

                        {/* SPECS */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "bold",
                              marginBottom: "5px",
                            }}
                          >
                            {item.productName || item.product_name || "ITEM"}
                          </div>

                          <div
                            style={{
                              fontSize: "12px",
                              marginBottom: "5px",
                            }}
                          >
                            <div style={{ marginBottom: "5px" }}>
                              <span style={{ fontWeight: "bold" }}>
                                Spesifikasi:
                              </span>{" "}
                              {displaySpecs}
                            </div>
                            {/* 🔥 SMART FINISHING DISPLAY: Only show if NOT already in summary */}
                            {finishing &&
                              finishing !== "-" &&
                              !displaySpecs.includes("Fin:") &&
                              !displaySpecs.includes("Finishing:") && (
                                <div>
                                  <span style={{ fontWeight: "bold" }}>
                                    Finishing:
                                  </span>{" "}
                                  {finishing}
                                </div>
                              )}
                          </div>

                          {/* NOTES HIGHLIGHT */}
                          {notes && (
                            <div
                              style={{
                                marginTop: "8px",
                                background: "#fef3c7",
                                padding: "8px",
                                borderLeft: "4px solid #f59e0b",
                                fontStyle: "italic",
                                fontSize: "14px",
                              }}
                            >
                              <strong>Catatan:</strong> {notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* FOOTER: Operator Signature */}
              </div>
            )}

            {printMode === "NOTA" ? (
              <div
                className="nota-font-wrapper"
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: "12px",
                  lineHeight: "1.4",
                  color: "#000",
                  textAlign: "left",
                  background: "#fff",
                  padding: "10px",
                }}
              >
                {/* 1. HEADER (CENTERED) */}
                <div style={{ textAlign: "center", marginBottom: "10px" }}>
                  <h1
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      margin: "0 0 5px 0",
                      letterSpacing: "1px",
                    }}
                  >
                    JOGLO PRINTING
                  </h1>
                  <p style={{ margin: "2px 0", fontSize: "11px" }}>
                    Jl. Diponegoro, Rw. 4, Jogoloyo
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "11px" }}>
                    Demak, Jawa Tengah
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "11px" }}>
                    Telp: 0813-9028-6826
                  </p>
                  <p
                    style={{
                      margin: "2px 0",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    BUKA . 24 JAM
                  </p>
                </div>

                <div style={{ textAlign: "center", margin: "10px 0" }}>
                  ------------------------------------------
                </div>

                {/* 2. META INFO (2 COLUMNS) */}
                {/* 2. META INFO (STACKED) */}
                <div style={{ fontSize: "11px", marginBottom: "10px" }}>
                  {/* Line 1: Tgl & Kasir */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span>
                      <span style={{ fontStyle: "italic", marginRight: "3px" }}>
                        Tgl:
                      </span>
                      {new Date().toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span style={{ textTransform: "capitalize" }}>
                      Admin: {csName}
                    </span>
                  </div>

                  {/* Line 2: No Order */}
                  <div style={{ marginBottom: "3px" }}>
                    <span style={{ fontStyle: "italic", marginRight: "3px" }}>
                      No:
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      {orderNumber?.replace("ORD", "JGL") || "JGL-000"}
                    </span>
                  </div>

                  {/* Line 3: Customer Info */}
                  <div>
                    <span style={{ fontStyle: "italic", marginRight: "3px" }}>
                      Cust:
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      {custName.substring(0, 20)}
                    </span>
                    {custWA && (
                      <span style={{ marginLeft: "8px" }}>
                        <span
                          style={{ fontStyle: "italic", marginRight: "3px" }}
                        >
                          WA:
                        </span>
                        {custWA}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "center", margin: "10px 0" }}>
                  ------------------------------------------
                </div>

                {/* 3. ITEM LIST (COMPACT & DETAILED) */}
                <div className="nota-items">
                  {items.map((item, idx) => {
                    const quantity = item.quantity || item.qty || 0;
                    const subtotal =
                      item.subtotal ||
                      item.totalPrice ||
                      item.price * quantity ||
                      0;
                    const unitPrice =
                      item.unit_price || item.unitPrice || item.price || 0;

                    // 🔥 UNIFIED LOGIC: Same robust extraction as SPK
                    const dims = item.dimensions || item.specs || {};

                    // STEP 1: Smart Summary (Priority 1 - Pre-built from Cart)
                    const smartSummary = dims.summary || item.description || "";

                    // STEP 2: Manual Construction (Priority 2 - For products without summary)
                    const variantInfo =
                      dims.variantLabel ||
                      dims.material ||
                      dims.variant_name ||
                      "";
                    const sizeInfo =
                      dims.size_summary ||
                      (dims.length && dims.width
                        ? `${dims.length}m x ${dims.width}m`
                        : "");

                    // STEP 3: Combine Main Spec
                    const mainSpec =
                      smartSummary || `${variantInfo} ${sizeInfo}`.trim();

                    // STEP 4: Extract Finishing (Dynamic Vacuum Cleaner)
                    const finishingDetails = extractFinishingDetails(
                      dims,
                      item,
                    );

                    // STEP 5: Build Final Display String
                    const fullDetailString = [mainSpec, finishingDetails]
                      .filter((s) => s && s !== "-")
                      .join(", ");

                    return (
                      <div
                        key={idx}
                        style={{ marginBottom: "8px", fontSize: "11px" }}
                      >
                        {/* Line 1: Qty x Name ... Total */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: "bold",
                          }}
                        >
                          <span>
                            {quantity}x{" "}
                            {item.productName ||
                              item.product_name ||
                              item.name ||
                              item.product?.name ||
                              "ITEM"}
                          </span>
                          <span>{formatRupiah(subtotal)}</span>
                        </div>

                        {/* Line 2: Full Detail String (Unified Logic) */}
                        {fullDetailString && (
                          <div
                            style={{
                              paddingLeft: "15px",
                              fontStyle: "italic",
                              color: "#000",
                              fontSize: "10px",
                            }}
                          >
                            {fullDetailString}
                          </div>
                        )}

                        {/* Line 3: Unit Price (Explicit) */}
                        <div
                          style={{
                            paddingLeft: "15px",
                            fontSize: "10px",
                            color: "#000",
                          }}
                        >
                          @ {formatRupiah(unitPrice)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ textAlign: "center", margin: "10px 0" }}>
                  ------------------------------------------
                </div>

                {/* 4. SUMMARY (FIXED LOGIC ORDER) */}
                <div className="nota-summary" style={{ fontSize: "11px" }}>
                  {/* 1. SUBTOTAL */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span>Subtotal:</span>
                    <span>{formatRupiah(itemsTotal)}</span>
                  </div>

                  {/* 2. BIAYA LAYANAN (Jika Ada) */}
                  {serviceFee > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span>
                        {priorityLevel === "EXPRESS"
                          ? "Biaya Express"
                          : priorityLevel === "URGENT"
                            ? "Biaya Urgent"
                            : "Biaya Layanan"}
                      </span>
                      <span>{formatRupiah(serviceFee)}</span>
                    </div>
                  )}

                  {/* 3. DISKON (Jika Ada - NEGATIF) */}
                  {discount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span>Diskon:</span>
                      <span>-{formatRupiah(discount)}</span>
                    </div>
                  )}

                  <div style={{ textAlign: "center", margin: "5px 0" }}>
                    ------------------------------------------
                  </div>

                  {/* 4. TOTAL (GRAND TOTAL) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      fontSize: "14px",
                      margin: "5px 0",
                    }}
                  >
                    <span>TOTAL:</span>
                    <span>{formatRupiah(grandTotal)}</span>
                  </div>

                  {/* 5. BAYAR (TUNAI / TRANSFER) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span>
                      BAYAR (
                      {mode === "NON_TUNAI" || mode === "TRANSFER"
                        ? "TRANSFER"
                        : "TUNAI"}
                      ):
                    </span>
                    <span>{formatRupiah(paidAmount)}</span>
                  </div>

                  {/* 6. KEMBALI / SISA TAGIHAN */}
                  {remainingAmount > 0 ? (
                    // KASUS: BELUM LUNAS (SISA TAGIHAN)
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        marginTop: "5px",
                        borderTop: "1px dashed black",
                        paddingTop: "5px",
                      }}
                    >
                      <span>SISA TAGIHAN:</span>
                      <span>{formatRupiah(remainingAmount)}</span>
                    </div>
                  ) : (
                    // KASUS: LUNAS (KEMBALIAN)
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                      }}
                    >
                      <span>KEMBALI:</span>
                      <span>
                        {formatRupiah(Math.max(0, paidAmount - grandTotal))}
                      </span>
                    </div>
                  )}

                  {/* 7. BANK INFO (PERMANENT) */}
                  <div
                    style={{
                      marginTop: "10px",
                      textAlign: "center",
                      fontSize: "10px",
                    }}
                  >
                    <div style={{ marginBottom: "5px" }}>
                      ------------------------------------------
                    </div>
                    <p style={{ margin: "2px 0", fontWeight: "bold" }}>
                      Transfer Pembayaran ke:
                    </p>
                    <p style={{ margin: "2px 0" }}>BCA: 0097085203</p>
                    <p style={{ margin: "2px 0" }}>BRI: 008301090560509</p>
                    <p style={{ margin: "2px 0", fontStyle: "italic" }}>
                      a.n Muhtarudin Nurul Habibi
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: "center", margin: "15px 0" }}>
                  ------------------------------------------
                </div>

                {/* 5. FOOTER */}
                <div style={{ textAlign: "center", fontSize: "11px" }}>
                  <p style={{ margin: "5px 0", fontWeight: "bold" }}>
                    TERIMA KASIH
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "10px" }}>
                    Barang yang sudah dibeli
                  </p>
                  <p style={{ margin: "0", fontSize: "10px" }}>
                    tidak dapat ditukar/dikembalikan
                  </p>
                </div>
              </div>
            ) : (
              // --- SPK / INTERNAL DOC MODE (KEEP AS IS OR MINIMALIZE) ---
              <div style={{ textAlign: "center", padding: "20px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>
                  DOKUMEN INTERNAL
                </h1>
                <p>Gunakan Mode "Nota" untuk struk belanja.</p>
              </div>
            )}

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
                background:
                  waStatus === "sent"
                    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                    : waStatus === "failed"
                      ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
                      : "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                color: "white",
                fontWeight: "700",
                fontSize: "13px",
                cursor: isGenerating ? "wait" : "pointer",
              }}
            >
              {isGenerating && waStatus === "sending"
                ? "📤 Mengirim WA..."
                : waStatus === "sent"
                  ? "✅ WA Terkirim!"
                  : waStatus === "failed"
                    ? "⚠️ Gagal — cek WA"
                    : isGenerating
                      ? "⏳..."
                      : "📸 SHARE WA"}
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
