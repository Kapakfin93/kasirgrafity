/**
 * Employee Model
 * Data structure for employee management
 */

export class Employee {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.role = data.role || 'CASHIER'; // OWNER | CASHIER | PRODUCTION
        this.pin = data.pin || '';
        this.shift = data.shift || 'PAGI'; // PAGI | MALAM
        this.status = data.status || 'ACTIVE'; // ACTIVE | INACTIVE
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Convert to plain object for storage
     */
    toJSON() {
        const obj = {
            name: this.name,
            role: this.role,
            pin: this.pin,
            shift: this.shift,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };

        // Only include id if it exists (for updates, not for inserts)
        if (this.id !== null && this.id !== undefined) {
            obj.id = this.id;
        }

        return obj;
    }

    /**
     * Create from database record
     */
    static fromDB(record) {
        return new Employee(record);
    }

    /**
     * Validate employee data
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 3) {
            errors.push('Nama minimal 3 karakter');
        }

        if (!['OWNER', 'CASHIER', 'PRODUCTION'].includes(this.role)) {
            errors.push('Role tidak valid');
        }

        if (!this.pin || !/^\d{4}$/.test(this.pin)) {
            errors.push('PIN harus 4 digit angka');
        }

        if (!['PAGI', 'MALAM'].includes(this.shift)) {
            errors.push('Shift tidak valid');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
