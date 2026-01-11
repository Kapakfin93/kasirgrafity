/**
 * LogoutConfirmModal Component
 * Custom confirmation modal for logout
 */

import React from 'react';

export function LogoutConfirmModal({ onConfirm, onCancel }) {
    return (
        <div className="logout-modal-overlay" onClick={onCancel}>
            <div className="logout-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="logout-modal-header">
                    <h2>🚪 Logout</h2>
                </div>

                <div className="logout-modal-body">
                    <p>Apakah Anda yakin ingin keluar dari sistem?</p>
                </div>

                <div className="logout-modal-actions">
                    <button className="btn-cancel" onClick={onCancel}>
                        Batal
                    </button>
                    <button className="btn-confirm" onClick={onConfirm}>
                        Ya, Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
