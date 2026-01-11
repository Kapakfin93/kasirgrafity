/**
 * Expense Seeder
 * Generates realistic dummy expenses for testing
 */

import { db } from './schema';

// Realistic expense data for Indonesian printing shop
const DUMMY_EXPENSES = [
    { category: 'OPERATIONAL', description: 'Token Listrik PLN', amount: 850000 },
    { category: 'OPERATIONAL', description: 'Biaya Internet Bulanan', amount: 450000 },
    { category: 'OPERATIONAL', description: 'Air PDAM', amount: 175000 },
    { category: 'MATERIAL', description: 'Beli Kertas A4 5 Rim', amount: 275000 },
    { category: 'MATERIAL', description: 'Tinta Printer Epson Set', amount: 520000 },
    { category: 'MATERIAL', description: 'Bahan Vinyl Sticker 50m', amount: 750000 },
    { category: 'MATERIAL', description: 'Kertas Glossy A3 2 Pak', amount: 180000 },
    { category: 'MATERIAL', description: 'Bahan Flexi China 280gsm', amount: 420000 },
    { category: 'SALARY', description: 'Gaji Siti (Kasir)', amount: 2500000, employeeName: 'Siti' },
    { category: 'SALARY', description: 'Gaji Budi (Operator)', amount: 2800000, employeeName: 'Budi' },
    { category: 'SALARY', description: 'Kasbon Andi', amount: 500000, employeeName: 'Andi' },
    { category: 'SALARY', description: 'Bonus Lembur Rini', amount: 350000, employeeName: 'Rini' },
    { category: 'OPERATIONAL', description: 'Bensin Motor Kurir', amount: 150000 },
    { category: 'OPERATIONAL', description: 'Parkir Bulanan', amount: 100000 },
    { category: 'OTHER', description: 'Service AC Ruangan', amount: 350000 },
    { category: 'OTHER', description: 'Beli Galon Air Minum', amount: 72000 },
    { category: 'MATERIAL', description: 'Mata Pisau Cutting', amount: 85000 },
    { category: 'OPERATIONAL', description: 'Pulsa Telepon Toko', amount: 100000 },
    { category: 'OTHER', description: 'Snack Meeting', amount: 125000 },
    { category: 'OTHER', description: 'Iuran Kebersihan RT', amount: 50000 },
];

// Generate random date within current month
function randomDateThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Seed dummy expenses
 * @returns {Promise<number>} Number of expenses created
 */
export async function seedExpenses() {
    console.log('🌱 Seeding expenses...');

    const expenses = DUMMY_EXPENSES.map((exp, index) => ({
        id: `SEED-EXP-${String(index + 1).padStart(3, '0')}`,
        date: randomDateThisMonth().toISOString(),
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        employeeName: exp.employeeName || null,
        createdAt: new Date().toISOString()
    }));

    await db.expenses.bulkAdd(expenses);
    console.log(`✅ Seeded ${expenses.length} expenses`);

    // Calculate total
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`💰 Total seeded expenses: Rp ${total.toLocaleString('id-ID')}`);

    return expenses.length;
}

/**
 * Clear all seeded expenses
 */
export async function clearSeededExpenses() {
    const deleted = await db.expenses
        .where('id')
        .startsWith('SEED-EXP-')
        .delete();
    console.log(`🗑️ Cleared ${deleted} seeded expenses`);
    return deleted;
}

/**
 * Get expense seeder stats
 */
export async function getExpenseSeederStats() {
    const total = await db.expenses.count();
    const seeded = await db.expenses
        .where('id')
        .startsWith('SEED-EXP-')
        .count();
    return { total, seeded, real: total - seeded };
}
