import React, { useState, useEffect, useRef } from 'react'

export default function DimensionModal({ product, onClose, onConfirm }) {
    const [length, setLength] = useState('')
    const [width, setWidth] = useState('')
    const [height, setHeight] = useState('')
    const inputRef = useRef(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    const handleSubmit = (e) => {
        e.preventDefault()
        onConfirm({ length, width, height })
    }

    if (!product) return null

    const isLinear = product.pricing_model === 'LINEAR'
    const isArea = product.pricing_model === 'AREA'

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Input Ukuran: {product.name}</h3>

                <form onSubmit={handleSubmit}>
                    {isLinear && (
                        <div className="form-group">
                            <label>Panjang (Meter)</label>
                            <input
                                ref={inputRef}
                                type="number"
                                step="0.01"
                                value={length}
                                onChange={e => setLength(e.target.value)}
                                required
                                placeholder="Contoh: 1.5"
                            />
                        </div>
                    )}

                    {isArea && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Lebar (M)</label>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    step="0.01"
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                    required
                                    placeholder="L"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tinggi (M)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                    required
                                    placeholder="T"
                                />
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Batal</button>
                        <button type="submit" className="btn-confirm">SIMPAN</button>
                    </div>
                </form>
            </div>

            <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 300px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        h3 { margin-bottom: 1rem; font-size: 1.1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-row { display: flex; gap: 1rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: bold; }
        input { 
          width: 100%; 
          padding: 0.75rem; 
          font-size: 1.2rem; 
          border: 2px solid #ddd; 
          border-radius: 4px; 
        }
        input:focus { border-color: var(--color-primary); outline: none; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
        button { flex: 1; padding: 0.75rem; border-radius: 4px; font-weight: bold; }
        .btn-cancel { background: #f1f5f9; color: #475569; }
        .btn-confirm { background: var(--color-primary); color: white; }
      `}</style>
        </div>
    )
}
