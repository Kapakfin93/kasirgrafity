/**
 * ConfirmModal Component
 * Reusable confirmation modal (replaces window.confirm)
 * 
 * Props:
 * - isOpen: boolean - Show/hide modal
 * - title: string - Modal title
 * - message: string - Confirmation message (can include JSX)
 * - confirmText: string - Text for confirm button (default: "Ya")
 * - cancelText: string - Text for cancel button (default: "Batal")
 * - confirmColor: string - Color for confirm button (default: "#22c55e")
 * - onConfirm: function - Called when user confirms
 * - onCancel: function - Called when user cancels
 */

import React from 'react';

export function ConfirmModal({
    isOpen,
    title = "Konfirmasi",
    message,
    confirmText = "Ya",
    cancelText = "Batal",
    confirmColor = "#22c55e",
    onConfirm,
    onCancel
}) {
    if (!isOpen) return null;

    return (
        <div
            className="confirm-modal-overlay"
            onClick={onCancel}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)'
            }}
        >
            <div
                className="confirm-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    minWidth: '320px',
                    maxWidth: '400px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    animation: 'modalSlideIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        margin: 0
                    }}>
                        {title}
                    </h3>
                </div>

                {/* Body */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    color: '#475569',
                    fontSize: '14px',
                    lineHeight: '1.6'
                }}>
                    {message}
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: '2px solid #e2e8f0',
                            background: 'white',
                            color: '#64748b',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f1f5f9';
                            e.target.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#e2e8f0';
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: confirmColor,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: `0 4px 12px ${confirmColor}40`
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
