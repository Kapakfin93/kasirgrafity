import React, { useState } from "react";
import { X, Share2, AlertTriangle, CheckCircle, WifiOff } from "lucide-react";
import { EvidenceUpload } from "./EvidenceUpload";
import { supabase } from "../../services/supabaseClient";
import {
  generateWALink,
  generateCompletionMessage,
} from "../../utils/waHelper";

/**
 * CompletionModal (The "Single Modal")
 * Unified flow for Marking Order as Done + Marketing Evidence + WA Notification
 *
 * Logic:
 * 1. Upload Evidence (Optional/Fail-safe)
 * 2. Update Order Status (Critical)
 * 3. Send WA Notification (Optional)
 */
export function CompletionModal({
  isOpen,
  order,
  onClose,
  onSubmit,
  isOffline = false,
}) {
  // --- STATE ---
  const [step, setStep] = useState("EVIDENCE"); // EVIDENCE | SUCCESS
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  if (!isOpen || !order) return null;

  // --- HANDLERS ---
  const handleFileSelect = (file) => {
    setEvidenceFile(file);
    setUploadError(null);
  };

  const handleProcess = async () => {
    setIsUploading(true);
    setUploadError(null);
    let evidenceUrl = null;

    // 1. UPLOAD LOGIC (FAIL-SAFE)
    if (evidenceFile && !isOffline) {
      try {
        const fileName = `${order.id}_${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("marketing-evidence")
          .upload(fileName, evidenceFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Get Public URL
        const { data: publicData } = supabase.storage
          .from("marketing-evidence")
          .getPublicUrl(fileName);

        evidenceUrl = publicData.publicUrl;
        setUploadedUrl(evidenceUrl);
        console.log("✅ Evidence Uploaded:", evidenceUrl);
      } catch (err) {
        console.error("⚠️ Upload Failed (Fail-Safe Triggered):", err);
        setUploadError("Gagal upload foto. Melanjutkan tanpa bukti...");
        // Do NOT return here. Proceed to update status.
      }
    }

    // 2. STATUS UPDATE LOGIC (CRITICAL)
    try {
      await onSubmit({
        orderId: order.id,
        status: "READY",
        evidence: {
          url: evidenceUrl,
          isPublic: isPublic,
        },
      });

      // 3. MOVE TO SUCCESS STEP
      setStep("SUCCESS");
    } catch (err) {
      console.error("❌ Critical Error:", err);
      alert("Gagal update status: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- RENDER ---
  const waMessage = generateCompletionMessage(order, uploadedUrl);
  const waLink = generateWALink(order.customerPhone, waMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-950/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {step === "EVIDENCE" ? "📸 Bukti & Penyelesaian" : "✅ Order Siap!"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5">
          {step === "EVIDENCE" && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-sm">
                <div className="flex justify-between text-gray-300 mb-1">
                  <span>Order:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {order.orderNumber || `#${order.id.substr(0, 8)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Pelanggan:</span>
                  <span className="font-medium text-white">
                    {order.customerName}
                  </span>
                </div>
              </div>

              {/* Upload Component */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Foto Hasil Produksi (Opsional)
                </label>
                {isOffline ? (
                  <div className="border border-dashed border-gray-700 rounded-lg p-4 bg-gray-800/50 flex flex-col items-center text-gray-500">
                    <WifiOff size={24} className="mb-2" />
                    <span className="text-xs">
                      Upload dimatikan (Offline Mode)
                    </span>
                  </div>
                ) : (
                  <EvidenceUpload
                    onFileSelect={handleFileSelect}
                    disabled={isUploading}
                  />
                )}

                {/* Checkbox Public */}
                {!isOffline && evidenceFile && (
                  <div className="flex items-center gap-2 mt-2 bg-gray-800/30 p-2 rounded border border-gray-700">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50"
                    />
                    <label
                      htmlFor="isPublic"
                      className="text-xs text-gray-300 cursor-pointer select-none"
                    >
                      Izinkan posting ke Google Maps / Sosmed?
                    </label>
                  </div>
                )}
              </div>

              {/* Warnings / Errors */}
              {uploadError && (
                <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  <AlertTriangle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-xl font-bold text-white">
                Status Diperbarui!
              </h4>
              <p className="text-sm text-gray-400">
                Order{" "}
                <span className="text-white font-medium">
                  {order.orderNumber}
                </span>{" "}
                sekarang berstatus
                <span className="text-green-400 font-bold ml-1">READY</span>.
              </p>

              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-left mt-4">
                <div className="flex gap-3">
                  <Share2 className="text-blue-400 shrink-0" size={20} />
                  <div>
                    <h5 className="text-sm font-bold text-blue-300 mb-1">
                      Kirim Notifikasi WA?
                    </h5>
                    <p className="text-xs text-gray-400 mb-3">
                      Kirim pesan otomatis ke pelanggan bahwa pesanan sudah
                      selesai.
                    </p>
                    <a
                      href={waLink || "#"}
                      onClick={(e) => {
                        if (!waLink) {
                          e.preventDefault();
                          alert("Nomor WA tidak valid");
                          return;
                        }
                        onClose();
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                        waLink
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-gray-700 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      📱 BUKA WHATSAPP
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-gray-800/50 border-t border-gray-800 flex justify-end gap-3">
          {step === "EVIDENCE" ? (
            <>
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleProcess}
                disabled={isUploading}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition-all
                  ${
                    isUploading
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95"
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {evidenceFile ? "Mengunggah..." : "Memproses..."}
                  </>
                ) : (
                  <>{!evidenceFile ? "Lewati & Selesai" : "Simpan & Selesai"}</>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
