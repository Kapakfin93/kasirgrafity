import React from 'react';

export function FinishingRadioGrid({ finishings, selectedIds, onToggle }) {
    if (!finishings || finishings.length === 0) return null;

    return (
        <div className="finishing-section">
            <h3>Finishing (Opsi)</h3>
            <div className="finishing-grid">
                {finishings.map((f) => {
                    const isSelected = selectedIds.includes(f.id);
                    return (
                        <div
                            key={f.id}
                            className={`finishing-card ${isSelected ? 'active' : ''}`}
                            onClick={() => onToggle(f)}
                        >
                            <div className="fin-name">{f.name}</div>
                            <div className="fin-price">
                                {f.price === 0 ? 'Free' : `+Rp ${f.price.toLocaleString('id-ID')}`}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
