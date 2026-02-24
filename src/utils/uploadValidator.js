/**
 * src/utils/uploadValidator.js
 *
 * Validator terpusat untuk file foto sebelum upload ke Supabase Storage.
 * Dipanggil dari EvidenceUpload.jsx di dua titik berbeda.
 *
 * Usage:
 *   // Titik 1: saat file dipilih (lapis 1 + 2)
 *   const { valid, error } = validateImageFile(rawFile);
 *
 *   // Titik 2: setelah kompresi selesai (lapis 3)
 *   const { valid, error } = validateImageFile(rawFile, compressedFile);
 *
 * @param {File} file          - File asli yang dipilih user
 * @param {File|null} compressedFile - File hasil kompresi (opsional, untuk lapis 3)
 * @returns {{ valid: boolean, error: string | null }}
 */

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_SIZE_MB = 20; // Batas sebelum kompresi
const MAX_COMPRESSED_SIZE_MB = 2; // Batas setelah kompresi

export function validateImageFile(file, compressedFile = null) {
  // ─── Lapis 1: Tipe File ──────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Format tidak didukung. Gunakan JPG, PNG, atau WEBP.",
    };
  }

  // ─── Lapis 2: Ukuran Sebelum Kompresi ───────────────────────────────────
  const rawSizeMB = file.size / 1024 / 1024;
  if (rawSizeMB > MAX_RAW_SIZE_MB) {
    return {
      valid: false,
      error: `File terlalu besar. Maksimal ${MAX_RAW_SIZE_MB}MB.`,
    };
  }

  // ─── Lapis 3: Ukuran Setelah Kompresi (opsional) ────────────────────────
  if (compressedFile !== null) {
    const compressedSizeMB = compressedFile.size / 1024 / 1024;
    // Pengecekan ukuran maksimal
    if (compressedSizeMB > MAX_COMPRESSED_SIZE_MB) {
      return {
        valid: false,
        error:
          "Foto tidak bisa dikompres cukup. Coba foto dengan resolusi lebih rendah.",
      };
    }

    // PENGECEKAN GUARDIAN - UKURAN DIGITAL MINIMAL (Post-compress check)
    // 10KB = 10,240 Bytes
    if (compressedFile.size < 10240) {
      return {
        valid: false,
        error:
          "Kualitas foto hasil kompresi terlalu rendah (< 10KB). Mohon gunakan foto dengan resolusi lebih baik/tidak buram.",
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validasi asinkron untuk mengecek dimensi fisik gambar.
 * Harus dipanggil SEBELUM file dimasukkan ke fungsi kompresi.
 *
 * @param {File} file - File asli yang dipilih user
 * @returns {Promise<{valid: boolean, error: string | null}>}
 */
export function validateImageDimensions(file) {
  return new Promise((resolve) => {
    // Pastikan ini adalah file gambar sebelum mencoba mengekstrak dimensi
    if (!file.type.startsWith("image/")) {
      resolve({ valid: false, error: "Bukan file gambar" });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // GUARDIAN CHECK - DIMENSI MINIMAL
      if (img.width < 250 || img.height < 250) {
        resolve({
          valid: false,
          error: `Resolusi foto terlalu kecil (${img.width}x${img.height}px). Minimal 250x250 piksel agar diterima di sistem!`,
        });
      } else {
        resolve({ valid: true, error: null });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: "Gagal membaca file gambar (Corrupted).",
      });
    };

    img.src = objectUrl;
  });
}
