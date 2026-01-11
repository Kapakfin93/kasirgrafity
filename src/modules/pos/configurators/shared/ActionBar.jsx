import React from 'react';
import { formatRupiah } from '../../../../core/formatters';

export function ActionBar({ total, breakdown, canAdd, onAdd }) {
    return (
        <div className="action-bar">
            <div className="live-total">
                <small>Estimasi Total</small>
                {breakdown && <span className="breakdown-info" style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>{breakdown}</span>}
                <div className="amount">{formatRupiah(total)}</div>
            </div>
            <button
                className="btn-add-cart"
                disabled={!canAdd}
                onClick={onAdd}
            >
                + TAMBAH
            </button>
        </div>
    );
}
