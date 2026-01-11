/**
 * waHelper.js - WhatsApp Integration Utilities
 * Generates WA click-to-chat links and smart notification messages
 */

import { formatRupiah } from '../core/formatters';

/**
 * Validates if phone number is usable for WhatsApp
 * @param {string} phone - Raw phone number input
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidPhone(phone) {
    if (!phone) return false;

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Must have at least 9 digits (Indonesian mobile minimum)
    // Max 15 digits (international standard)
    return cleaned.length >= 9 && cleaned.length <= 15;
}

/**
 * Cleans and formats phone number for WhatsApp
 * @param {string} phone - Raw phone input
 * @returns {string|null} - Formatted phone or null if invalid
 */
export function cleanPhoneNumber(phone) {
    if (!isValidPhone(phone)) return null;

    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle Indonesian numbers
    // 08xxx -> 628xxx
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    // +62xxx -> 62xxx (already clean after removing +)
    // 62xxx -> 62xxx (already correct)

    return cleaned;
}

/**
 * Generates WhatsApp click-to-chat URL
 * @param {string} phone - Phone number
 * @param {string} message - Message to send
 * @returns {string|null} - WA link or null if phone invalid
 */
export function generateWALink(phone, message) {
    const cleanPhone = cleanPhoneNumber(phone);

    if (!cleanPhone) {
        console.warn('⚠️ Invalid phone number, cannot generate WA link');
        return null;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Opens WhatsApp in new tab
 * @param {string} phone - Phone number
 * @param {string} message - Message to send
 * @returns {boolean} - True if opened, false if phone invalid
 */
export function openWhatsApp(phone, message) {
    const link = generateWALink(phone, message);

    if (!link) {
        return false;
    }

    window.open(link, '_blank');
    return true;
}

/**
 * Generates smart completion message based on payment status
 * @param {Object} order - Order object
 * @returns {string} - Formatted WA message
 */
export function generateCompletionMessage(order) {
    const customerName = order.customerName || order.customerSnapshot?.name || 'Pelanggan';
    const orderNumber = order.orderNumber || `#${String(order.id).slice(0, 8)}`;
    const remaining = order.remainingAmount ?? (order.totalAmount - (order.paidAmount || 0));
    const isLunas = remaining <= 0;

    if (isLunas) {
        return `Halo Kak ${customerName}, Pesanan ${orderNumber} di Joglo Print sudah SELESAI & SIAP DIAMBIL. Silakan datang ke outlet ya. Terima kasih! 🙏`;
    } else {
        return `Halo Kak ${customerName}, Pesanan ${orderNumber} sudah SELESAI. Total kekurangan bayar: ${formatRupiah(remaining)}. Mohon pelunasannya saat pengambilan ya Kak. Terima kasih! 🙏`;
    }
}

/**
 * Generates delivery/pickup confirmation message
 * @param {Object} order - Order object
 * @returns {string} - Formatted WA message
 */
export function generateDeliveryMessage(order) {
    const customerName = order.customerName || order.customerSnapshot?.name || 'Pelanggan';
    const orderNumber = order.orderNumber || `#${String(order.id).slice(0, 8)}`;

    return `Terima kasih Kak ${customerName}! Pesanan ${orderNumber} sudah diserahkan. Semoga puas dengan hasil produksinya. Sampai jumpa di order berikutnya! 🙏✨`;
}
