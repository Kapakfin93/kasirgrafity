/**
 * DataManagement.jsx - Backup & Restore System
 * Critical feature for data safety in localhost environment
 * Allows Owner to export/import all IndexedDB data as JSON
 */

import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import db from '../../data/db/schema';
import { formatRupiah } from '../../core/formatters';
import { generateSeedData } from '../../utils/stressSeeder';

// ============================================
// BACKUP & RESTORE UTILITY FUNCTIONS
// ============================================

/**
 * Export all database tables to JSON
 * @returns {Object} Complete database dump
 */
async function exportAllData() {
    try {
        // Fetch all tables
        const [orders, employees, attendance, customers, categories, products, finishings, settings] = await Promise.all([
            db.orders.toArray(),
            db.employees.toArray(),
            db.attendance.toArray(),
            db.customers.toArray(),
            db.categories.toArray(),
            db.products.toArray(),
            db.finishings.toArray(),
            db.settings.toArray(),
        ]);

        return {
            _meta: {
                app: 'JogloPOS',
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                tables: ['orders', 'employees', 'attendance', 'customers', 'categories', 'products', 'finishings', 'settings'],
            },
            data: {
                orders,
                employees,
                attendance,
                customers,
                categories,
                products,
                finishings,
                settings,
            },
        };
    } catch (error) {
        throw new Error(`Export failed: ${error.message}`);
    }
}

/**
 * Import data from JSON backup file
 * @param {Object} backupData - Parsed JSON backup
 * @param {boolean} overwrite - If true, clear existing data first
 */
async function importAllData(backupData, overwrite = true) {
    // Validate backup structure
    if (!backupData._meta || !backupData.data) {
        throw new Error('Invalid backup file: Missing _meta or data fields');
    }

    if (backupData._meta.app !== 'JogloPOS') {
        throw new Error('Invalid backup file: Not a JogloPOS backup');
    }

    const { data } = backupData;

    try {
        await db.transaction('rw',
            db.orders, db.employees, db.attendance, db.customers,
            db.categories, db.products, db.finishings, db.settings,
            async () => {
                if (overwrite) {
                    // Clear all existing data
                    await Promise.all([
                        db.orders.clear(),
                        db.employees.clear(),
                        db.attendance.clear(),
                        db.customers.clear(),
                        db.categories.clear(),
                        db.products.clear(),
                        db.finishings.clear(),
                        db.settings.clear(),
                    ]);
                }

                // Restore data from backup
                if (data.orders?.length > 0) await db.orders.bulkPut(data.orders);
                if (data.employees?.length > 0) await db.employees.bulkPut(data.employees);
                if (data.attendance?.length > 0) await db.attendance.bulkPut(data.attendance);
                if (data.customers?.length > 0) await db.customers.bulkPut(data.customers);
                if (data.categories?.length > 0) await db.categories.bulkPut(data.categories);
                if (data.products?.length > 0) await db.products.bulkPut(data.products);
                if (data.finishings?.length > 0) await db.finishings.bulkPut(data.finishings);
                if (data.settings?.length > 0) await db.settings.bulkPut(data.settings);
            }
        );

        return {
            success: true,
            counts: {
                orders: data.orders?.length || 0,
                employees: data.employees?.length || 0,
                attendance: data.attendance?.length || 0,
                customers: data.customers?.length || 0,
                categories: data.categories?.length || 0,
                products: data.products?.length || 0,
                finishings: data.finishings?.length || 0,
                settings: data.settings?.length || 0,
            },
        };
    } catch (error) {
        throw new Error(`Import failed: ${error.message}`);
    }
}

/**
 * Get current database statistics
 */
