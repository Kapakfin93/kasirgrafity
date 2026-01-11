/**
 * Category Model
 * Master data for product categories with pricing logic
 * UUID-based primary key (Supabase Ready)
 */

import { v4 as uuidv4 } from 'uuid';

export class Category {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.name = data.name || '';
        this.logic_type = data.logic_type || 'MANUAL'; // AREA | LINEAR | MATRIX | UNIT | UNIT_SHEET | MANUAL
        this.sort_order = data.sort_order || 0;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            logic_type: this.logic_type,
            sort_order: this.sort_order,
            is_active: this.is_active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    static fromDB(record) {
        return new Category(record);
    }
}
