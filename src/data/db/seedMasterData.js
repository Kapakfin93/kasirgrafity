/**
 * Seed Master Data Script - IDEMPOTENT & RACE-SAFE
 * Migrates static MASTER_DATA from initialData.js to Dexie DB
 * Uses atomic checks to prevent double-seeding in React Strict Mode
 */

import { v4 as uuidv4 } from 'uuid';
import db from './schema';
import { MASTER_DATA } from '../initialData';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Finishing } from '../models/Finishing';

// Singleton flag to prevent concurrent runs
let isSeeding = false;

/**
 * Seed master data - IDEMPOTENT
 * Safe to call multiple times, will only seed once
 */
export async function seedMasterData() {
    // Race condition guard
    if (isSeeding) {
        console.log('🔒 SEEDER LOCKED: Another seeding process is running.');
        return false;
    }

    try {
        isSeeding = true;

        // 1. ATOMIC CHECK: Look for specific data, not just count
        const existing = await db.categories.where('name').startsWith('Banner').first();

        if (existing) {
            console.log('🛡️ SEEDER SKIPPED: Master data already exists (Verified).');
            return false;
        }

        console.log('🌱 STARTING ATOMIC SEEDING...');

        // 2. TRANSACTION BLOCK with double-check
        await db.transaction('rw', db.categories, db.products, db.finishings, async () => {
            // Double check inside transaction (belt & suspenders)
            const count = await db.categories.count();
            if (count > 0) {
                console.log('🛡️ SEEDER: Found existing data inside transaction. Aborting.');
                return;
            }

            let sortOrder = 0;

            for (const catData of MASTER_DATA.categories) {
                // Create Category with new UUID
                const category = new Category({
                    name: catData.name,
                    logic_type: catData.logic_type,
                    sort_order: sortOrder++,
                    is_active: true,
                });

                // Save category
                await db.categories.put(category.toJSON());
                console.log(`✅ Category: ${category.name}`);

                // Create Products for this category
                if (catData.products?.length > 0) {
                    for (const prodData of catData.products) {
                        // BYPASS PRODUCT MODEL - Save Raw Object Directly to prevent data stripping
                        const rawProductData = {
                            id: prodData.id || uuidv4(), // Generate ID if not present
                            categoryId: category.id,
                            name: prodData.name,
                            is_active: true,

                            // Legacy pricing fields
                            price: prodData.price || prodData.base_price || 0,
                            prices: prodData.prices || null,

                            // ADVANCED PRICING FIELDS (CRITICAL - FORCE INJECTION)
                            pricing_model: catData.logic_type === 'ADVANCED' ? 'ADVANCED' : catData.logic_type,
                            base_price: prodData.base_price || prodData.price || 0,
                            // Deep clone to prevent reference issues
                            advanced_features: prodData.advanced_features ? JSON.parse(JSON.stringify(prodData.advanced_features)) : null,

                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        // Save raw object directly to IndexedDB (bypasses model class filtering)
                        await db.products.put(rawProductData);

                        // Debug log for ADVANCED products
                        if (rawProductData.pricing_model === 'ADVANCED') {
                            console.log(`   📦 ADVANCED Product: ${rawProductData.name}`, {
                                pricing_model: rawProductData.pricing_model,
                                base_price: rawProductData.base_price,
                                has_advanced_features: !!rawProductData.advanced_features,
                                wholesale_rules: rawProductData.advanced_features?.wholesale_rules?.length || 0,
                                finishing_groups: rawProductData.advanced_features?.finishing_groups?.length || 0
                            });
                        }
                    }
                    console.log(`   └── ${catData.products.length} products`);
                }

                // Create Finishings for this category
                if (catData.finishings?.length > 0) {
                    for (const finData of catData.finishings) {
                        const finishing = new Finishing({
                            categoryId: category.id,
                            name: finData.name,
                            price: finData.price || 0,
                            is_active: true,
                        });

                        await db.finishings.put(finishing.toJSON());
                    }
                    console.log(`   └── ${catData.finishings.length} finishings`);
                }
            }
        });

        console.log('🎉 SEEDING COMPLETE!');
        console.log(`   Categories: ${await db.categories.count()}`);
        console.log(`   Products: ${await db.products.count()}`);
        console.log(`   Finishings: ${await db.finishings.count()}`);

        return true;
    } catch (error) {
        console.error('❌ SEEDING ERROR:', error);
        throw error;
    } finally {
        isSeeding = false;
    }
}

/**
 * Force reset master data - EMERGENCY USE ONLY
 * Clears all master data and re-seeds
 */
export async function forceResetMasterData() {
    console.warn('⚠️ FORCE RESETTING MASTER DATA...');

    isSeeding = false; // Clear lock

    try {
        await db.transaction('rw', db.categories, db.products, db.finishings, async () => {
            await db.categories.clear();
            await db.products.clear();
            await db.finishings.clear();
        });

        console.log('🧹 DATABASE CLEARED.');

        // Re-seed
        await seedMasterData();

        return true;
    } catch (error) {
        console.error('❌ FORCE RESET ERROR:', error);
        throw error;
    }
}

/**
 * Check and auto-cleanup duplicates
 * Returns true if cleanup was performed
 */
export async function checkAndCleanupDuplicates(expectedCategoryCount = 13) {
    const count = await db.categories.count();

    if (count > expectedCategoryCount) {
        console.warn(`⚠️ DUPLICATE DETECTED: Found ${count} categories, expected ${expectedCategoryCount}`);
        await forceResetMasterData();
        return true;
    }

    return false;
}

export default seedMasterData;
