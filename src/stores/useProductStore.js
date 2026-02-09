/**
 * Product Store - Zustand (GEN 4.8 - TIERED PRICING FIRST CLASS)
 * State management for master data
 * UPDATE:
 * 1. Supports Junction Table for Finishings (product_finishings)
 * 2. Filters Sizes per Product (Smart Matrix)
 * 3. Handles Cross-Reference Materials
 * 4. AGGRESSIVE GHOSTBUSTER: Auto-deletes duplicate local products
 * 5. ✅ NEW: Fetches 'product_price_tiers' & Injects into advanced_features
 * 6. 🛠️ FIX: Added Payload Sanitizer & Universal Router for Split-Brain Fix
 */

import { create } from "zustand";
import db from "../data/db/schema";
import { Category } from "../data/models/Category";
import { Product } from "../data/models/Product";
import { Finishing } from "../data/models/Finishing";
import { syncMatrixPricesToSupabase } from "../services/matrixPriceService";

export const useProductStore = create((set, get) => ({
  // State
  categories: [],
  loading: false,
  error: null,
  isInitialized: false,
  realtimeChannel: null, // ✅ NEW: Realtime subscription reference

  /**
   * Initialize: Load master data from DB
   */
  initialize: async () => {
    if (get().isInitialized) return get().categories;
    set({ loading: true, error: null });
    try {
      const categories = await get().fetchMasterData();

      // ✅ NEW: Start realtime subscription after initial load
      await get().subscribeToRealtimeUpdates();

      set({ isInitialized: true, loading: false });
      return categories;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * ✅ Cloud Sync for Categories
   */
  syncCategoriesFromCloud: async () => {
    const { supabase } = await import("../services/supabaseClient");
    console.log("☁️ Syncing categories from Cloud...");
    try {
      const { data: cloudCategories, error } = await supabase
        .from("product_categories")
        .select("id, name, logic_type, is_active")
        .eq("is_active", true);

      if (error) throw error;
      if (!cloudCategories || cloudCategories.length === 0) return;

      const existingCategories = await db.categories.toArray();
      const existingMap = new Map(existingCategories.map((c) => [c.id, c]));

      const mergedData = cloudCategories.map((cloudCat) => {
        const local = existingMap.get(cloudCat.id);
        return {
          id: cloudCat.id,
          name: cloudCat.name,
          logic_type: cloudCat.logic_type,
          is_active: cloudCat.is_active ? 1 : 0,
          icon: local?.icon || "List",
          color: local?.color || "slate",
          description: local?.description || "",
          sort_order: local?.sort_order ?? 99,
        };
      });

      await db.categories.bulkPut(mergedData);
      console.log(`✅ Synced ${mergedData.length} categories from Cloud`);
    } catch (err) {
      console.error("❌ Cloud Category Sync Failed:", err);
    }
  },

  /**
   * ✅ NEW: Cloud Product Sync (GEN 4.7)
   */
  syncCloudProducts: async () => {
    const { supabase } = await import("../services/supabaseClient");
    console.log("☁️ Syncing Cloud Products (GEN 4.8 WITH TIERS)...");

    // Daftar Kategori yang dikelola Cloud
    const targetCategories = [
      "CUSTOM_SERVICES",
      "MERCH_APPAREL",
      "CAT_OUTDOOR",
      "CAT_ROLLS",
      "CAT_POSTER",
      "STATIONERY_OFFICE",
      "DIGITAL_A3_PRO",
    ];

    try {
      // 1. Fetch Products
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("*")
        .in("category_id", targetCategories)
        .eq("is_active", true);

      if (productError) throw productError;
      if (!products || products.length === 0) return;

      const productIds = products.map((p) => p.id);

      // =========================================================
      // 🗺️ 2. FETCH THE MAPS (Matrix, Junctions, & TIERS)
      // =========================================================

      const { data: matrixPrices } = await supabase
        .from("product_price_matrix")
        .select("*")
        .in("product_id", productIds);

      // ✅ NEW: FETCH TIERS (GROSIR) DARI TABEL BARU
      const { data: priceTiers } = await supabase
        .from("product_price_tiers")
        .select("*")
        .in("product_id", productIds)
        .order("min_qty", { ascending: true });

      const { data: productFinishingsMap } = await supabase
        .from("product_finishings")
        .select("product_id, finishing_id")
        .in("product_id", productIds);

      // =========================================================
      // 📦 3. FETCH THE GOODS (Real Data)
      // =========================================================

      const { data: allSizes } = await supabase
        .from("product_sizes")
        .select("*")
        .order("id", { ascending: true });

      const matrixMaterialIds = matrixPrices?.map((m) => m.material_id) || [];
      const { data: materials, error: materialError } = await supabase
        .from("product_materials")
        .select("*")
        .or(
          `product_id.in.(${productIds.join(",")}),id.in.(${matrixMaterialIds.length > 0 ? matrixMaterialIds.join(",") : "nomatch"})`,
        )
        .eq("is_active", true);

      if (materialError) throw materialError;

      const finishingIds =
        productFinishingsMap?.map((pf) => pf.finishing_id) || [];
      const { data: finishings, error: finishingError } = await supabase
        .from("finishing_options")
        .select("*")
        .or(
          `product_id.in.(${productIds.join(",")}),finishing_id.in.(${finishingIds.length > 0 ? finishingIds.join(",") : "nomatch"})`,
        )
        .order("display_order", { ascending: true });

      if (finishingError) throw finishingError;

      // =========================================================
      // 🪡 4. STITCHING (JAHIT DATA)
      // =========================================================
      const mappedProducts = products.map((p) => {
        const isMatrix =
          p.calc_engine === "MATRIX" || p.category_id === "CAT_POSTER";
        const productMatrix =
          matrixPrices?.filter((mx) => mx.product_id === p.id) || [];

        // --- A. JAHIT VARIAN / MATERIAL ---
        let finalVariants =
          materials?.filter((m) => m.product_id === p.id) || [];
        if (isMatrix && productMatrix.length > 0) {
          const usedMaterialIds = [
            ...new Set(productMatrix.map((pm) => pm.material_id)),
          ];
          const matrixMaterials =
            materials?.filter((m) => usedMaterialIds.includes(m.id)) || [];
          finalVariants = [...finalVariants, ...matrixMaterials];
          finalVariants = [
            ...new Map(finalVariants.map((item) => [item.id, item])).values(),
          ];
        }

        const variants = finalVariants
          .map((m) => {
            // --- C.2. JAHIT MATRIX PRICE LIST (The Missing Link) ---
            let priceList = undefined;
            if (isMatrix && productMatrix.length > 0) {
              const relevantMatrixRows = productMatrix.filter(
                (pm) => pm.material_id === m.id,
              );
              if (relevantMatrixRows.length > 0) {
                priceList = {};
                relevantMatrixRows.forEach((row) => {
                  priceList[row.size_id] = row.price;
                });
              }
            }

            return {
              id: m.id,
              label: m.label || m.name,
              name: m.name || m.label,
              price: m.price_per_unit || 0,
              specs: m.specs || "",
              display_order: m.display_order || 99,
              width: m.width,
              price_list: priceList, // ✅ INJECTED: Allow Matrix Editor to render inputs
            };
          })
          .sort((a, b) => a.display_order - b.display_order);

        // --- B. JAHIT FINISHING ---
        const directFinishings =
          finishings?.filter((f) => f.product_id === p.id) || [];
        const linkedFinishingIds =
          productFinishingsMap
            ?.filter((pf) => pf.product_id === p.id)
            .map((pf) => pf.finishing_id) || [];
        const linkedFinishings =
          finishings?.filter((f) =>
            linkedFinishingIds.includes(f.finishing_id),
          ) || [];

        const allProductFinishings = [...directFinishings, ...linkedFinishings];

        const finishingMap = {};
        allProductFinishings.forEach((row) => {
          if (!finishingMap[row.group_key]) {
            finishingMap[row.group_key] = {
              id: row.group_key,
              title: row.group_title,
              type: row.type || "radio",
              required: row.is_required || false,
              options: [],
            };
          }
          finishingMap[row.group_key].options.push({
            label: row.label,
            price: row.price || 0,
          });
        });
        const finishingGroups = Object.values(finishingMap);

        // --- C. JAHIT MATRIX & UKURAN ---
        let productSizes = undefined;
        if (isMatrix) {
          if (productMatrix.length > 0) {
            const usedSizeIds = [
              ...new Set(productMatrix.map((pm) => pm.size_id)),
            ];
            productSizes = allSizes?.filter((s) => usedSizeIds.includes(s.id));
          } else {
            productSizes = allSizes;
          }
        }

        // --- D. ✅ INJECT LOGIC TIERS KE ADVANCED_FEATURES ---
        // Kita bypass: Ambil data dari tabel tiers, tapi kita format seolah-olah dari JSON lama
        // agar logic frontend existing (Calculator Engine) tetap jalan tanpa diubah.
        let advancedFeatures = p.advanced_features || {};

        const productTiers =
          priceTiers?.filter((t) => t.product_id === p.id) || [];

        if (productTiers.length > 0) {
          // Kita rekonstruksi format JSON lama: [{min, max, value, type}]
          const injectedRules = productTiers.map((t) => ({
            min: t.min_qty,
            max: t.max_qty,
            value: Number(t.value),
            type: t.type,
          }));

          // Timpa/Isi wholesale_rules dengan data segar dari tabel
          advancedFeatures = {
            ...advancedFeatures,
            wholesale_rules: injectedRules,
          };
        }

        return {
          id: p.id,
          categoryId: p.category_id,
          name: p.name,
          description: p.description,
          price: p.base_price || 0,
          base_price: p.base_price,
          input_mode: p.input_mode || "MANUAL",
          calc_engine: p.calc_engine || "MANUAL",
          is_active: p.is_active ? 1 : 0,
          is_archived: 0,
          pricing_model: p.pricing_model,
          advanced_features: advancedFeatures, // ✅ Updated with real DB Tiers

          variants,
          finishing_groups:
            finishingGroups.length > 0 ? finishingGroups : undefined,

          sizes: productSizes,
          price_matrix: isMatrix ? productMatrix : undefined,
          prices: isMatrix ? productMatrix : undefined,
        };
      });

      // 5. Simpan ke Database Lokal
      await db.products.bulkPut(mappedProducts);

      // =========================================================
      // 🗑️ 6. GHOSTBUSTER V2 (HAPUS HANTU AGRESIF)
      // =========================================================
      const allLocalProducts = await db.products.toArray();
      const officialIds = new Set(productIds);

      const ghostProducts = allLocalProducts.filter((p) => {
        const isOfficial = officialIds.has(p.id);
        if (isOfficial) return false;

        const isTargetCategory = targetCategories.includes(p.categoryId);
        const isSuspiciousName = /DTF|Stiker|Meteran/i.test(p.name);

        return isTargetCategory || isSuspiciousName;
      });

      if (ghostProducts.length > 0) {
        console.warn(
          `👻 Ghostbuster V2 found ${ghostProducts.length} intruders. Executing...`,
        );
        const ghostIds = ghostProducts.map((p) => p.id);
        await db.products.bulkDelete(ghostIds);
        console.log("🧹 Ghostbuster V2: Area Cleaned.");
      }
      // =========================================================

      console.log(
        `✅ Synced & Cleaned ${mappedProducts.length} Cloud Products`,
      );
    } catch (err) {
      console.error("❌ Cloud Product Sync Failed:", err);
    }
  },

  /**
   * Fetch all master data and reconstruct nested structure
   */
  fetchMasterData: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().syncCategoriesFromCloud(),
        get().syncCloudProducts(),
      ]);

      const allCategories = await db.categories.toArray();
      const categoriesRaw = allCategories.filter((c) => c.is_active !== false);
      const allProducts = await db.products.toArray();
      const productsRaw = allProducts.filter(
        (p) => p.is_active !== false && p.is_archived !== 1,
      );
      const allFinishings = await db.finishings.toArray();
      const finishingsRaw = allFinishings.filter((f) => f.is_active !== false);

      const categories = categoriesRaw.map((cat) => ({
        id: cat.id,
        name: cat.name,
        logic_type: cat.logic_type,
        products: productsRaw.filter((p) => p.categoryId === cat.id),
        finishings: finishingsRaw.filter((f) => f.categoryId === cat.id),
      }));

      set({ categories, loading: false });
      return categories;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Standard CRUD wrappers
  getCategories: () => get().categories,
  addCategory: async (d) => {
    await db.categories.put(new Category(d).toJSON());
    await get().fetchMasterData();
  },
  updateCategory: async (id, d) => {
    await db.categories.update(id, d);
    await get().fetchMasterData();
  },
  deleteCategory: async (id) => {
    await db.categories.update(id, { is_active: false });
    await get().fetchMasterData();
  },
  addProduct: async (catId, d) => {
    await db.products.put(new Product({ ...d, categoryId: catId }).toJSON());
    await get().fetchMasterData();
  },

  // =========================================================================
  // 🚨 CRITICAL UPDATE: FIXED SPLIT-BRAIN + SANITIZER + UNIVERSAL ROUTER 🚨
  // =========================================================================
  updateProduct: async (id, d) => {
    // 0. CAPTURE RAW PAYLOAD (Prevents Sanitizer Stripping)
    // const productData = d; // REMOVED: Refactored to use 'd' directly in generic router

    // 1. Update Database Lokal (Dexie) - Agar UI responsif duluan
    await db.products.update(id, d);

    // =========================================================
    // 🕵️ FORENSIC TRAP START (ENHANCED WITH SANITIZER)
    // =========================================================
    const { supabase } = await import("../services/supabaseClient");
    const productId = id;
    const updates = d;

    console.group("🚨 AUDIT EDIT PRODUK: " + productId);

    // A. LOG DATA MENTAH (YANG BIKIN ERROR MERAH)
    console.log("1. 🔴 PAYLOAD MENTAH (UI):", updates);

    // B. JALANKAN PEMBERSIH (SANITIZER)
    // Pastikan fungsi preparePayloadForDB ada di paling bawah file ini!
    let cleanPayload = {};
    try {
      cleanPayload = preparePayloadForDB(updates);
      console.log("2. 🟢 PAYLOAD BERSIH (DB):", cleanPayload);
    } catch (err) {
      console.warn(
        "⚠️ Sanitizer belum dipasang di bawah, pakai raw data.",
        err,
      );
      cleanPayload = updates; // Fallback jika fungsi lupa dipasang
    }

    // C. UPDATE TABEL PRODUCTS (KULIT)
    const { data: logData, error: logError } = await supabase
      .from("products")
      .update(cleanPayload) // 👈 KITA KIRIM DATA BERSIH
      .eq("id", productId)
      .select();

    // D. LAPORAN HASIL
    if (logError) {
      console.error("3. ❌ GAGAL UPDATE METADATA:", logError.message);
      console.error(" DETAILS:", logError);
    } else {
      console.log("3. ✅ SUKSES UPDATE METADATA (Tabel Product Aman)");

      // Verifikasi Data Balikan
      if (logData && logData[0]) {
        const serverPrice = logData[0].base_price || logData[0].price;
        const sentPrice = cleanPayload.base_price || cleanPayload.price;

        console.log(
          `4. ⚖️ VERIFIKASI: Kirim ${sentPrice} vs Terima ${serverPrice} -> ${sentPrice == serverPrice ? "MATCH ✅" : "MISMATCH ❌"}`,
        );
      }
    }
    // 🕵️ FORENSIC TRAP END

    // 🚦 UNIVERSAL TRAFFIC ROUTER (FINAL GENERIC VERSION)
    // =========================================================

    // 1. Capture Raw Variants directly from Argument (d)
    const rawVariants = d.variants || [];

    // 2. Identify Context
    const currentProduct = await db.products.get(id);
    const engine = currentProduct?.calc_engine || d.calc_engine || "UNKNOWN";
    console.log(`🚦 ROUTER ENGINE: ${engine}`);

    // 3. LOGIC BRANCHING
    const isMatrix =
      ["MATRIX", "MATRIX_FIXED"].includes(engine) ||
      d.categoryId === "CAT_POSTER";
    const hasVariantsToUpdate = rawVariants.length > 0;

    // BRANCH A: MATRIX PRODUCTS (Complex Grid)
    if (isMatrix) {
      console.log("➡️ ROUTE: MATRIX -> Syncing Matrix Prices...");
      await syncMatrixPricesToSupabase(id, rawVariants);
      console.log("✅ Matrix Sync Service Called");
    }

    // BRANCH B: ALL OTHER PRODUCTS WITH VARIANTS (Linear, Area, Unit, Stationery, etc.)
    // This covers ALL 7 Categories automatically if they have variants.
    else if (hasVariantsToUpdate) {
      console.log("➡️ ROUTE: MATERIAL/VARIANT UPDATE (Generic)...");
      console.log(
        `📦 Updating ${rawVariants.length} variants in product_materials...`,
      );

      for (const variant of rawVariants) {
        if (variant.id && variant.price !== undefined) {
          // Sanitasi Harga: "1.234.567" -> 1234567 (Integer)
          const rawPrice = variant.price.toString().replace(/\D/g, "");
          const cleanPrice = rawPrice ? parseInt(rawPrice, 10) : 0;

          const { error: matError } = await supabase
            .from("product_materials")
            .update({ price_per_unit: cleanPrice })
            .eq("id", variant.id);

          if (matError) {
            console.error(
              `❌ Material Update Failed (${variant.id}):`,
              matError.message,
            );
          } else {
            console.log(`✅ Material Updated: ${variant.id} -> ${cleanPrice}`);
          }
        }
      }
    }

    // BRANCH C: NO VARIANTS (Standard Metadata Only)
    else {
      console.log("➡️ ROUTE: STANDARD METADATA ONLY (No sub-table updates)");
    }

    console.groupEnd(); // Tutup Group Log
    await get().fetchMasterData(); // Refresh Data Lokal
  },

  deleteProduct: async (id) => {
    await db.products.update(id, { is_active: false });
    await get().fetchMasterData();
  },
  addFinishing: async (catId, d) => {
    await db.finishings.put(
      new Finishing({ ...d, categoryId: catId }).toJSON(),
    );
    await get().fetchMasterData();
  },
  updateFinishing: async (id, d) => {
    await db.finishings.update(id, d);
    await get().fetchMasterData();
  },
  deleteFinishing: async (id) => {
    await db.finishings.update(id, { is_active: false });
    await get().fetchMasterData();
  },
  /**
   * ⚡ REALTIME SUBSCRIPTION - With Debounce Guard
   * Subscribe to 5 price tables, trigger full sync on any change
   * Debounce: Wait 2 seconds of silence before syncing (Anti-Thundering Herd)
   */
  subscribeToRealtimeUpdates: async () => {
    const { supabase } = await import("../services/supabaseClient");

    // Prevent duplicate subscriptions
    if (get().realtimeChannel) {
      console.log("⚡ Realtime already subscribed");
      return;
    }

    console.log("⚡ Starting Realtime Subscription...");

    let debounceTimer = null;

    // HANDLER DENGAN DEBOUNCE (PENGAMAN ANTI-THUNDERING HERD)
    const handleRealtimeEvent = (payload) => {
      console.log(`🔔 Change detected in ${payload.table}:`, payload.eventType);

      // Reset timer jika ada event baru masuk beruntun
      if (debounceTimer) clearTimeout(debounceTimer);

      // Tunggu 2 detik hening, baru Sync
      debounceTimer = setTimeout(() => {
        console.log("🔄 Triggering Full Sync after debounce...");
        get().syncCloudProducts();
      }, 2000);
    };

    const channel = supabase
      .channel("product-price-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        handleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_materials" },
        handleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_price_matrix" },
        handleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_price_tiers" },
        handleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finishing_options" },
        handleRealtimeEvent,
      )
      .subscribe((status) => {
        console.log("⚡ Realtime Status:", status);
      });

    set({ realtimeChannel: channel });
  },

  /**
   * Unsubscribe from realtime (for cleanup)
   */
  unsubscribeFromRealtime: async () => {
    const channel = get().realtimeChannel;
    if (channel) {
      const { supabase } = await import("../services/supabaseClient");
      await supabase.removeChannel(channel);
      set({ realtimeChannel: null });
      console.log("⚡ Realtime unsubscribed");
    }
  },

  clearError: () => set({ error: null }),
}));

