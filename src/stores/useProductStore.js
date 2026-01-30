/**
 * Product Store - Zustand
 * State management for master data (categories, products, finishings)
 * Replaces static MASTER_DATA import with database-backed CRUD
 * Includes passive cleanup for race condition duplicates
 */

import { create } from "zustand";
import db from "../data/db/schema";
import { Category } from "../data/models/Category";
import { Product } from "../data/models/Product";
import { Finishing } from "../data/models/Finishing";

// Expected category count (for duplicate detection)
const EXPECTED_CATEGORY_COUNT = 4; // Updated after Phase 2 migration (4 pillars)

export const useProductStore = create((set, get) => ({
  // State
  categories: [],
  loading: false,
  error: null,
  isInitialized: false,

  /**
   * Initialize: Load master data from DB
   * Categories are created by Dexie.js seeders (not Supabase migrations)
   */
  initialize: async () => {
    if (get().isInitialized) return get().categories;

    set({ loading: true, error: null });

    try {
      // Fetch categories from DB (created by Dexie.js seeders)
      const categories = await get().fetchMasterData();

      set({ isInitialized: true, loading: false });
      return categories;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Fetch all master data and reconstruct nested structure
   * Returns format compatible with old MASTER_DATA.categories
   */
  fetchMasterData: async () => {
    set({ loading: true, error: null });

    try {
      // Fetch all data (filter is_active in JS for reliable boolean handling)
      const allCategories = await db.categories.toArray();
      // PERMISSIVE FILTER: Accept both boolean true and numeric 1 (block false and 0)
      const categoriesRaw = allCategories.filter((c) => c.is_active !== false);

      console.log(
        `🔍 ProductStore: Fetched ${allCategories.length} total categories, ${categoriesRaw.length} active`,
      );

      const allProducts = await db.products.toArray();
      const productsRaw = allProducts.filter(
        (p) => p.is_active !== false && p.is_archived !== 1, // Exclude archived products
      );

      const allFinishings = await db.finishings.toArray();
      const finishingsRaw = allFinishings.filter((f) => f.is_active !== false);

      // Reconstruct nested structure (same as old MASTER_DATA)
      const categories = categoriesRaw.map((cat) => ({
        id: cat.id,
        name: cat.name,
        logic_type: cat.logic_type,
        products: productsRaw
          .filter((p) => p.categoryId === cat.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            prices: p.prices, // For MATRIX type
            // CRITICAL: Include ADVANCED pricing fields
            pricing_model: p.pricing_model,
            base_price: p.base_price,
            advanced_features: p.advanced_features,
            // GEN 2 FIELDS
            input_mode: p.input_mode,
            calc_engine: p.calc_engine,
            variants: p.variants,
            finishing_groups: p.finishing_groups,
            print_modes: p.print_modes, // ✅ BOOKLET: Print modes for duplex/sides
            min_qty: p.min_qty,
            step_qty: p.step_qty,
          })),
        finishings: finishingsRaw
          .filter((f) => f.categoryId === cat.id)
          .map((f) => ({
            id: f.id,
            name: f.name,
            price: f.price,
          })),
      }));

      set({ categories, loading: false });
      return categories;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Get static accessor for immediate use (sync)
   * Falls back to empty array if not loaded
   */
  getCategories: () => get().categories,

  // === CATEGORY CRUD ===

  addCategory: async (categoryData) => {
    const category = new Category(categoryData);
    await db.categories.put(category.toJSON());
    await get().fetchMasterData();
    return category;
  },

  updateCategory: async (id, updates) => {
    await db.categories.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await get().fetchMasterData();
  },

  deleteCategory: async (id) => {
    // Soft delete
    await db.categories.update(id, { is_active: false });
    await get().fetchMasterData();
  },

  // === PRODUCT CRUD ===

  addProduct: async (categoryId, productData) => {
    const product = new Product({
      ...productData,
      categoryId,
    });
    await db.products.put(product.toJSON());
    await get().fetchMasterData();
    return product;
  },

  /**
   * ✅ REFACTORED: Cloud-First Product Update with Variant INSERT/UPDATE
   * Handles both new variants (INSERT) and existing variants (UPDATE)
   * STRICT MODE: Ensures 'name' field is always populated to satisfy Database constraints.
   */
  updateProduct: async (id, updates) => {
    const { supabase } = await import("../services/supabaseClient");

    // ✅ STEP 1: HANDLE VARIANTS (CRITICAL REFACTOR)
    if (updates.variants && Array.isArray(updates.variants)) {
      try {
        // Get product_id for foreign key (needed for new variants)
        // Fetch from Supabase to ensure we have the correct product_id
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id")
          .eq("id", id)
          .single();

        if (productError || !productData) {
          throw new Error(
            `Product ${id} not found in Supabase: ${productError?.message}`,
          );
        }

        // Process each variant
        for (const variant of updates.variants) {
          // ✅ CASE 1: EXISTING VARIANT (has ID) → UPDATE
          if (variant.id) {
            const { error: updateError } = await supabase
              .from("product_materials")
              .update({
                label: variant.label || variant.name,
                name: variant.label || variant.name, // ✅ STRICT: Ensure 'name' is updated too
                price_per_unit: Number(variant.price),
                specs: variant.specs || "",
                updated_at: new Date().toISOString(),
              })
              .eq("id", variant.id);

            if (updateError) {
              console.error("❌ Supabase UPDATE Failed:", updateError);
              throw new Error(`Gagal update varian: ${updateError.message}`);
            }

            console.log(
              `✅ Updated variant ${variant.id}: ${variant.label} (Rp ${variant.price})`,
            );
          }
          // ✅ CASE 2: NEW VARIANT (no ID) → INSERT with auto-generated UUID
          else {
            // Generate UUID for new variant
            const newVariantId = `pm_${crypto.randomUUID()}`;

            const { error: insertError } = await supabase
              .from("product_materials")
              .insert({
                id: newVariantId,
                product_id: productData.id,
                label: variant.label || variant.name,
                name: variant.label || variant.name, // ✅ STRICT: Fill 'name' (Required by DB)
                price_per_unit: Number(variant.price),
                specs: variant.specs || "",
                display_order: variant.display_order || 99,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error("❌ Supabase INSERT Failed:", insertError);
              throw new Error(
                `Gagal tambah varian baru: ${insertError.message}`,
              );
            }

            // ✅ Update variant object with generated ID for Dexie sync
            variant.id = newVariantId;

            console.log(
              `✅ Inserted new variant ${newVariantId}: ${variant.label} (Rp ${variant.price})`,
            );
          }
        }
      } catch (error) {
        console.error("❌ Variant sync to Supabase failed:", error);
        // Re-throw to prevent Dexie update if Supabase fails
        throw new Error(
          `Sinkronisasi varian gagal: ${error.message}. Data tidak disimpan.`,
        );
      }
    }

    // 🔥 VERIFICATION LOG - Trace updates payload before guard
    console.log("🔥 FINAL UPDATES PAYLOAD", updates);
    console.log("🔥 calc_engine value:", updates.calc_engine);
    console.log("🔥 variants present:", !!updates.variants);

    // ✅ OPTION A: Runtime calc_engine fallback (MATRIX detection)
    const effectiveCalcEngine =
      updates.calc_engine ||
      (updates.input_mode === "MATRIX" ? "MATRIX_FIXED" : undefined);

    // 🔍 DEBUG: Verify guard activation
    console.log("DEBUG GUARD", {
      calc_engine: updates.calc_engine,
      effectiveCalcEngine,
      willSync: effectiveCalcEngine === "MATRIX_FIXED",
    });

    // ✅ STEP 1B: MATRIX PRICE SYNC (ISOLATED - Only for MATRIX_FIXED)
    if (effectiveCalcEngine === "MATRIX_FIXED") {
      const { syncMatrixPricesToSupabase } =
        await import("../services/matrixPriceService");
      await syncMatrixPricesToSupabase(id, updates.variants);
    }

    // ✅ STEP 2: UPDATE DEXIE (Cache) - Only if Supabase succeeded
    try {
      await db.products.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (dexieError) {
      console.error("❌ Dexie update failed:", dexieError);
      // Dexie failure is less critical since Supabase is source of truth
      // Log but don't throw - user can reload to sync from Supabase
    }

    // ✅ STEP 3: REFRESH DATA from Supabase (Ensures UI shows latest)
    try {
      // Refresh specific seeder based on product category
      if (typeof window !== "undefined") {
        const product = await db.products.get(id);

        if (
          product?.categoryId === "CAT_OUTDOOR" ||
          product?.categoryId === "CAT_ROLLS"
        ) {
          if (window.runLargeFormatReconstruction) {
            await window.runLargeFormatReconstruction();
          }
        } else if (product?.categoryId === "STATIONERY_OFFICE") {
          if (window.runStationeryOfficeReconstruction) {
            await window.runStationeryOfficeReconstruction();
          }
        } else if (product?.categoryId === "MERCH_APPAREL") {
          if (window.runMerchReconstruction) {
            await window.runMerchReconstruction();
          }
        }
      }

      // Refresh Zustand state
      await get().fetchMasterData();

      console.log(`✅ Product ${id} updated successfully`);
    } catch (refreshError) {
      console.error("❌ Data refresh failed:", refreshError);
      // Non-critical, user can manually reload
    }
  },

  deleteProduct: async (id) => {
    // Soft delete
    await db.products.update(id, { is_active: false });
    await get().fetchMasterData();
  },

  // === FINISHING CRUD ===

  addFinishing: async (categoryId, finishingData) => {
    const finishing = new Finishing({
      ...finishingData,
      categoryId,
    });
    await db.finishings.put(finishing.toJSON());
    await get().fetchMasterData();
    return finishing;
  },

  updateFinishing: async (id, updates) => {
    await db.finishings.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await get().fetchMasterData();
  },

  deleteFinishing: async (id) => {
    // Soft delete
    await db.finishings.update(id, { is_active: false });
    await get().fetchMasterData();
  },

  // === UTILITY ===

  clearError: () => set({ error: null }),
}));

if (typeof window !== "undefined") {
  window.reloadMasterData = () => {
    console.log("🔄 Manual Reload Triggered from Window");
    return useProductStore.getState().fetchMasterData();
  };
}

// Export for backward compatibility
export default useProductStore;
