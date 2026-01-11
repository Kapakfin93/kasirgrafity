/**
 * Finishing Model
 * Master data for finishing options linked to categories
 * UUID-based primary key (Supabase Ready)
 */

import { v4 as uuidv4 } from 'uuid';

export class Finishing {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.categoryId = data.categoryId || null;
        this.name = data.name || '';
        this.price = data.price || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            categoryId: this.categoryId,
            name: this.name,
            price: this.price,
            is_active: this.is_active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    static fromDB(record) {
        return new Finishing(record);
    }
}
