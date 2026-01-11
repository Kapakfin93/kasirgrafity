/**
 * Attendance Model
 * Data structure for employee attendance tracking
 */

export class Attendance {
    constructor(data = {}) {
        this.id = data.id || null;
        this.employeeId = data.employeeId || null;
        this.employeeName = data.employeeName || ''; // Denormalized for quick display
        this.date = data.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        this.shift = data.shift || 'PAGI'; // PAGI | MALAM
        this.status = data.status || 'PRESENT'; // PRESENT | LATE | ABSENT
        this.checkInTime = data.checkInTime || null;
        this.checkOutTime = data.checkOutTime || null;
        this.totalHours = data.totalHours || 0;
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date().toISOString();
    }

    /**
     * Convert to plain object for storage
     */
    toJSON() {
        const obj = {
            employeeId: this.employeeId,
            employeeName: this.employeeName,
            date: this.date,
            shift: this.shift,
            status: this.status,
            checkInTime: this.checkInTime,
            checkOutTime: this.checkOutTime,
            totalHours: this.totalHours,
            notes: this.notes,
            createdAt: this.createdAt,
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
        return new Attendance(record);
    }

    /**
     * Check if checked in
     */
    isCheckedIn() {
        return this.checkInTime !== null;
    }

    /**
     * Check if checked out
     */
    isCheckedOut() {
        return this.checkOutTime !== null;
    }

    /**
     * Calculate work hours
     */
    calculateHours() {
        if (!this.checkInTime || !this.checkOutTime) {
            return 0;
        }

        const start = new Date(this.checkInTime);
        const end = new Date(this.checkOutTime);
        const diff = end - start;

        return (diff / (1000 * 60 * 60)).toFixed(2); // hours with 2 decimals
    }
}
