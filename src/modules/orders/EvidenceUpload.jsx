import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { Upload, X, Image as ImageIcon, CheckCircle } from "lucide-react";

/**
 * EvidenceUpload Component
 * Handles image selection, compression, and preview.
 * Returns the compressed file to the parent.
 */
export function EvidenceUpload({ onFileSelect, disabled = false }) {
  const [preview, setPreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;

    // Reset states
    setError(null);
    setPreview(URL.createObjectURL(imageFile)); // Optimistic preview
    setIsCompressing(true);

    try {
      const options = {
        maxSizeMB: 1, // Target smaller size for faster upload
        maxWidthOrHeight: 1280, // HD is enough for evidence
        useWebWorker: true,
      };

      console.log(
        `🖼️ Compressing ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)} MB)...`,
      );

      const compressedFile = await imageCompression(imageFile, options);

      console.log(
        `✅ Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      );

      // Update preview with compressed version (optional, but good for verification)
      // setPreview(URL.createObjectURL(compressedFile));

      onFileSelect(compressedFile);
    } catch (error) {
      console.error("❌ Compression failed:", error);
      setError("Gagal memproses gambar. Coba gambar lain.");
      onFileSelect(null); // Clear parent state
    } finally {
      setIsCompressing(false);
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
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={disabled || isCompressing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div
            className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${error ? "border-red-500 bg-red-50" : "border-gray-600 hover:border-blue-500 hover:bg-gray-800"}
            ${disabled ? "opacity-50" : ""}
          `}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-gray-700 rounded-full">
                <Upload size={24} className="text-gray-300" />
              </div>
              <div className="text-sm font-medium text-gray-300">
                {isCompressing
                  ? "Memproses..."
                  : "Klik untuk Upload Foto Produk"}
              </div>
              <p className="text-xs text-gray-500">
                JPG/PNG, Max 5MB (Otomatis Kompresi)
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