async function getDatabaseStats() {
    try {
        const [orders, employees, categories, products, finishings] = await Promise.all([
            db.orders.count(),
            db.employees.count(),
            db.categories.count(),
            db.products.count(),
            db.finishings.count(),
        ]);

        return { orders, employees, categories, products, finishings };
    } catch (error) {
        return { orders: 0, employees: 0, categories: 0, products: 0, finishings: 0 };
    }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DataManagement() {
    const { isOwner } = usePermissions();

    // State
    const [stats, setStats] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showConfirmRestore, setShowConfirmRestore] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [error, setError] = useState(null);
    const [isStressTesting, setIsStressTesting] = useState(false);

    // Load stats on mount
    React.useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await getDatabaseStats();
        setStats(data);
    };

    // ============================================
    // EXPORT (BACKUP)
    // ============================================
    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            // 1. Get Data from Store
            const data = await exportAllData();

            // 2. Stringify with pretty print
            const jsonString = JSON.stringify(data, null, 2);

            // 3. Generate Filename with Date
            const date = new Date().toISOString().split('T')[0];
            const filename = `JogloPOS_Backup_${date}.json`;

            // 4. Create Blob with EXPLICIT JSON TYPE
            const blob = new Blob([jsonString], { type: "application/json" });

            // 5. Use msSaveBlob for IE/Edge Legacy (more reliable)
            if (window.navigator && window.navigator.msSaveBlob) {
                window.navigator.msSaveBlob(blob, filename);
                alert(`Backup Berhasil! File tersimpan sebagai: ${filename}`);
                return;
            }

            // 6. Modern browsers: Create proper download link
            const url = URL.createObjectURL(blob);

            // Create anchor element
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            // Simple click to trigger download
            // Simple click to trigger download
            console.log('Triggering download click for:', filename);
            link.click();

            // Cleanup after delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);

            // Success Feedback
            // Success Feedback (Delayed to ensure download starts)
            setTimeout(() => {
                alert(`✅ Backup Berhasil!\n\nFile: ${filename}\nSilakan cek folder Downloads.`);
            }, 500);

        } catch (err) {
            setError(err.message);
            alert(`❌ Backup gagal: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    // ============================================
    // IMPORT (RESTORE)
    // ============================================
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json')) {
            setError('File harus berformat .json');
            return;
        }

        // Read and parse file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = JSON.parse(e.target.result);

                // Quick validation
                if (!content._meta || content._meta.app !== 'JogloPOS') {
                    setError('File bukan backup JogloPOS yang valid');
                    return;
                }

                // Show confirmation dialog
                setPendingFile(content);
                setShowConfirmRestore(true);
                setError(null);
            } catch (err) {
                setError('File JSON tidak valid: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const confirmRestore = async () => {
        if (!pendingFile) return;

        setIsImporting(true);
        setShowConfirmRestore(false);
        setError(null);

        try {
            const result = await importAllData(pendingFile, true);
            setImportResult(result);

            // Show success and reload
            const totalRecords = Object.values(result.counts).reduce((a, b) => a + b, 0);

            alert(`✅ Restore berhasil!\n\n${totalRecords} record berhasil dipulihkan.\n\nHalaman akan di-refresh untuk memuat data baru.`);

            // Force reload to refresh Zustand stores
            window.location.reload();
        } catch (err) {
            setError(err.message);
            alert(`❌ Restore gagal: ${err.message}`);
        } finally {
            setIsImporting(false);
            setPendingFile(null);
        }
    };

    const cancelRestore = () => {
        setShowConfirmRestore(false);
        setPendingFile(null);
    };

    // ============================================
    // STRESS TEST SEEDER
    // ============================================
    const handleStressTest = async () => {
        const confirmed = window.confirm(
            '⚠️ PERINGATAN STRESS TEST\n\n' +
            'Ini akan menambahkan 2000 dummy orders ke database untuk testing:\n' +
            '- 30% Heavy Orders (Jersey dengan 20-50 nama pemain)\n' +
            '- 70% Light Orders (Banner/Poster sederhana)\n\n' +
            'Lanjutkan?'
        );

        if (!confirmed) return;

        setIsStressTesting(true);
        setError(null);

        try {
            console.log('🚀 Starting stress test...');
            const result = await generateSeedData(2000);

            alert(
                `✅ STRESS TEST SELESAI!\n\n` +
                `Total: ${result.total} orders\n` +
                `Heavy: ${result.heavy} orders (${Math.round(result.heavy / result.total * 100)}%)\n` +
                `Light: ${result.light} orders (${Math.round(result.light / result.total * 100)}%)\n\n` +
                `Halaman akan di-refresh.`
            );

            // Reload to update stats and Zustand stores
            window.location.reload();
        } catch (err) {
            setError('Stress test gagal: ' + err.message);
            alert(`❌ Stress test gagal: ${err.message}`);
        } finally {
            setIsStressTesting(false);
        }
    };

    // Permission check
    if (!isOwner) {
        return (
            <div className="data-management access-denied">
                <h2>❌ Akses Ditolak</h2>
                <p>Hanya Owner yang bisa mengakses halaman ini.</p>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="data-management">
            {/* Header */}
            <div className="dm-header">
                <div className="dm-title">
                    <h1>💾 Manajemen Data</h1>
                    <p className="subtitle">Backup & Restore data untuk keamanan</p>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="dm-error">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Current Data Stats */}
            <div className="dm-section dm-stats">
                <h3>📊 Data Saat Ini</h3>
                {stats ? (
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-icon">📋</span>
                            <span className="stat-value">{stats.orders}</span>
                            <span className="stat-label">Order</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">👥</span>
                            <span className="stat-value">{stats.employees}</span>
                            <span className="stat-label">Karyawan</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">📁</span>
                            <span className="stat-value">{stats.categories}</span>
                            <span className="stat-label">Kategori</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">📦</span>
                            <span className="stat-value">{stats.products}</span>
                            <span className="stat-label">Produk</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">🔧</span>
                            <span className="stat-value">{stats.finishings}</span>
                            <span className="stat-label">Finishing</span>
                        </div>
                    </div>
                ) : (
                    <p>⏳ Memuat statistik...</p>
                )}
            </div>

            {/* Backup Section */}
            <div className="dm-section dm-backup">
                <h3>📤 Backup Data</h3>
                <p className="section-desc">
                    Download seluruh data sebagai file JSON. Simpan file ini di tempat aman.
                </p>
                <button
                    className="dm-btn dm-btn-primary"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <>⏳ Menyiapkan backup...</>
                    ) : (
                        <>💾 Download Backup</>
                    )}
                </button>
            </div>

            {/* Restore Section */}
            <div className="dm-section dm-restore">
                <h3>📥 Restore Data</h3>
                <p className="section-desc">
                    Upload file backup JogloPOS untuk mengembalikan data.
                    <br />
                    <strong style={{ color: '#ef4444' }}>⚠️ PERINGATAN: Semua data saat ini akan DITIMPA!</strong>
                </p>

                <div className="upload-area">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        disabled={isImporting}
                        id="backup-file-input"
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="backup-file-input" className="dm-btn dm-btn-danger">
                        {isImporting ? (
                            <>⏳ Memproses restore...</>
                        ) : (
                            <>📂 Pilih File Backup</>
                        )}
                    </label>
                </div>
            </div>

            {/* Stress Test Section */}
            <div className="dm-section dm-stress-test" style={{
                borderLeft: '4px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }}>
                <h3>⚠️ Stress Test (Development Only)</h3>
                <p className="section-desc">
                    Generate 2000 dummy transactions untuk testing pagination, rendering performance, dan financial calculations.
                    <br />
                    <strong style={{ color: '#f59e0b' }}>⚡ Mix: 30% Heavy (Jersey 20-50 players), 70% Light (Simple products)</strong>
                </p>
                <button
                    className="dm-btn"
                    style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        fontWeight: '700',
                        border: '2px solid #b91c1c'
                    }}
                    onClick={handleStressTest}
                    disabled={isStressTesting}
                >
                    {isStressTesting ? (
                        <>⏳ Generating 2000 orders...</>
                    ) : (
                        <>⚠️ GENERATE STRESS TEST (2000 Data)</>
                    )}
                </button>
            </div>

            {/* Instructions */}
            <div className="dm-section dm-instructions">
                <h3>📖 Panduan Penggunaan</h3>
                <div className="instruction-list">
                    <div className="instruction-item">
                        <span className="step">1</span>
                        <div>
                            <strong>Backup Rutin</strong>
                            <p>Lakukan backup setiap akhir hari kerja untuk mengamankan data transaksi.</p>
                        </div>
                    </div>
                    <div className="instruction-item">
                        <span className="step">2</span>
                        <div>
                            <strong>Simpan File dengan Aman</strong>
                            <p>Pindahkan file backup ke Google Drive, USB, atau penyimpanan lain.</p>
                        </div>
                    </div>
                    <div className="instruction-item">
                        <span className="step">3</span>
                        <div>
                            <strong>Restore Saat Diperlukan</strong>
                            <p>Jika browser ter-reset atau data hilang, gunakan file backup terakhir.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmRestore && pendingFile && (
                <div className="dm-modal-overlay">
                    <div className="dm-modal">
                        <div className="dm-modal-header">
                            <h3>⚠️ Konfirmasi Restore</h3>
                        </div>
                        <div className="dm-modal-body">
                            <p><strong>File backup akan dipulihkan:</strong></p>
                            <ul className="backup-info">
                                <li>📅 Dibuat: {new Date(pendingFile._meta.exportedAt).toLocaleString('id-ID')}</li>
                                <li>📋 Orders: {pendingFile.data.orders?.length || 0}</li>
                                <li>📁 Kategori: {pendingFile.data.categories?.length || 0}</li>
                                <li>📦 Produk: {pendingFile.data.products?.length || 0}</li>
                                <li>🔧 Finishing: {pendingFile.data.finishings?.length || 0}</li>
                            </ul>
                            <div className="warning-box">
                                <strong>⚠️ PERINGATAN:</strong>
                                <p>Semua data yang ada saat ini akan <strong>DIHAPUS PERMANEN</strong> dan diganti dengan data dari file backup ini.</p>
                                <p>Pastikan Anda sudah yakin sebelum melanjutkan!</p>
                            </div>
                        </div>
                        <div className="dm-modal-actions">
                            <button className="dm-btn dm-btn-cancel" onClick={cancelRestore}>
                                Batal
                            </button>
                            <button className="dm-btn dm-btn-danger" onClick={confirmRestore}>
                                🔄 Ya, Restore Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataManagement;
