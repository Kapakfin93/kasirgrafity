import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { Upload, X, CheckCircle, Camera } from "lucide-react";
import {
  validateImageFile,
  validateImageDimensions,
} from "../../utils/uploadValidator";

/**
 * EvidenceUpload Component
 * Handles image selection, compression, and preview.
 * Returns the compressed file to the parent via onFileSelect.
 * Notifies parent about compression lifecycle via onPhaseChange.
 *
 * onPhaseChange(phase): "COMPRESSING" | "IDLE" | "ERROR"
 */
export function EvidenceUpload({
  onFileSelect,
  onPhaseChange,
  disabled = false,
}) {
  const galleryRef = React.useRef(null);
  const cameraRef = React.useRef(null);
  const [preview, setPreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;

    // Reset states
    setError(null);

    // ─── TITIK 1: Validasi Lapis 1 + 2 (Tipe & Ukuran File Awal) ──────
    const preValidation = validateImageFile(imageFile);
    if (!preValidation.valid) {
      setError(preValidation.error);
      onPhaseChange?.("ERROR", preValidation.error);
      return; // Hentikan proses
    }

    // ─── GUARDIAN: STATE CHECK 1 (PRE-COMPRESS) - Dimensi Fisik ───────
    setIsCompressing(true); // Tampilkan status ke user selagi ngecek dimensi asinkron
    onPhaseChange?.("COMPRESSING");

    const dimensionCheck = await validateImageDimensions(imageFile);
    if (!dimensionCheck.valid) {
      setIsCompressing(false);
      setError(dimensionCheck.error);
      onPhaseChange?.("ERROR", dimensionCheck.error);
      return; // Hentikan proses, jangan lanjut kompresi
    }

    setPreview(URL.createObjectURL(imageFile)); // Optimistic preview
    // Status isCompressing dan onPhaseChange sudah diset di atas sebelum dimensionCheck

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      console.log(
        `🖼️ Compressing ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)} MB)...`,
      );

      const compressedFile = await imageCompression(imageFile, options);

      console.log(
        `✅ Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      );

      // ─── TITIK 2: Validasi Lapis 3 (setelah kompresi selesai) ───────────
      const postValidation = validateImageFile(imageFile, compressedFile);
      if (!postValidation.valid) {
        setError(postValidation.error);
        onPhaseChange?.("ERROR", postValidation.error);
        onFileSelect(null); // Clear parent state
        return; // Hentikan proses
      }

      onFileSelect(compressedFile);
    } catch (err) {
      console.error("❌ Compression failed:", err);
      setError("Gagal memproses gambar. Coba gambar lain.");
      onFileSelect(null); // Clear parent state
    } finally {
      setIsCompressing(false);
      onPhaseChange?.("IDLE"); // 🔔 Notify parent compression done
    }
  };

  const clearImage = () => {
    setPreview(null);
    onFileSelect(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      {!preview ? (
        <div className="relative">
          {/* Hidden Inputs */}
          <input
            type="file"
            ref={galleryRef}
            accept="image/*"
            onChange={handleImageChange}
            hidden
          />
          <input
            type="file"
            ref={cameraRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            hidden
          />

          <div
            className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${error ? "border-red-500 bg-red-900/10" : "border-gray-600 bg-gray-800/20 hover:border-blue-500/50 hover:bg-gray-800/50"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-sm font-medium text-gray-300">
                {isCompressing ? "Memproses..." : "Ambil Foto Hasil Produksi"}
              </div>

              <div className="flex flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={disabled || isCompressing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Camera size={18} />
                  Kamera
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  disabled={disabled || isCompressing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Upload size={18} />
                  Galeri
                </button>
              </div>

              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                JPG/PNG • Max 5MB • Auto Compress
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Area */
        <div className="relative rounded-lg overflow-hidden border border-gray-600 bg-gray-900 group">
          <img
            src={preview}
            alt="Evidence Preview"
            className={`w-full h-48 object-cover transition-opacity ${isCompressing ? "opacity-50" : "opacity-100"}`}
          />

          {/* Overlay Status */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isCompressing ? (
              <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full animate-pulse">
                Mengompres...
              </div>
            ) : (
              <div className="bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle size={12} /> Siap
              </div>
            )}
          </div>

          {/* Remove Button */}
          {!disabled && (
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors z-20"
              title="Hapus Foto"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-red-500 text-center">{error}</div>
      )}
    </div>
  );
}
