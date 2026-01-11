/**
 * PromptModal Component
 * Reusable input modal (replaces window.prompt)
 * 
 * Props:
 * - isOpen: boolean - Show/hide modal
 * - title: string - Modal title
 * - message: string - Description message
 * - placeholder: string - Input placeholder
 * - submitText: string - Text for submit button (default: "Konfirmasi")
 * - cancelText: string - Text for cancel button (default: "Batal")
 * - submitColor: string - Color for submit button (default: "#3b82f6")
 * - onSubmit: function(value) - Called with input value when submitted
 * - onCancel: function - Called when user cancels
 * - required: boolean - If true, empty input will show error
 */

import React, { useState, useEffect, useRef } from 'react';

export function PromptModal({
    isOpen,
    title = "Input",
    message,
    placeholder = "",
    submitText = "Konfirmasi",
    cancelText = "Batal",
    submitColor = "#3b82f6",
    onSubmit,
    onCancel,
    required = true
}) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setValue(''); // Reset value when opening
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (required && value.trim() === '') {
            setError('Field ini wajib diisi!');
            inputRef.current?.focus();
            return;
        }
        onSubmit(value.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="prompt-modal-overlay"
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
                className="prompt-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    minWidth: '360px',
                    maxWidth: '450px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    animation: 'modalSlideIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '12px'
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

                {/* Message */}
                {message && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '16px',
                        color: '#64748b',
                        fontSize: '13px',
                        lineHeight: '1.5'
                    }}>
                        {message}
                    </div>
                )}

                {/* Input */}
                <div style={{ marginBottom: '20px' }}>
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '10px',
                            border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
                            fontSize: '14px',
                            resize: 'none',
                            fontFamily: 'inherit',
                            transition: 'border-color 0.2s ease',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                            if (!error) e.target.style.borderColor = '#3b82f6';
                        }}
                        onBlur={(e) => {
                            if (!error) e.target.style.borderColor = '#e2e8f0';
                        }}
                    />
                    {error && (
                        <div style={{
                            color: '#ef4444',
                            fontSize: '12px',
                            marginTop: '6px',
                            fontWeight: '500'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
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
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleSubmit}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: submitColor,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: `0 4px 12px ${submitColor}40`
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        {submitText}
                    </button>
                </div>
            </div>
        </div>
    );
}
