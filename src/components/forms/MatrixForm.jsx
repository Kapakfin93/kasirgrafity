import React, { useState, useEffect } from "react";
import { Check, Layers } from "lucide-react";

export function MatrixForm({ product, onUpdate }) {
  // Options
  const sizes = product.input_options?.size || [];
  const materials = product.input_options?.material || [];

  // State
  const [step1, setStep1] = useState(null); // Size
  const [step2, setStep2] = useState(null); // Material
  const [qty, setQty] = useState(1);
  // const [finishing, setFinishing] = useState([]);

  // Sync
  useEffect(() => {
    onUpdate({
      size: step1,
      material: step2,
      qty,
      finishing: [],
    });
  }, [step1, step2, qty, onUpdate]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* STEP 1: SIZE */}
      <div>
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih Ukuran
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sizes.map((s) => {
            const isSelected = step1 === s.value;
            return (
              <button
                key={s.value}
                onClick={() => {
                  setStep1(s.value);
                  setStep2(null); // Reset step 2 on change
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? "border-cyan-500 bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                }`}
              >
                <div
                  className={`font-bold text-lg relative z-10 ${
                    isSelected ? "text-cyan-400" : "text-slate-200"
                  }`}
                >
                  {s.label}
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 text-cyan-500">
                    <Check size={20} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: MATERIAL (Conditional) */}
      {step1 && materials.length > 0 && (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-slate-600"></span> Pilih Bahan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {materials.map((m) => {
              const isSelected = step2 === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setStep2(m.value)}
                  className={`p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-slate-800 shadow-lg shadow-emerald-900/20"
                      : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                  }`}
                >
                  <span
                    className={`font-medium ${isSelected ? "text-emerald-400" : "text-slate-300"}`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QTY */}
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
    </div>
  );
}
