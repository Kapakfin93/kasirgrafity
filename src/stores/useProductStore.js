/**
 * Product Store - Zustand
 * State management for master data (categories, products, finishings)
 * Replaces static MASTER_DATA import with database-backed CRUD
 * Includes passive cleanup for race condition duplicates
 */

import { create } from 'zustand';
import db from '../data/db/schema';
import { Category } from '../data/models/Category';
import { Product } from '../data/models/Product';
import { Finishing } from '../data/models/Finishing';
import { seedMasterData, checkAndCleanupDuplicates } from '../data/db/seedMasterData';

// Expected category count (for duplicate detection)
const EXPECTED_CATEGORY_COUNT = 7;

export const useProductStore = create((set, get) => ({
    // State
    categories: [],
    loading: false,
    error: null,
    isInitialized: false,

    /**
     * Initialize: Load master data from DB (or seed if empty)
     * Includes passive cleanup for race condition duplicates
     */
    initialize: async () => {
        if (get().isInitialized) return get().categories;

        set({ loading: true, error: null });

        try {
            // 1. Check and cleanup duplicates (passive fix for race condition)
            const wasCleanedUp = await checkAndCleanupDuplicates(EXPECTED_CATEGORY_COUNT);
            if (wasCleanedUp) {
                console.log('🧹 PASSIVE CLEANUP: Duplicates removed and re-seeded');
            }

            // 2. Seed if needed (idempotent, safe to call multiple times)
            await seedMasterData();

            // 3. Fetch and reconstruct
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
            const allCategories = await db.categories.orderBy('sort_order').toArray();
            const categoriesRaw = allCategories.filter(c => c.is_active !== false);

            const allProducts = await db.products.toArray();
            const productsRaw = allProducts.filter(p => p.is_active !== false);

            const allFinishings = await db.finishings.toArray();
            const finishingsRaw = allFinishings.filter(f => f.is_active !== false);

            // Reconstruct nested structure (same as old MASTER_DATA)
            const categories = categoriesRaw.map(cat => ({
                id: cat.id,
                name: cat.name,
                logic_type: cat.logic_type,
                products: productsRaw
                    .filter(p => p.categoryId === cat.id)
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        prices: p.prices, // For MATRIX type
                    })),
                finishings: finishingsRaw
                    .filter(f => f.categoryId === cat.id)
                    .map(f => ({
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

// Export for backward compatibility
export default useProductStore;
