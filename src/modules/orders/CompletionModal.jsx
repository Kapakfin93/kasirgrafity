import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  X,
  Share2,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  RefreshCw,
} from "lucide-react";
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
 * Upload Lifecycle (enum uploadPhase):
 *   IDLE        → default, menunggu user memilih foto
 *   COMPRESSING → EvidenceUpload sedang mengompres gambar (dari device)
 *   UPLOADING   → Mengirim file ke Supabase Storage
 *   SUCCESS     → Upload & status update berhasil
 *   ERROR       → Upload atau status update gagal
 */

// ─── Upload Phase Labels & Helper ──────────────────────────────────────────
const PHASE = {
  IDLE: "IDLE",
  COMPRESSING: "COMPRESSING",
  UPLOADING: "UPLOADING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

function getButtonLabel(phase, hasFile) {
  switch (phase) {
    case PHASE.COMPRESSING:
      return (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Memproses Foto...
        </>
      );
    case PHASE.UPLOADING:
      return (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Mengunggah...
        </>
      );
    default:
      return hasFile ? "Simpan & Selesai" : "Lewati & Selesai";
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export function CompletionModal({
  isOpen,
  order,
  onClose,
  onSubmit,
  isOffline = false,
}) {
  // --- STATE ---
  const [step, setStep] = useState("EVIDENCE"); // EVIDENCE | SUCCESS

  // 🆕 Enum terpusat untuk semua fase upload
  const [uploadPhase, setUploadPhase] = useState(PHASE.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  if (!isOpen || !order) return null;

  // --- Derived ---
  const isBlocked =
    uploadPhase === PHASE.COMPRESSING || uploadPhase === PHASE.UPLOADING;

  // --- HANDLERS ---
  const handleFileSelect = (file) => {
    setEvidenceFile(file);
    // Reset error jika user pilih file baru setelah error
    if (uploadPhase === PHASE.ERROR) setUploadPhase(PHASE.IDLE);
    setErrorMessage(null);
  };

  // Callback dari EvidenceUpload untuk notifikasi fase kompresi dan validasi
  const handleEvidencePhaseChange = (phase, errorMsg) => {
    if (phase === "COMPRESSING") {
      setUploadPhase(PHASE.COMPRESSING);
    } else if (phase === "IDLE") {
      // Kembali ke IDLE hanya jika sebelumnya COMPRESSING (jangan override ERROR/UPLOADING)
      setUploadPhase((prev) =>
        prev === PHASE.COMPRESSING ? PHASE.IDLE : prev,
      );
    } else if (phase === "ERROR") {
      // Validator menolak file — tampilkan pesan error dari validator
      setUploadPhase(PHASE.ERROR);
      setErrorMessage(errorMsg || "File tidak valid.");
    }
  };

  const handleProcess = async () => {
    // Guard: jangan eksekusi jika sedang compressing atau uploading
    if (isBlocked) return;

    setUploadPhase(PHASE.UPLOADING);
    setErrorMessage(null);
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

        const { data: publicData } = supabase.storage
          .from("marketing-evidence")
          .getPublicUrl(fileName);

        evidenceUrl = publicData.publicUrl;
        setUploadedUrl(evidenceUrl);
        console.log("✅ Evidence Uploaded:", evidenceUrl);
      } catch (err) {
        console.error("⚠️ Upload Failed (Fail-Safe Triggered):", err);
        // Fail-safe: lanjutkan tanpa foto, bukan error fatal
        setErrorMessage("Gagal upload foto. Melanjutkan tanpa bukti...");
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

      // 3. SUCCESS
      setUploadPhase(PHASE.SUCCESS);
      setStep("SUCCESS");
    } catch (err) {
      console.error("❌ Critical Error:", err);
      setUploadPhase(PHASE.ERROR);
      setErrorMessage("Gagal update status: " + err.message);
    }
  };

  // Coba lagi dari awal (IDLE) setelah ERROR
  const handleRetry = () => {
    setUploadPhase(PHASE.IDLE);
    setErrorMessage(null);
  };

  // --- RENDER ---
  const waMessage = generateCompletionMessage(order, uploadedUrl);
  const waLink = generateWALink(order.customerPhone, waMessage);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-950/50 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {step === "EVIDENCE" ? "📸 Bukti & Penyelesaian" : "✅ Order Siap!"}
          </h3>
          <button
            onClick={onClose}
            disabled={isBlocked}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onPhaseChange={handleEvidencePhaseChange}
                    disabled={isBlocked}
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

              {/* 🆕 Upload Phase Status Banner */}
              {uploadPhase === PHASE.COMPRESSING && (
                <div className="flex items-center gap-2 text-blue-400 text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 animate-pulse">
                  <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span>Mengompres foto, harap tunggu...</span>
                </div>
              )}

              {uploadPhase === PHASE.UPLOADING && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs bg-indigo-500/10 p-2 rounded border border-indigo-500/20 animate-pulse">
                  <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Mengunggah ke server...</span>
                </div>
              )}

              {/* Error Banner dengan tombol Coba Lagi */}
              {uploadPhase === PHASE.ERROR && errorMessage && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded border border-red-500/20">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="mb-2">{errorMessage}</p>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 text-xs font-bold text-red-300 hover:text-white bg-red-700/40 hover:bg-red-700/70 px-2 py-1 rounded transition-colors"
                    >
                      <RefreshCw size={11} />
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Fail-safe warning (upload gagal tapi lanjut proses) */}
              {uploadPhase !== PHASE.ERROR && errorMessage && (
                <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  <AlertTriangle size={14} />
                  <span>{errorMessage}</span>
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
        <div className="p-4 bg-gray-800/50 border-t border-gray-800 flex justify-end gap-3 sticky bottom-0">
          {step === "EVIDENCE" ? (
            <>
              <button
                onClick={onClose}
                disabled={isBlocked}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>

              {/* Tombol Coba Lagi muncul sebagai pengganti Simpan jika ERROR fatal */}
              {uploadPhase === PHASE.ERROR ? (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition-all bg-red-600 hover:bg-red-500"
                >
                  <RefreshCw size={14} />
                  Coba Lagi
                </button>
              ) : (
                <button
                  onClick={handleProcess}
                  disabled={isBlocked}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition-all
                    ${
                      isBlocked
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95"
                    }
                  `}
                >
                  {getButtonLabel(uploadPhase, !!evidenceFile)}
                </button>
              )}
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
    </div>,
    document.body,
  );
}
