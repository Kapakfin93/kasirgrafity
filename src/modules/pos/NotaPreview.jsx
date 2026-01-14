import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { useOrderStore } from '../../stores/useOrderStore';
import { formatRupiah } from '../../core/formatters';

/**
 * NotaPreview Component
 * - React Portal untuk render ke document.body
 * - Support autoPrint untuk auto-trigger print saat modal dibuka
 * - type: 'NOTA' (dengan harga) atau 'SPK' (tanpa harga)
 * - Stempel status LUNAS/BELUM LUNAS
 * - Watermark untuk share WA
 */
export function NotaPreview({ items, totalAmount, paymentState, order, onClose, onPrint, onReset, autoPrint = false, type = 'NOTA' }) {
    const { mode, amountPaid } = paymentState || {};
    const paid = parseFloat(amountPaid) || 0;

    // STATE
    const [printMode, setPrintMode] = useState(type); // Use type prop as initial
    const [isGenerating, setIsGenerating] = useState(false);
    const [showWatermark, setShowWatermark] = useState(false);

    // REF
    const notaRef = useRef(null);

    // Calculate status
    const sisaBayar = totalAmount - paid;
    const statusText = sisaBayar <= 0 ? "LUNAS" : "BELUM LUNAS";

    // === AUTO PRINT LOGIC ===
    useEffect(() => {
        if (autoPrint) {
            // Set print mode first
            setPrintMode(type);
            // Delay to ensure render completes
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [autoPrint, type]);

    // --- HANDLERS ---

    // 1. Print Nota (Thermal Style - Via Iframe)
    const handlePrintNota = useCallback(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.zIndex = '9999';

        document.body.appendChild(iframe);

        // Ambil isi nota HTML
        const content = document.getElementById('printable-nota').innerHTML;

        // INJEKSI CSS LENGKAP AGAR SAMA DENGAN PREVIEW
        const style = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace; /* Font Struk */
                }

                /* CONTAINER UTAMA */
                .print-wrapper {
                    width: 100%;
                    max-width: 80mm; /* Kunci lebar thermal */
                    margin: 0;
                    padding: 5mm; 
                    box-sizing: border-box;
                }

                /* COPY STYLE DARI PREVIEW */
                .nota-header { text-align: center; margin-bottom: 10px; }
                .nota-header h1 { font-size: 14pt; font-weight: 900; margin: 0 0 5px 0; text-transform: uppercase; }
                .nota-header p { font-size: 9pt; margin: 2px 0; }
                
                .nota-divider { 
                    border-bottom: 1px dashed black; 
                    margin: 10px 0; 
                    height: 1px; 
                    width: 100%;
                }

                .nota-datetime { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 5px; }
                .nota-row { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 3px; }
                
                /* ITEMS STYLE */
                .nota-items { margin: 10px 0; }
                .nota-item { margin-bottom: 8px; }
                .nota-item-title { font-weight: bold; font-size: 10pt; }
                .nota-item-spec { font-size: 8pt; padding-left: 10px; font-style: italic; }
                .nota-item-price { display: flex; justify-content: space-between; font-size: 9pt; padding-left: 10px; }

                /* SUMMARY STYLE */
                .nota-summary { margin-top: 10px; }
                .nota-total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 12pt; margin: 5px 0; border-top: 2px solid black; padding-top: 5px; }
                .nota-remaining { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; color: black; margin-top: 5px; }
                
                .nota-status-stempel {
                    border: 3px double black;
                    padding: 5px;
                    text-align: center;
                    font-weight: 900;
                    font-size: 14pt;
                    margin: 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                }

                .nota-footer { text-align: center; font-size: 9pt; margin-top: 20px; font-weight: bold; }

                /* HILANGKAN ELEMEN NON-PRINT */
                .nota-watermark, .no-print { display: none !important; }

                /* ATURAN HALAMAN */
                @page {
                    size: 80mm auto; /* Lebar 80mm */
                    margin: 0;
                }
            </style>
        `;

        iframe.contentDocument.open();
        iframe.contentDocument.write(`
            <html>
            <head>
                <title>Cetak Nota - Joglo Print</title>
                ${style}
            </head>
            <body>
                <div class="print-wrapper">
                    ${content}
                </div>
                <script>
                    // Auto print saat load
                    window.onload = function() {
                        window.focus();
                        window.print();
                    }
                <\/script>
            </body>
            </html>
        `);
        iframe.contentDocument.close();

        // Hapus iframe setelah 2 detik (memberi waktu print dialog muncul)
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 2000);

    }, []);
    // 2. Print SPK (Produksi)
    const handlePrintSPK = useCallback(async () => {
        // Audit Trail
        if (order?.id) {
            useOrderStore.getState().updateOrder(order.id, {
                'meta.printedDOAt': new Date().toISOString()
            });
        }

        setPrintMode('SPK');
        setTimeout(() => {
            window.print();
            setTimeout(() => setPrintMode('NOTA'), 1000);
        }, 100);
    }, [order]);

    // 3. Share Image (WA) dengan Watermark
    const handleShareImage = useCallback(async () => {
        if (!notaRef.current || isGenerating) return;
        setIsGenerating(true);
        setShowWatermark(true);

        // Tunggu render watermark
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const canvas = await html2canvas(notaRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            // Manual watermark drawing sebagai backup
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.font = 'bold 60px Arial';
            ctx.fillStyle = '#000000';
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('JOGLO PRINT', 0, 0);
            ctx.restore();

            // Download
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `NOTA-${order?.orderNumber || 'TRX'}-${Date.now()}.png`;
            link.click();

            // === SMART WA SHARE ===
            // Format nomor WA (0812xxx -> 62812xxx)
            const formatWA = (number) => {
                if (!number) return '';
                let clean = number.replace(/\D/g, ''); // Hapus karakter non-angka
                if (clean.startsWith('0')) clean = '62' + clean.slice(1); // Ganti 0 depan jadi 62
                if (!clean.startsWith('62')) clean = '62' + clean; // Pastikan mulai 62
                return clean;
            };

            // Ambil nomor customer
            const phone = order?.customerSnapshot?.whatsapp || '';
            const customerName = order?.customerSnapshot?.name || 'Pelanggan';

            if (phone) {
                // Siapkan template pesan
                const text = `Halo Kak *${customerName}*,\n\nTerima kasih sudah order di *JOGLO PRINTING* 🎨\n\nBerikut kami lampirkan nota digital untuk pesanan:\n📋 *${order?.orderNumber || 'N/A'}*\n\n💰 Total: ${formatRupiah(totalAmount)}\n📌 Status: ${paymentState?.amountPaid >= totalAmount ? 'LUNAS ✅' : 'BELUM LUNAS ⏳'}\n\n_Gambar nota sudah didownload, silakan lampirkan._\n\nMohon dicek kembali. Terima kasih! 🙏`;

                // Buka WhatsApp
                const waUrl = `https://wa.me/${formatWA(phone)}?text=${encodeURIComponent(text)}`;

                // Delay sedikit agar download selesai dulu
                setTimeout(() => {
                    window.open(waUrl, '_blank');
                }, 500);
            } else {
                // Tidak ada nomor WA, tampilkan info
                alert('✅ Gambar nota berhasil didownload!\n\n⚠️ Nomor WhatsApp pelanggan tidak tersedia.\nSilakan kirim manual.');
            }

        } catch (err) {
            console.error('Gagal generate image:', err);
            alert('Gagal membuat gambar. Coba lagi.');
        } finally {
            setShowWatermark(false);
            setIsGenerating(false);
        }
    }, [isGenerating, order, totalAmount, paymentState]);

    const showPrices = printMode === 'NOTA';
    const headerTitle = printMode === 'SPK' ? 'SURAT PERINTAH KERJA' : 'JOGLO PRINTING';

    // --- RENDER CONTENT ---
    const modalContent = (
        <div className="nota-preview-overlay" onClick={onClose}>
            <div className="nota-preview-container" onClick={e => e.stopPropagation()}>

                {/* === AREA PRINT === */}
                <div
                    className="nota-content"
                    id="printable-nota"
                    data-printable="true"
                    ref={notaRef}
                    style={{ position: 'relative' }}
                >

                    {/* Watermark Layer (untuk Share WA) */}
                    {showWatermark && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%) rotate(-45deg)',
                            fontSize: '40px',
                            fontWeight: 'bold',
                            color: 'rgba(0, 0, 0, 0.08)',
                            pointerEvents: 'none',
                            zIndex: 999,
                            whiteSpace: 'nowrap'
                        }}>
                            JOGLO PRINT
                        </div>
                    )}

                    {/* Header */}
                    <div className="nota-header">
                        <h1 style={{
                            fontSize: '18px',
                            fontWeight: '900',
                            letterSpacing: '1px',
                            marginBottom: '6px'
                        }}>
                            {headerTitle}
                        </h1>
                        {printMode === 'NOTA' && (
                            <>
                                <p style={{ fontSize: '11px' }}>Jl. Diponegoro, Rw. 4, Jogoloyo</p>
                                <p style={{ fontSize: '11px' }}>Demak, Jawa Tengah</p>
                                <p style={{ fontSize: '11px' }}>Telp: 0813-9028-6826</p>
                                <p style={{
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    marginTop: '4px'
                                }}>BUKA 24 JAM</p>
                            </>
                        )}
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="nota-datetime">
                        <span>{new Date().toLocaleDateString('id-ID')}</span>
                        <span>{order?.orderNumber}</span>
                    </div>

                    {order?.customerSnapshot && (
                        <div className="nota-row" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                            <span>Cust: {order.customerSnapshot.name}</span>
                            {order.customerSnapshot.whatsapp && <span>WA: {order.customerSnapshot.whatsapp}</span>}
                        </div>
                    )}

                    <div className="receipt-divider"></div>

                    {/* Items */}
                    <div className="nota-items">
                        {items.map((item, idx) => (
                            <div key={idx} className="nota-item">
                                <div className="nota-item-title">{item.qty}x {item.productName}</div>
                                {item.description && (
                                    <div className="nota-item-spec" style={{ fontSize: '10px', paddingLeft: '10px', color: '#555' }}>
                                        ({item.description})
                                    </div>
                                )}

                                {/* ADVANCED PRODUCT NOTES - Finishing Summary */}
                                {item.notes && (
                                    <div className="nota-item-spec" style={{
                                        fontSize: '10px',
                                        paddingLeft: '10px',
                                        color: '#555',
                                        fontStyle: 'italic',
                                        marginTop: '2px'
                                    }}>
                                        {item.notes}
                                    </div>
                                )}

                                {/* ADVANCED PRODUCT - Custom Inputs (FOR PRODUCTION) - ONLY IN SPK MODE */}
                                {printMode === 'SPK' && item.meta?.detail_options?.custom_inputs && (
                                    <div className="nota-item-spec" style={{
                                        marginTop: '6px',
                                        paddingLeft: '12px',
                                        borderLeft: '3px solid #999',
                                        fontSize: '9px',
                                        lineHeight: '1.4',
                                        fontFamily: 'monospace',
                                        backgroundColor: '#f5f5f5',
                                        padding: '6px',
                                        borderRadius: '4px'
                                    }}>
                                        <strong style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>DETAIL PRODUKSI:</strong>
                                        {Object.entries(item.meta.detail_options.custom_inputs).map(([key, value]) => (
                                            <div key={key} style={{ marginBottom: '3px' }}>
                                                <strong>{key}:</strong> {value}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showPrices && (
                                    <div className="nota-item-price">
                                        <span>@ {formatRupiah(item.unitPrice)}</span>
                                        <span>{formatRupiah(item.totalPrice)}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="receipt-divider"></div>

                    {showPrices ? (
                        <div className="nota-summary">
                            <div className="nota-total-row" style={{ fontWeight: 'bold', fontSize: '13px' }}>
                                <span>TOTAL</span>
                                <span>{formatRupiah(totalAmount)}</span>
                            </div>
                            <div className="nota-row">
                                <span>Bayar ({mode})</span>
                                <span>{formatRupiah(paid)}</span>
                            </div>
                            {sisaBayar > 0 && (
                                <div className="nota-remaining" style={{ color: '#c00' }}>
                                    <span>SISA BAYAR</span>
                                    <span>{formatRupiah(sisaBayar)}</span>
                                </div>
                            )}

                            {/* STEMPEL STATUS */}
                            <div className="nota-status-stempel" style={{
                                border: '2px solid black',
                                padding: '8px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                margin: '12px 0',
                                borderRadius: '5px',
                                letterSpacing: '2px'
                            }}>
                                {statusText}
                            </div>
                        </div>
                    ) : (
                        <div className="nota-status" style={{ textAlign: 'center', padding: '10px 0' }}>
                            <p style={{ fontWeight: 'bold', fontSize: '14px' }}>MOHON SEGERA DIKERJAKAN</p>
                            <p style={{ marginTop: '5px' }}>Total Item: {items.length} Pcs</p>
                        </div>
                    )}

                    <div className="receipt-divider"></div>

                    {/* Footer */}
                    <div className="nota-footer" style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px' }}>
                        {printMode === 'NOTA' ? (
                            <>
                                <p style={{ fontWeight: 'bold' }}>Terima Kasih - BUKA 24 JAM</p>
                                <p>Pembayaran via Transfer:</p>
                                <p>BCA 1234567890 / BRI 0987654321</p>
                            </>
                        ) : (
                            <p>Dokumen Internal - JOGLO PRINTING</p>
                        )}
                    </div>

                    {/* Spacer agar cutter printer tidak memotong teks terakhir */}
                    <div style={{ height: '40mm', display: 'block', width: '100%' }}></div>

                </div>
                {/* === END AREA PRINT === */}

                {/* ACTION BUTTONS - Cashier Only (No SPK) */}
                <div className="nota-actions" style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '20px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={handlePrintNota}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        🖨️ CETAK NOTA
                    </button>
                    <button
                        onClick={handleShareImage}
                        disabled={isGenerating}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: isGenerating ? 'wait' : 'pointer',
                            opacity: isGenerating ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {isGenerating ? '⏳...' : '📸 SHARE WA'}
                    </button>
                    <button
                        onClick={() => {
                            console.log('✅ Transaksi Selesai - Resetting...');
                            onClose();
                            if (onReset) onReset();
                        }}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        ✅ SELESAI
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: '2px solid #64748b',
                            background: 'transparent',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕ TUTUP
                    </button>
                </div>
            </div>
        </div>
    );

    // USE PORTAL to Body
    return createPortal(modalContent, document.body);
}
