/**
 * STRESS TEST SEEDER - Advanced Data Generator
 * 
 * Purpose: Generate 2,000-5,000 realistic transactions to stress-test:
 * - Pagination performance
 * - DOM rendering with heavy JSON payloads
 * - Financial calculation integrity
 * - Dashboard analytics accuracy
 * 
 * Data Mix:
 * - 30% Heavy Loads (Advanced Products with 20-50 custom inputs)
 * - 70% Light Loads (Simple legacy products)
 */

import db from '../data/db/schema';
import { v4 as uuidv4 } from 'uuid';

// === HELPER: Random number within range ===
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// === HELPER: Random date within last N days ===
const randomDate = (daysBack = 90) => {
    const now = new Date();
    const past = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
    return new Date(randomTime).toISOString();
};

// === HELPER: Random array element ===
const randomPick = (array) => array[randomInt(0, array.length - 1)];

// === HELPER: Generate player names for Jersey (heavy payload) ===
const generatePlayerNames = (count) => {
    const firstNames = ['Budi', 'Andi', 'Bambang', 'Slamet', 'Joko', 'Dwi', 'Tri', 'Eko', 'Agus', 'Hadi',
        'Rudi', 'Yanto', 'Didik', 'Wawan', 'Hendro', 'Santoso', 'Wijaya', 'Pratama',
        'Muhammad', 'Ahmad', 'Rizki', 'Fahmi', 'Dimas', 'Arif', 'Rangga'];
    const lastNames = ['Santoso', 'Wijaya', 'Pratama', 'Nugroho', 'Saputra', 'Kurniawan', 'Hidayat',
        'Setiawan', 'Firmansyah', 'Ramadan', 'Gunawan', 'Utomo', 'Martinez Rodriguez III',
        'Van Der Berg', 'Al-Rahman', 'Wirawan Putra', 'WWWWWWWWWWWWWWWWWW'];

    const players = {};
    for (let i = 1; i <= count; i++) {
        const firstName = randomPick(firstNames);
        const lastName = randomPick(lastNames);
        const playerName = `Player ${String(i).padStart(2, '0')} - ${firstName} ${lastName}`;
        const jerseyNumber = randomInt(1, 99);
        players[playerName] = String(jerseyNumber);
    }
    return players;
};

