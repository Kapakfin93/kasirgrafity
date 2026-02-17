import React, { useState, useEffect } from "react";
import { Package, MessageSquare } from "lucide-react";

export function UnitForm({ product, onUpdate }) {
  const variants = product.input_options?.variant || [];

  const [variant, setVariant] = useState(
    variants.length > 0 ? variants[0].value : null,
  );
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  // const [finishing, setFinishing] = useState([]);

  // Sync
  useEffect(() => {
    onUpdate({
      variant,
      qty,
      notes, // Passed as 'notes' for specs
      finishing: [],
    });
  }, [variant, qty, notes, onUpdate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. Variant Selection (Optional) */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Package size={14} className="text-cyan-400" />
            Pilih Varian
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {variants.map((v) => (
              <button
                key={v.value}
                onClick={() => setVariant(v.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  variant === v.value
                    ? "border-cyan-500 bg-slate-800 text-white"
                    : "border-slate-700/50 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Quantity */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
          Quantity
        </label>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value) || 1)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold"
        />
      </div>

      {/* 3. Notes (Critical for Apparel Sizes) */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <MessageSquare size={14} className="text-yellow-500" />
          Catatan (Ukuran/Warna/Request)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: Ukuran XL, Warna Hitam..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-300 placeholder-slate-600 min-h-[100px] focus:border-yellow-500/50 outline-none"
        />
      </div>
    </div>
  );
}
