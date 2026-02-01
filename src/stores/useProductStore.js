/**
 * Product Store - Zustand (GEN 4.8 - TIERED PRICING FIRST CLASS)
 * State management for master data
 * UPDATE:
 * 1. Supports Junction Table for Finishings (product_finishings)
 * 2. Filters Sizes per Product (Smart Matrix)
 * 3. Handles Cross-Reference Materials
 * 4. AGGRESSIVE GHOSTBUSTER: Auto-deletes duplicate local products
 * 5. ✅ NEW: Fetches 'product_price_tiers' & Injects into advanced_features
 */

import { create } from "zustand";
import db from "../data/db/schema";
import { Category } from "../data/models/Category";
import { Product } from "../data/models/Product";
import { Finishing } from "../data/models/Finishing";

export const useProductStore = create((set, get) => ({
  // State
  categories: [],
  loading: false,
  error: null,
  isInitialized: false,

  /**
   * Initialize: Load master data from DB
   */
  initialize: async () => {
    if (get().isInitialized) return get().categories;
    set({ loading: true, error: null });
    try {
      const categories = await get().fetchMasterData();
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
          .map((m) => ({
            id: m.id,
            label: m.label || m.name,
            name: m.name || m.label,
            price: m.price_per_unit || 0,
            specs: m.specs || "",
            display_order: m.display_order || 99,
            width: m.width,
          }))
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
  updateProduct: async (id, d) => {
    await db.products.update(id, d);
    await get().fetchMasterData();
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
  clearError: () => set({ error: null }),
}));

if (typeof window !== "undefined") {
  window.reloadMasterData = () => useProductStore.getState().fetchMasterData();
}

export default useProductStore;
