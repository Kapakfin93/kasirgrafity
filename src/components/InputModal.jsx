import { useState } from 'react';

export function InputModal({ isOpen, onClose, onSubmit, product }) {
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');

    if (!isOpen || !product) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            length: parseFloat(length),
            width: parseFloat(width),
            height: parseFloat(height)
        });
        // Reset
        setLength('');
        setWidth('');
        setHeight('');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Input Ukuran: {product.name}</h3>
                <form onSubmit={handleSubmit}>
                    {product.pricing_model === 'LINEAR' && (
                        <div className="form-group">
                            <label>Panjang (meter)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                autoFocus
                                value={length}
                                onChange={e => setLength(e.target.value)}
                            />
                        </div>
                    )}

                    {product.pricing_model === 'AREA' && (
                        <>
                            <div className="form-group">
                                <label>Lebar (meter)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Tinggi (meter)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Batal</button>
                        <button type="submit" className="btn-confirm">Masuk Nota</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
