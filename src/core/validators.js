/**
 * Validation Service
 * Centralized validation logic for all modules
 */

import { BUSINESS_RULES, PRICING_TYPES } from './constants';

/**
 * Validate transaction input based on logic type
 */
export const validateTransactionInput = (logicType, input) => {
    const { product, qty, length, width, sizeKey, manualPrice } = input;

    // Common validations
    if (qty < BUSINESS_RULES.MIN_QUANTITY || qty > BUSINESS_RULES.MAX_QUANTITY) {
        return { valid: false, error: 'Quantity tidak valid' };
    }

    // Logic-specific validations
    const validators = {
        [PRICING_TYPES.AREA]: () => {
            if (!product) return { valid: false, error: 'Pilih produk terlebih dahulu' };
            if (!length || !width) return { valid: false, error: 'Masukkan panjang dan lebar' };
            if (length < BUSINESS_RULES.MIN_DIMENSION || width < BUSINESS_RULES.MIN_DIMENSION) {
                return { valid: false, error: 'Dimensi terlalu kecil' };
            }
            return { valid: true };
        },

        [PRICING_TYPES.LINEAR]: () => {
            if (!product) return { valid: false, error: 'Pilih produk terlebih dahulu' };
            if (!length) return { valid: false, error: 'Masukkan panjang' };
            if (length < BUSINESS_RULES.MIN_DIMENSION) {
                return { valid: false, error: 'Panjang terlalu kecil' };
            }
            return { valid: true };
        },

        [PRICING_TYPES.MATRIX]: () => {
            if (!product) return { valid: false, error: 'Pilih produk terlebih dahulu' };
            if (!sizeKey) return { valid: false, error: 'Pilih ukuran' };
            return { valid: true };
        },

        [PRICING_TYPES.UNIT]: () => {
            if (!product) return { valid: false, error: 'Pilih produk terlebih dahulu' };
            return { valid: true };
        },

        [PRICING_TYPES.UNIT_SHEET]: () => {
            if (!product) return { valid: false, error: 'Pilih produk terlebih dahulu' };
            return { valid: true };
        },

        [PRICING_TYPES.MANUAL]: () => {
            if (!manualPrice || manualPrice <= 0) {
                return { valid: false, error: 'Masukkan harga manual' };
            }
            return { valid: true };
        },
    };

    const validator = validators[logicType];
    if (!validator) {
        return { valid: false, error: 'Tipe logika tidak dikenal' };
    }

    return validator();
};

/**
 * Validate employee data
 */
export const validateEmployee = (employee) => {
    if (!employee.name || employee.name.trim().length < 3) {
        return { valid: false, error: 'Nama minimal 3 karakter' };
    }

    if (!employee.role) {
        return { valid: false, error: 'Pilih role karyawan' };
    }

    if (!employee.pin || employee.pin.length !== 4 || !/^\d{4}$/.test(employee.pin)) {
        return { valid: false, error: 'PIN harus 4 digit angka' };
    }

    if (!employee.shift) {
        return { valid: false, error: 'Pilih shift karyawan' };
    }

    return { valid: true };
};

/**
 * Validate payment amount
 */
export const validatePayment = (mode, amountPaid, totalAmount) => {
    if (mode === 'TUNAI') {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < totalAmount) {
            return { valid: false, error: 'Pembayaran kurang' };
        }
    }
    return { valid: true };
};

/**
 * Validate order status transition
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
    const allowedTransitions = {
        PENDING: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['READY', 'CANCELLED'],
        READY: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
        return { valid: false, error: 'Transisi status tidak diizinkan' };
    }

    return { valid: true };
};
