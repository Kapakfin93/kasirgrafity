import React, { useState, useEffect } from 'react';
import db from '../../data/db/schema';

/**
 * CustomerSelector - Customer Input with Autocomplete
 * 
 * Features:
 * - Mandatory customer name (visual indicator if empty)
 * - Optional WhatsApp number
 * - Autocomplete from past orders
 * - Locked state after payment (disabled inputs)
 * - BREATHING NEON PREMIUM UI
 */
export function CustomerSelector({
    customerSnapshot,
    updateCustomerSnapshot,
    isLocked // from transactionStage === POST_PAYMENT
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Load suggestions from past orders
    const loadSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const allOrders = await db.orders.toArray();

            // Filter orders with matching customer names
            const matchingOrders = allOrders.filter(order => {
                const name = order.customerSnapshot?.name || order.customerName || '';
                return name.toLowerCase().includes(query.toLowerCase());
            });

            // Extract unique customer snapshots
            const uniqueCustomers = [];
            const seen = new Set();

            matchingOrders.forEach(order => {
                const snapshot = order.customerSnapshot || {
                    name: order.customerName || '',
                    whatsapp: order.customerPhone || ''
                };

                const key = snapshot.name.toLowerCase();
                if (!seen.has(key) && snapshot.name) {
                    seen.add(key);
                    uniqueCustomers.push(snapshot);
                }
            });

            setSuggestions(uniqueCustomers.slice(0, 5)); // Max 5 suggestions
            setShowSuggestions(uniqueCustomers.length > 0);
        } catch (error) {
            console.error('Error loading suggestions:', error);
            setSuggestions([]);
        }
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        updateCustomerSnapshot({ name: value });
        loadSuggestions(value);
    };

    const handleSuggestionClick = (suggestion) => {
        updateCustomerSnapshot(suggestion);
        setShowSuggestions(false);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowSuggestions(false);
        if (showSuggestions) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showSuggestions]);

    const isEmpty = !customerSnapshot.name || customerSnapshot.name.trim() === '';

    return (
        <div
            className={isEmpty && !isLocked ? 'breathing-glow-red' : ''}
            style={{
                position: 'relative',
                background: '#0f172a',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                border: `2px solid ${isEmpty && !isLocked ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
                overflow: 'hidden',
                transition: 'all 0.5s ease'
            }}
        >
            {/* ANIMATED BACKGROUND GLOW (Only when empty) */}
            {isEmpty && !isLocked && (
                <div
                    className="subtle-pulse-bg"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(239, 68, 68, 0.05)',
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                />
            )}

            {/* LEFT ACCENT BAR */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '6px',
                background: isEmpty && !isLocked
                    ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                transition: 'background 0.5s ease',
                zIndex: 10
            }} />

            {/* CONTENT */}
            <div style={{ position: 'relative', zIndex: 10, paddingLeft: '12px' }}>
                {/* HEADER WITH LED INDICATOR */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                }}>
                    <div>
                        <h3 style={{
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '18px',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>
                                {isEmpty && !isLocked ? '⚠️' : '👤'}
                            </span>
                            DATA PEMESAN
                        </h3>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                            marginTop: '6px',
                            fontWeight: '500'
                        }}>
                            {isLocked
                                ? '🔒 Data terkunci setelah pembayaran'
                                : isEmpty
                                    ? 'Mohon lengkapi data untuk membuka kunci pembayaran'
                                    : '✅ Data lengkap. Siap diproses.'}
                        </p>
                    </div>

                    {/* LED LIGHT INDICATOR */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(8px)'
                    }}>
                        {/* LED DOT */}
                        <span
                            className={isEmpty && !isLocked ? 'led-ping' : ''}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: isEmpty && !isLocked ? '#ef4444' : '#10b981',
                                boxShadow: `0 0 10px ${isEmpty && !isLocked ? '#ef4444' : '#10b981'}`,
                                transition: 'all 0.3s ease'
                            }}
                        />
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: isEmpty && !isLocked ? '#f87171' : '#34d399'
                        }}>
                            {isLocked ? 'LOCKED' : isEmpty ? 'BUTUH DATA' : 'READY'}
                        </span>
                    </div>
                </div>

                {/* INPUT FIELDS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* NAMA INPUT - FOCUS UTAMA */}
                    <div style={{ position: 'relative' }}>
                        {/* FLOATING LABEL */}
                        <label style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '16px',
                            padding: '0 8px',
                            background: '#0f172a',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            color: isEmpty && !isLocked ? '#f87171' : '#94a3b8',
                            zIndex: 1,
                            transition: 'color 0.3s ease'
                        }}>
                            Nama Pelanggan <span style={{ color: '#ef4444', fontSize: '14px' }}>*</span>
                        </label>
                        <div onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={customerSnapshot.name}
                                onChange={handleNameChange}
                                disabled={isLocked}
                                placeholder="Wajib Diisi..."
                                autoComplete="off"
                                style={{
                                    width: '100%',
                                    background: 'rgba(2, 6, 23, 0.6)',
                                    border: `2px solid ${isEmpty && !isLocked ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`,
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    opacity: isLocked ? 0.6 : 1
                                }}
                                onFocus={(e) => {
                                    if (!isLocked) {
                                        e.target.style.borderColor = isEmpty ? '#ef4444' : '#10b981';
                                        e.target.style.boxShadow = isEmpty
                                            ? '0 0 20px rgba(239, 68, 68, 0.2)'
                                            : '0 0 20px rgba(16, 185, 129, 0.2)';
                                    }
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = isEmpty && !isLocked ? 'rgba(239, 68, 68, 0.4)' : '#334155';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />

                            {/* AUTOCOMPLETE DROPDOWN */}
                            {showSuggestions && suggestions.length > 0 && !isLocked && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '10px',
                                    marginTop: '6px',
                                    zIndex: 100,
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                    overflow: 'hidden'
                                }}>
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            onClick={() => handleSuggestionClick(s)}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderBottom: i < suggestions.length - 1 ? '1px solid #334155' : 'none',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#334155'}
                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: 'white' }}>{s.name}</strong>
                                            {s.whatsapp && (
                                                <span style={{ color: '#64748b', marginLeft: '10px', fontSize: '12px' }}>
                                                    • {s.whatsapp}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WHATSAPP INPUT */}
                    <div style={{ position: 'relative' }}>
                        {/* FLOATING LABEL */}
                        <label style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '16px',
                            padding: '0 8px',
                            background: '#0f172a',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            color: '#94a3b8',
                            zIndex: 1,
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <span>WhatsApp</span>
                            <span style={{ color: '#34d399', fontStyle: 'italic', fontWeight: '500' }}>
                                (Kirim Nota)
                            </span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            {/* WA ICON */}
                            <div style={{
                                position: 'absolute',
                                left: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                opacity: customerSnapshot.whatsapp ? 1 : 0.5,
                                transition: 'opacity 0.3s ease'
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </div>
                            <input
                                type="tel"
                                value={customerSnapshot.whatsapp}
                                onChange={(e) => updateCustomerSnapshot({ whatsapp: e.target.value })}
                                disabled={isLocked}
                                placeholder="Contoh: 08xx-xxxx-xxxx"
                                style={{
                                    width: '100%',
                                    background: 'rgba(2, 6, 23, 0.6)',
                                    border: '2px solid #334155',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontFamily: 'monospace',
                                    padding: '14px 20px 14px 48px',
                                    borderRadius: '12px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    opacity: isLocked ? 0.6 : 1
                                }}
                                onFocus={(e) => {
                                    if (!isLocked) {
                                        e.target.style.borderColor = '#22c55e';
                                        e.target.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.15)';
                                    }
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#334155';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
