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
      // STRICT FILTER: Only categories with is_active === 1 (not 0, not undefined, not false)
      const categoriesRaw = allCategories.filter((c) => c.is_active === 1);

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

  updateProduct: async (id, updates) => {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await get().fetchMasterData();
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
