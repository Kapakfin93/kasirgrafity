import React, { useState } from 'react';
import { useTransaction, TRANSACTION_STAGES } from '../../hooks/useTransaction';
import { useOrderStore } from '../../stores/useOrderStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { CustomerSelector } from './CustomerSelector';
import { ReceiptSection } from './ReceiptSection';
import { NotaPreview } from './NotaPreview';
import { ProductConfigModal } from './ProductConfigModal';
import { formatRupiah } from '../../core/formatters';

/**
 * Workspace - Modern POS Interface
 * Clean product grid + modal configuration
 */
export function Workspace() {
    const {
        categories,
        currentCategory,
        selectCategory,
        items,
        addItemToCart,
        removeItem,
        calculateTotal,
        paymentState,
        updatePaymentState,
        confirmPayment,
        finalizeOrder,
        customerSnapshot,
        updateCustomerSnapshot,
        transactionStage,
        setTransactionStage,
        resetTransaction,
        calculateItemPrice, // Stateless calculator for modal
        // Priority System
        targetDate,
        setTargetDate,
        setPriorityStandard,
        setPriorityExpress,
        setPriorityUrgent,
    } = useTransaction();

    const { createOrder } = useOrderStore();
    const { currentUser } = useAuthStore();

    const [showNotaPreview, setShowNotaPreview] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null); // Modal state
    const [gridMode, setGridMode] = useState('normal'); // Grid size
    const [isTempo, setIsTempo] = useState(false); // [SOP V2.0] TEMPO/VIP mode

    // Handle payment confirmation
    const handleConfirmPayment = async () => {
        console.log("=== PROSES PEMBAYARAN BUTTON CLICKED ===");
        console.log("Current User:", currentUser);
        console.log("Customer Snapshot:", customerSnapshot);
        console.log("Items:", items);
        console.log("Payment State:", paymentState);
        console.log("isTempo:", isTempo);

        try {
            // [SOP V2.0] Pass isTempo to confirmPayment for validation bypass
            const success = confirmPayment(isTempo);
            if (!success) {
                console.log("❌ confirmPayment returned false");
                return;
            }

            console.log("✅ confirmPayment success, calling finalizeOrder...");
            // [SOP V2.0] Pass isTempo flag to finalizeOrder
            const order = await finalizeOrder(createOrder, currentUser, isTempo);
            console.log("✅ Order created:", order);

            setLastOrder(order);
            setTransactionStage(TRANSACTION_STAGES.POST_PAYMENT);
            setShowNotaPreview(true);

            // Reset isTempo for next transaction
            setIsTempo(false);
        } catch (error) {
            console.error("❌ FULL ERROR:", error);
            alert(`GAGAL PROSES PEMBAYARAN:\n\n${error.message}`);
        }
    };

    // Open print preview modal
    const handlePrint = () => {
        console.log('🖨️ Opening NotaPreview for printing...');
        setShowNotaPreview(true);
    };

    const handleCloseNota = () => setShowNotaPreview(false);

    const handleNewTransaction = () => {
        setShowNotaPreview(false);
        setLastOrder(null);
        resetTransaction();
    };

    // Product click -> open modal
    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    // Modal submit -> add to cart
    const handleAddFromModal = (itemData) => {
        addItemToCart(itemData);
        setSelectedProduct(null);
    };

    const isLocked = transactionStage === TRANSACTION_STAGES.POST_PAYMENT;

    // Grid styling based on mode
    const getGridStyle = () => {
        switch (gridMode) {
            case 'compact': return { gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' };
            case 'large': return { gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' };
            default: return { gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' };
        }
    };

    const getModeButton = (mode, icon, title) => ({
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        background: gridMode === mode ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'transparent',
        color: gridMode === mode ? 'white' : '#64748b',
        cursor: 'pointer',
        fontSize: '14px',
        boxShadow: gridMode === mode ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none'
    });

    return (
        <div style={{
            display: 'flex',
            height: '100%',
            background: '#020617',
            gap: '16px',
            padding: '16px'
        }}>
            {/* Left Panel - Clean & Full */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '12px'
                }}>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        background: 'linear-gradient(90deg, #38bdf8, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '1px',
                        margin: 0
                    }}>⚡ JOGLO PRINTING</h1>
                    {currentUser && (
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                            👤 {currentUser.name}
                        </div>
                    )}
                </div>

                {/* Customer Selector */}
                <CustomerSelector
                    customerSnapshot={customerSnapshot}
                    updateCustomerSnapshot={updateCustomerSnapshot}
                    isLocked={isLocked}
                />

                {/* Toolbar: Categories + Grid Mode */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {/* Category Tabs - ALWAYS WRAP (Show All) */}
                    <div style={{
                        display: 'flex',
                        flex: 1,
                        flexWrap: 'wrap', // ALWAYS wrap - no scroll
                        justifyContent: 'center', // Center aligned
                        gap: gridMode === 'compact' ? '6px' : gridMode === 'large' ? '12px' : '8px',
                        padding: '4px 0'
                    }}>
                        {categories.map(cat => {
                            const isActive = currentCategory?.id === cat.id;

                            // Dynamic sizing based on gridMode
                            const getPadding = () => {
                                switch (gridMode) {
                                    case 'compact': return '8px 14px';
                                    case 'large': return '16px 32px';
                                    default: return '12px 22px';
                                }
                            };

                            const getFontSize = () => {
                                switch (gridMode) {
                                    case 'compact': return '11px';
                                    case 'large': return '16px';
                                    default: return '13px';
                                }
                            };

                            const getBorderWidth = () => {
                                switch (gridMode) {
                                    case 'compact': return '2px';
                                    case 'large': return '3px';
                                    default: return '2px';
                                }
                            };

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => selectCategory(cat.id)}
                                    disabled={isLocked}
                                    style={{
                                        flexShrink: gridMode === 'compact' ? 1 : 0,
                                        whiteSpace: 'nowrap',
                                        padding: getPadding(),
                                        borderRadius: '10px',
                                        border: `${getBorderWidth()} solid ${isActive ? '#06b6d4' : '#334155'}`,
                                        background: isActive
                                            ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                                            : 'transparent',
                                        color: isActive ? '#0f172a' : '#94a3b8',
                                        fontSize: getFontSize(),
                                        fontWeight: '800',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                        boxShadow: isActive
                                            ? '0 0 20px rgba(6, 182, 212, 0.5)'
                                            : 'none',
                                        zIndex: isActive ? 10 : 1,
                                        opacity: isLocked ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLocked && !isActive) {
                                            e.currentTarget.style.borderColor = '#64748b';
                                            e.currentTarget.style.color = 'white';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.borderColor = '#334155';
                                            e.currentTarget.style.color = '#94a3b8';
                                        }
                                    }}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Grid Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(15, 23, 42, 0.8)',
                        borderRadius: '10px',
                        padding: '3px',
                        border: '1px solid rgba(100, 116, 139, 0.2)'
                    }}>
                        <button onClick={() => setGridMode('compact')} style={getModeButton('compact')} title="Padat">🖥️</button>
                        <button onClick={() => setGridMode('normal')} style={getModeButton('normal')} title="Normal">💻</button>
                        <button onClick={() => setGridMode('large')} style={getModeButton('large')} title="Besar">📱</button>
                    </div>
                </div>

                {/* Product Grid - FULL SCREEN */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px',
                    background: 'rgba(15, 23, 42, 0.3)',
                    borderRadius: '12px'
                }}>
                    {!currentCategory || categories.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#64748b'
                        }}>
                            <span style={{ fontSize: '48px', opacity: 0.2 }}>📦</span>
                            <p>{categories.length === 0 ? '⏳ Memuat...' : 'Pilih kategori'}</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            ...getGridStyle(),
                            padding: '4px'
                        }}>
                            {currentCategory.products?.map(prod => (
                                <div
                                    key={prod.id}
                                    onClick={() => !isLocked && handleProductClick(prod)}
                                    style={{
                                        padding: '14px',
                                        background: 'rgba(30, 41, 59, 0.9)',
                                        border: '1px solid rgba(100, 116, 139, 0.3)',
                                        borderRadius: '14px',
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: gridMode === 'large' ? '120px' : '90px',
                                        opacity: isLocked ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLocked) {
                                            e.currentTarget.style.borderColor = '#06b6d4';
                                            e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <div style={{
                                        fontSize: gridMode === 'compact' ? '11px' : gridMode === 'large' ? '14px' : '12px',
                                        fontWeight: '600',
                                        color: 'white',
                                        marginBottom: '8px',
                                        lineHeight: '1.3'
                                    }}>
                                        {prod.name}
                                    </div>
                                    <div style={{
                                        fontSize: gridMode === 'compact' ? '13px' : gridMode === 'large' ? '18px' : '15px',
                                        fontWeight: '800',
                                        color: '#22c55e'
                                    }}>
                                        {prod.prices
                                            ? `${formatRupiah(Math.min(...Object.values(prod.prices)))}+`
                                            : formatRupiah(prod.price || 0)
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Receipt */}
            <ReceiptSection
                items={items}
                removeItem={removeItem}
                totalAmount={calculateTotal()}
                paymentState={paymentState}
                updatePayment={updatePaymentState}
                onConfirmPayment={handleConfirmPayment}
                isLocked={isLocked}
                onPrint={handlePrint}
                onReset={handleNewTransaction}
                isTempo={isTempo}
                setIsTempo={setIsTempo}
                customerSnapshot={customerSnapshot}
                targetDate={targetDate}
                setTargetDate={setTargetDate}
                setPriorityStandard={setPriorityStandard}
                setPriorityExpress={setPriorityExpress}
                setPriorityUrgent={setPriorityUrgent}
            />

            {/* Product Config Modal */}
            <ProductConfigModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
                category={currentCategory}
                onAddToCart={handleAddFromModal}
                calculatePreview={calculateItemPrice}
            />

            {/* Nota Preview - works with lastOrder OR current cart */}
            {showNotaPreview && (items.length > 0 || lastOrder) && (
                <NotaPreview
                    items={lastOrder?.items || items}
                    totalAmount={lastOrder?.totalAmount || calculateTotal()}
                    paymentState={paymentState}
                    order={lastOrder || {
                        orderNumber: `TMP-${Date.now()}`,
                        customerSnapshot: customerSnapshot
                    }}
                    onClose={handleCloseNota}
                    onPrint={() => window.print()}
                    onReset={handleNewTransaction}
                />
            )}
        </div>
    );
}