if (typeof window !== "undefined") {
  window.reloadMasterData = () => useProductStore.getState().fetchMasterData();
}

export default useProductStore;

// =========================================================
// 🛠️ UTILITY: PAYLOAD SANITIZER (SI PEMBERSIH & PENERJEMAH)
// =========================================================
const preparePayloadForDB = (frontendData) => {
  const cleanData = {};

  // 1. DAFTAR BLACKLIST (Barang Terlarang masuk Tabel Products)
  // Ditambah 'price_tiers' & 'print_modes' sesuai temuan error
  const forbiddenFields = [
    "materials",
    "variants",
    "finishing_groups",
    "matrix",
    "sales",
    "prices",
    "sizes",
    "price_matrix",
    "price_tiers", // 👈 DIBLOKIR (Mencegah error price_tiers not found)
    "print_modes", // 👈 DIBLOKIR (Jaga-jaga)
    "advanced_features", // Opsional: Jika logicnya kompleks, kadang perlu diblokir atau dibiarkan (tergantung kebutuhan)
  ];

  Object.keys(frontendData).forEach((key) => {
    // A. Buang field terlarang
    if (forbiddenFields.includes(key)) return;

    // B. Mapping Manual (Kamus Penerjemah CamelCase -> Snake_case)
    if (key === "categoryId") cleanData["category_id"] = frontendData[key];
    else if (key === "inputMode") cleanData["input_mode"] = frontendData[key];
    else if (key === "isActive") cleanData["is_active"] = frontendData[key];
    else if (key === "basePrice") cleanData["base_price"] = frontendData[key];
    else if (key === "pricingModel")
      cleanData["pricing_model"] = frontendData[key];
    else if (key === "calcEngine") cleanData["calc_engine"] = frontendData[key];
    // Mapping 'price' -> 'base_price' (Penyelamat Error Price)
    else if (key === "price") {
      cleanData["base_price"] = frontendData[key];
    }

    // C. Salin sisanya yang aman
    else {
      cleanData[key] = frontendData[key];
    }
  });

  // 🚨 REVISI PENTING:
  // HAPUS baris 'updated_at' karena tabel Anda TIDAK PUNYA kolom ini.
  // cleanData["updated_at"] = new Date();  <-- INI PENYEBAB ERROR, SAYA MATIKAN.

  return cleanData;
};
