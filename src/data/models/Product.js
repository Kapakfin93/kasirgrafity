/**
 * Product Model
 * Master data for products linked to categories
 * UUID-based primary key (Supabase Ready)
 */

import { v4 as uuidv4 } from 'uuid';

export class Product {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.categoryId = data.categoryId || null;
        this.name = data.name || '';
        this.price = data.price || 0; // For AREA, LINEAR, UNIT pricing
        this.prices = data.prices || null; // For MATRIX pricing: { A2: 40000, A1: 75000, A0: 140000 }
        this.is_active = data.is_active !== undefined ? data.is_active : true;

        // ADVANCED PRICING MODEL SUPPORT
        this.pricing_model = data.pricing_model || null;
        this.base_price = data.base_price || null;
        this.advanced_features = data.advanced_features || null;

        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            categoryId: this.categoryId,
            name: this.name,
            price: this.price,
            prices: this.prices,
            is_active: this.is_active,
            // --- ADVANCED PRICING FIELDS (CRITICAL FIX) ---
            pricing_model: this.pricing_model,
            base_price: this.base_price,
            advanced_features: this.advanced_features,
            // -----------------------------------------------
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    static fromDB(record) {
        return new Product(record);
    }
}

