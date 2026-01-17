import db from "../db/schema.js";

/**
 * Update CETAK MAJALAH product with HVS variants and enhanced finishing options
 */
export async function updateMajalahProduct() {
  console.log("📕 UPDATING CETAK MAJALAH PRODUCT...");

  try {
    // 1. DELETE OLD PRODUCT
    await db.products.where("id").equals("cetak_majalah_a4").delete();
    console.log("🔥 Deleted old cetak_majalah_a4");

    // 2. INPUT ULANG DENGAN TAMBAHAN VARIAN HVS
    await db.products.add({
      id: "cetak_majalah_a4",
      categoryId: "DIGITAL_A3_PRO",
      name: "CETAK MAJALAH / MODUL (A4)",
      input_mode: "BOOKLET",
      calc_engine: "BOOKLET",
      base_price: 0,
      min_qty: 1,

      // === 1. VARIAN KERTAS (ISI BUKU) ===
      variants: [
        // --- KELOMPOK HVS (Baru Ditambahkan) ---
        {
          label: "HVS 70gr (Ekonomis)",
          price: 250,
          specs: "Putih, Standar Modul/LKS",
        },
        {
          label: "HVS 80gr (Standar)",
          price: 300,
          specs: "Putih, Lebih Tebal, Tidak Tembus",
        },
        {
          label: "HVS 100gr (Premium)",
          price: 450,
          specs: "Sangat Tebal, Mewah untuk HVS",
        },

        // --- KELOMPOK ART PAPER (Majalah Kilap) ---
        {
          label: "Art Paper 120gr (Standar)",
          price: 800,
          specs: "Glossy, Tipis, Standar Majalah",
        },
        {
          label: "Art Paper 150gr (Premium)",
          price: 1000,
          specs: "Glossy, Tebal & Mewah",
        },
        {
          label: "Matte Paper 120gr (Doff)",
          price: 900,
          specs: "Tidak Kilap, Elegan",
        },
      ],

      // === 2. MODE CETAK (TINTA) ===
      print_modes: [
        {
          id: "duplex_bw",
          label: "Hitam Putih (BW)",
          price: 300, // Murah untuk LKS/Modul HVS
          description: "Teks Only / Modul Sekolah",
        },
        {
          id: "duplex_mix",
          label: "Campur (Warna + BW)",
          price: 1500,
          description: "Dominan Teks, Sedikit Foto",
        },
        {
          id: "duplex_color",
          label: "Full Color (Bolak-Balik)",
          price: 2500,
          description: "Warna Tajam / Foto Full",
        },
      ],

      // === 3. FINISHING (COVER & JILID) ===
      finishing_groups: [
        {
          id: "fin_cover_material",
          title: "Pilihan Cover (Sampul)",
          type: "radio",
          price_mode: "PER_JOB",
          required: true,
          options: [
            { label: "Self Cover (Sama dengan Isi)", price: 0 },
            { label: "Softcover (Art Carton 260gr)", price: 3000 },
            { label: "Hardcover (Karton Tebal)", price: 25000 }, // Tambahan Hardcover
          ],
        },
        {
          id: "fin_lamination",
          title: "Laminasi Cover",
          type: "radio",
          price_mode: "PER_JOB",
          required: false,
          options: [
            { label: "Tanpa Laminasi", price: 0 },
            { label: "Laminasi Glossy (Kilap)", price: 2000 },
            { label: "Laminasi Doff (Matte)", price: 2000 },
          ],
        },
        {
          id: "fin_binding_mag",
          title: "Jilid / Binding",
          type: "radio",
          price_mode: "PER_JOB",
          required: true,
          options: [
            { label: "Staples Tengah (Saddle Stitch)", price: 1500 },
            { label: "Lem Panas (Perfect Binding)", price: 4000 },
            { label: "Spiral Kawat (Wire Binding)", price: 8000 },
          ],
        },
      ],

      is_active: 1,
      is_archived: 0,
    });

    console.log("✅ PRODUK MAJALAH + HVS BERHASIL DIUPDATE!");
  } catch (error) {
    console.error("❌ GAGAL UPDATE MAJALAH:", error);
  }
}
