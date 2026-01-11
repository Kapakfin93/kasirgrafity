export function FinishingSelector({ finishings, categoryId, onToggle, activeItem }) {
    // Filter finishings by current active category
    const relevantFinishings = finishings.filter(f => f.category_id === categoryId);

    if (relevantFinishings.length === 0) return null;

    return (
        <div className="finishing-section">
            <h4>Finishing (Opsi Tambahan)</h4>
            {!activeItem && <p className="hint-text">Pilih item di nota untuk tambah finishing</p>}

            <div className="finishing-grid">
                {relevantFinishings.map(fin => {
                    const isActive = activeItem?.finishings?.includes(fin.name);
                    return (
                        <button
                            key={fin.id}
                            disabled={!activeItem}
                            className={`finishing-card ${isActive ? 'active' : ''}`}
                            onClick={() => onToggle(activeItem.id, fin.name)}
                        >
                            {fin.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
