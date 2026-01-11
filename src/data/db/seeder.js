/**
 * Seeder Script - Stress Test Data Generator
 * Generates 5,000 dummy orders for pagination testing
 * 
 * CRITICAL: All fields are populated according to production schema
 */

import db from './schema.js';

// Random data generators
const firstNames = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gunawan', 'Hadi', 'Indah', 'Joko',
    'Kartika', 'Lukman', 'Maya', 'Nur', 'Oscar', 'Putri', 'Rizki', 'Sari', 'Tono', 'Umi',
    'Vina', 'Wahyu', 'Xena', 'Yoga', 'Zahra', 'Ahmad', 'Bambang', 'Cahya', 'Dian', 'Endang'];

const lastNames = ['Pratama', 'Susanto', 'Wijaya', 'Kurniawan', 'Santoso', 'Hidayat', 'Nugroho',
    'Setiawan', 'Wibowo', 'Permana', 'Hartono', 'Saputra', 'Putra', 'Kusuma', 'Firmansyah'];

const productNames = [
    'Banner Flexi 280gsm', 'Spanduk Korea', 'X-Banner 60x160', 'Roll Up Banner',
    'Stiker Vinyl', 'Cutting Sticker', 'Poster A3', 'Poster A2', 'Poster A1',
    'Kartu Nama', 'Brosur A4', 'Brosur A5', 'Flyer A5', 'Undangan',
    'Kalender Dinding', 'Kalender Meja', 'ID Card', 'Nametag', 'Label Produk',
    'Nota 2 Ply', 'Kop Surat', 'Amplop', 'Stamp Acrylic', 'Plakat Akrilik'
];

const finishingOptions = [
    { id: 'f_laminating', name: 'Laminating Doff', price: 5000 },
    { id: 'f_glossy', name: 'Laminating Glossy', price: 5000 },
    { id: 'f_mata_ayam', name: 'Mata Ayam', price: 1000 },
    { id: 'f_lebar', name: 'Tali Keliling', price: 15000 },
    { id: 'f_lipat', name: 'Lipat', price: 500 },
    { id: 'f_pondasi', name: 'Pondasi Kayu', price: 50000 }
];

const paymentStatuses = ['PAID', 'DP', 'UNPAID'];
const productionStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'];
const sources = ['OFFLINE', 'ONLINE'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
    const prefixes = ['0812', '0813', '0857', '0878', '0821', '0852'];
    const prefix = randomItem(prefixes);
    const number = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}${number}`;
}

function randomDate(daysBack = 30) {
    const now = Date.now();
    const past = now - (Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return new Date(past).toISOString();
}

function generateOrderNumber(index, machineId = 'SEED') {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = index.toString().padStart(5, '0');
    return `JGL-${machineId}-${dateStr}-${seq}`;
}

function generateOrder(index) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const customerName = `${firstName} ${lastName}`;
    const phone = randomPhone();

    // Generate 1-3 items
    const itemCount = Math.floor(1 + Math.random() * 3);
    const items = [];
    let totalAmount = 0;

    for (let i = 0; i < itemCount; i++) {
        const productName = randomItem(productNames);
        const qty = Math.floor(1 + Math.random() * 10);
        const unitPrice = Math.floor(5000 + Math.random() * 100000);
        const itemTotal = qty * unitPrice;

        // Random finishings (0-2)
        const finishingCount = Math.floor(Math.random() * 3);
        const finishings = [];
        for (let f = 0; f < finishingCount; f++) {
            const finishing = randomItem(finishingOptions);
            if (!finishings.find(x => x.id === finishing.id)) {
                finishings.push({ ...finishing });
            }
        }
        const finishingTotal = finishings.reduce((sum, f) => sum + f.price, 0);

        const totalPrice = itemTotal + finishingTotal;
        totalAmount += totalPrice;

        items.push({
            productId: `prod-${i}-${index}`,
            productName,
            description: `${productName} (${qty} pcs)`,
            pricingType: 'AREA',
            qty,
            dimensions: {
                length: Math.round((1 + Math.random() * 3) * 10) / 10,
                width: Math.round((1 + Math.random() * 2) * 10) / 10
            },
            finishings,
            unitPrice,
            totalPrice,
            notes: ''
        });
    }

    const paymentStatus = randomItem(paymentStatuses);
    let paidAmount = 0;
    let dpAmount = 0;
    let remainingAmount = totalAmount;

    if (paymentStatus === 'PAID') {
        paidAmount = totalAmount;
        remainingAmount = 0;
    } else if (paymentStatus === 'DP') {
        dpAmount = Math.floor(totalAmount * (0.3 + Math.random() * 0.4)); // 30-70% DP
        paidAmount = dpAmount;
        remainingAmount = totalAmount - paidAmount;
    }

    const productionStatus = randomItem(productionStatuses);
    const createdAt = randomDate(30);

    return {
        id: crypto.randomUUID(),
        orderNumber: generateOrderNumber(index),

        // Customer (CRITICAL for WA test)
        customerName,
        customerSnapshot: {
            name: customerName,
            phone,
            whatsapp: phone,
            address: `Jl. Test No. ${index}`
        },

        // Items (CRITICAL for Print test)
        items,

        // Payment
        totalAmount,
        paidAmount,
        dpAmount,
        remainingAmount,
        paymentStatus,
        isTempo: paymentStatus === 'UNPAID' && Math.random() > 0.7,

        // Production
        productionStatus,
        assignedTo: productionStatus !== 'PENDING' ? randomItem(firstNames) : null,

        // Source & Meta
        source: randomItem(sources),
        file_via: null,
        meta: {
            createdBy: 'SEEDER_SCRIPT',
            createdByName: 'System Seeder'
        },

        // Timestamps
        createdAt,
        updatedAt: createdAt,
        completedAt: productionStatus === 'READY' || productionStatus === 'DELIVERED'
            ? new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
            : null,
        deliveredAt: productionStatus === 'DELIVERED'
            ? new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString()
            : null,

        // Notes
        notes: Math.random() > 0.7 ? `Catatan untuk order #${index}` : ''
    };
}

