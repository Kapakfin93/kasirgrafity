/**
 * STATIONERY RECONSTRUCTION (DEPRECATED / NON-AKTIF)
 * Status: ✅ MIGRATED TO SUPABASE (GEN 4.8)
 * * File ini sekarang dikosongkan agar tidak menimpa data Cloud (Supabase)
 * dengan data hardcode lama.
 * * Jangan hapus file ini jika main.jsx masih memanggilnya,
 * tapi isinya sudah dibikin mandul (No-Op).
 */

import db from "../db/schema.js";

// ❌ DATA DIKOSONGKAN (Mencegah Zombie Data)
const HYBRID_PRODUCTS = [];

export async function runOfficeReconstruction() {
  // Log sekedar info di console bahwa fungsi ini dilewati
  console.log(
    "🔒 STATIONERY HYBRID KEEPER: SKIPPED (Managed by Supabase Gen 4.8)",
  );

  try {
    // Loop ini tidak akan jalan karena array HYBRID_PRODUCTS kosong.
    // Database lokal aman.
    for (const hybridProduct of HYBRID_PRODUCTS) {
      await db.products.put(hybridProduct);
    }

    return { success: true };
  } catch (error) {
    console.error("\n❌ FAILED:", error);
    return { error: error.message };
  }
}

// Global expose
if (typeof window !== "undefined") {
  window.runOfficeReconstruction = runOfficeReconstruction;
}