// === HELPER: Generate long notes with layout breakers ===
const generateLongNotes = () => {
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.`;
    const breaker = ` LAYOUT_BREAKER_TEST_WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW_END`;
    return lorem + breaker;
};

// === GENERATOR: Heavy Order (30% chance) - Advanced Products ===
export const generateHeavyOrder = () => {
    const playerCount = randomInt(20, 50);
    const customInputs = generatePlayerNames(playerCount);

    // Jersey pricing logic
    const qtyJersey = playerCount; // 1 jersey per player
    const basePrice = qtyJersey <= 5 ? 150000 : qtyJersey <= 11 ? 120000 : 100000;
    const revenue_print = basePrice * qtyJersey;

    // Finishing: Nama punggung (+15k per jersey)
    const revenue_finish = 15000 * qtyJersey;

    // Total MUST BE EXACT
    const totalAmount = revenue_print + revenue_finish;

    // Random payment
    const paymentStatuses = ['PAID', 'DP', 'UNPAID'];
    const paymentStatus = randomPick(paymentStatuses);

    let paidAmount = 0;
    if (paymentStatus === 'PAID') {
        paidAmount = totalAmount;
    } else if (paymentStatus === 'DP') {
        paidAmount = Math.floor(totalAmount * 0.5); // 50% DP
    }

    const remainingAmount = totalAmount - paidAmount;

    // Random production status
    const productionStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];
    const weights = [0.2, 0.3, 0.3, 0.15, 0.05]; // Distribution
    const rand = Math.random();
    let cumulative = 0;
    let productionStatus = 'PENDING';
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
            productionStatus = productionStatuses[i];
            break;
        }
    }

    // Generate order number (simplified for seeding)
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = String(randomInt(1, 9999)).padStart(4, '0');
    const orderNumber = `JGL-STRESS-${datePrefix}-${randomSeq}`;

    // Customer
    const customerNames = ['PT. Maju Jaya', 'CV. Sejahtera', 'Toko Berkah', 'UD. Makmur', 'Yayasan Harapan'];
    const customerName = randomPick(customerNames);

    return {
        id: uuidv4(),
        orderNumber,
        customerName,
        customerSnapshot: {
            name: customerName,
            whatsapp: `08${randomInt(10000000000, 99999999999)}`
        },
        items: [{
            id: uuidv4(),
            name: 'Jersey Futsal Full Printing (Setelan)',
            productName: 'Jersey Futsal Full Printing (Setelan)',
            description: 'Drifit Milano (Zigzag/Premium)',
            qty: qtyJersey,
            unitPrice: basePrice + 15000, // Include finishing per unit
            totalPrice: totalAmount,
            notes: `Finishing: Data Pemain (${playerCount} nama)\n\n${generateLongNotes()}`,
            meta: {
                product_type: 'ADVANCED',
                detail_options: {
                    custom_inputs: customInputs,
                    fabric_type: 'Drifit Milano (Zigzag/Premium)',
                    with_names: true
                }
            },
            finishings: [
                { name: 'Sablon Nama Punggung', price: 15000 }
            ]
        }],
        totalAmount,
        paidAmount,
        dpAmount: paymentStatus === 'DP' ? paidAmount : 0,
        remainingAmount,
        paymentStatus,
        productionStatus,
        createdAt: randomDate(90),
        meta: {
            createdBy: 'STRESS_SEEDER',
            revenue_print,
            revenue_finish,
            stress_test: true,
            heavy_payload: true,
            player_count: playerCount
        }
    };
};

// === GENERATOR: Light Order (70% chance) - Simple Products ===
export const generateLightOrder = () => {
    const products = [
        { name: 'Flexi 280gr Standard', price: 18000, category: 'Banner' },
        { name: 'Poster UV Albatros A1', price: 75000, category: 'Poster' },
        { name: 'Stiker Chromo A3+', price: 10000, category: 'Stiker' },
        { name: 'Lanyard Tissue (2 Sisi)', price: 15000, category: 'Merchandise' },
        { name: 'Pin Peniti 58mm', price: 4000, category: 'Merchandise' }
    ];

    const product = randomPick(products);
    const qty = randomInt(1, 20);
    const totalAmount = product.price * qty;

    // Light orders have no finishing
    const revenue_print = totalAmount;
    const revenue_finish = 0;

    // Random payment
    const paymentStatuses = ['PAID', 'DP', 'UNPAID'];
    const paymentStatus = randomPick(paymentStatuses);

    let paidAmount = 0;
    if (paymentStatus === 'PAID') {
        paidAmount = totalAmount;
    } else if (paymentStatus === 'DP') {
        paidAmount = Math.floor(totalAmount * 0.5);
    }

    const remainingAmount = totalAmount - paidAmount;

    // Random status
    const productionStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];
    const weights = [0.2, 0.3, 0.3, 0.15, 0.05];
    const rand = Math.random();
    let cumulative = 0;
    let productionStatus = 'PENDING';
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
            productionStatus = productionStatuses[i];
            break;
        }
    }

    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = String(randomInt(1, 9999)).padStart(4, '0');
    const orderNumber = `JGL-LIGHT-${datePrefix}-${randomSeq}`;

    const customerNames = ['Toko Maju', 'CV. Karya', 'UD. Sejahtera', 'PT. Jaya', 'Yayasan Pendidikan'];
    const customerName = randomPick(customerNames);

    return {
        id: uuidv4(),
        orderNumber,
        customerName,
        customerSnapshot: {
            name: customerName,
            whatsapp: `08${randomInt(10000000000, 99999999999)}`
        },
        items: [{
            id: uuidv4(),
            name: product.name,
            productName: product.name,
            description: product.category,
            qty,
            unitPrice: product.price,
            totalPrice: totalAmount,
            notes: '',
            meta: {
                product_type: 'LEGACY',
                category: product.category
            },
            finishings: []
        }],
        totalAmount,
        paidAmount,
        dpAmount: paymentStatus === 'DP' ? paidAmount : 0,
        remainingAmount,
        paymentStatus,
        productionStatus,
        createdAt: randomDate(90),
        meta: {
            createdBy: 'STRESS_SEEDER',
            revenue_print,
            revenue_finish,
            stress_test: true,
            heavy_payload: false
        }
    };
};

// === BATCH INSERT: Efficient Dexie bulk insert ===
const batchInsertOrders = async (orders) => {
    console.log(`🚀 Starting batch insert of ${orders.length} orders...`);

    const BATCH_SIZE = 100;
    let inserted = 0;

    await db.transaction('rw', db.orders, async () => {
        for (let i = 0; i < orders.length; i += BATCH_SIZE) {
            const batch = orders.slice(i, i + BATCH_SIZE);
            await db.orders.bulkPut(batch);
            inserted += batch.length;
            console.log(`✅ Inserted batch: ${inserted}/${orders.length}`);
        }
    });

    console.log(`✅ Batch insert complete: ${inserted} orders inserted`);
    return inserted;
};

// === MAIN: Generate Seed Data ===
export const generateSeedData = async (count = 2000) => {
    console.log(`🎯 STRESS TEST: Generating ${count} orders (30% heavy, 70% light)...`);

    const orders = [];
    let heavyCount = 0;
    let lightCount = 0;

    for (let i = 0; i < count; i++) {
        // 30% chance for heavy order
        if (Math.random() < 0.3) {
            orders.push(generateHeavyOrder());
            heavyCount++;
        } else {
            orders.push(generateLightOrder());
            lightCount++;
        }

        // Progress log every 500
        if ((i + 1) % 500 === 0) {
            console.log(`📊 Generated ${i + 1}/${count} orders...`);
        }
    }

    console.log(`✅ Generation complete: ${heavyCount} heavy, ${lightCount} light`);
    console.log(`💾 Starting database insert...`);

    const insertedCount = await batchInsertOrders(orders);

    console.log(`🎉 STRESS TEST COMPLETE!`);
    console.log(`   - Total Orders: ${insertedCount}`);
    console.log(`   - Heavy Orders: ${heavyCount} (${Math.round(heavyCount / count * 100)}%)`);
    console.log(`   - Light Orders: ${lightCount} (${Math.round(lightCount / count * 100)}%)`);

    return {
        total: insertedCount,
        heavy: heavyCount,
        light: lightCount
    };
};

// Export for console testing
if (typeof window !== 'undefined') {
    window.generateSeedData = generateSeedData;
    window.generateHeavyOrder = generateHeavyOrder;
    window.generateLightOrder = generateLightOrder;
}