/**
 * Seed dummy orders into IndexedDB
 * @param {number} count - Number of orders to generate (default: 5000)
 * @returns {Promise<{success: boolean, count: number, duration: number}>}
 */
export async function seedDummyOrders(count = 5000) {
    console.log(`🌱 Starting seeder: Generating ${count} dummy orders...`);
    const startTime = performance.now();

    try {
        // Generate orders in batches to avoid memory issues
        const batchSize = 500;
        let totalSeeded = 0;

        for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
            const start = batch * batchSize;
            const end = Math.min(start + batchSize, count);
            const orders = [];

            for (let i = start; i < end; i++) {
                orders.push(generateOrder(i));
            }

            await db.orders.bulkAdd(orders);
            totalSeeded += orders.length;
            console.log(`✅ Batch ${batch + 1}: Seeded ${totalSeeded}/${count} orders`);
        }

        const duration = Math.round(performance.now() - startTime);
        console.log(`🎉 Seeder complete! ${totalSeeded} orders in ${duration}ms`);

        return { success: true, count: totalSeeded, duration };
    } catch (error) {
        console.error('❌ Seeder failed:', error);
        return { success: false, count: 0, duration: 0, error: error.message };
    }
}

/**
 * Clear all seeded orders (orders with SEED in orderNumber)
 */
export async function clearSeededOrders() {
    console.log('🧹 Clearing seeded orders...');
    const startTime = performance.now();

    try {
        const seededOrders = await db.orders
            .filter(order => order.orderNumber?.includes('SEED'))
            .toArray();

        const ids = seededOrders.map(o => o.id);
        await db.orders.bulkDelete(ids);

        const duration = Math.round(performance.now() - startTime);
        console.log(`✅ Cleared ${ids.length} seeded orders in ${duration}ms`);

        return { success: true, count: ids.length, duration };
    } catch (error) {
        console.error('❌ Clear failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get seeder stats
 */
export async function getSeederStats() {
    const total = await db.orders.count();
    const seeded = await db.orders
        .filter(order => order.orderNumber?.includes('SEED'))
        .count();

    return {
        totalOrders: total,
        seededOrders: seeded,
        realOrders: total - seeded
    };
}

// Export for browser console usage
if (typeof window !== 'undefined') {
    window.seedDummyOrders = seedDummyOrders;
    window.clearSeededOrders = clearSeededOrders;
    window.getSeederStats = getSeederStats;
}
