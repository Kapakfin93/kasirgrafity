import React, { useState, useEffect, useMemo } from "react";
import { Ruler, Lock, Layers } from "lucide-react";

export function CalculatorForm({ product, engineMode, onUpdate }) {
  // Config
  const isLinear = engineMode === "LINEAR";
  const defaults = product.form_config?.display_config || {};
  const fixedWidth = defaults.fixed_width_value || 1.2;

  // Options
  const materials = useMemo(
    () => product.input_options?.material || [],
    [product.input_options],
  );

  // State
  const [length, setLength] = useState(1);
  const [width, setWidth] = useState(isLinear ? fixedWidth : 1);
  const [material, setMaterial] = useState(
    materials.length > 0 ? materials[0].value : null,
  );
  const [qty, setQty] = useState(1);
  // const [finishing, setFinishing] = useState([]); // Not used in UI yet

  // Sync Material if product changes
  useEffect(() => {
    if (materials.length > 0 && !material) {
      setMaterial(materials[0].value);
    }
  }, [materials, material]);

  // Sync to Parent
  useEffect(() => {
    onUpdate({
      length,
      width,
      material,
      qty,
      finishing: [], // Placeholder
    });
  }, [length, width, material, qty, onUpdate]);

  return (
    <div className="space-y-6">
      {/* 1. Material Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" />
          Pilih Bahan
        </label>
        <div className="grid grid-cols-1 gap-3">
          {materials.map((m) => (
            <button
              key={m.value}
              onClick={() => setMaterial(m.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                material === m.value
                  ? "border-cyan-500 bg-slate-800/80 shadow-lg shadow-cyan-900/20"
                  : "border-slate-700/50 bg-slate-900/40 hover:bg-slate-800"
              }`}
            >
              <div
                className={
                  material === m.value
                    ? "text-white font-bold"
                    : "text-slate-300 font-medium"
                }
              >
                {m.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Dimensions */}
      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Ruler size={14} className="text-emerald-400" />
          Ukuran
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">
              Panjang (m)
            </span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-center font-bold text-xl focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="text-slate-600 font-black text-xl pt-4">X</div>
          <div className="flex-1 relative">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Lebar (m)
              </span>
              {isLinear && <Lock size={10} className="text-amber-500" />}
            </div>
            <input
              type="number"
              value={width}
              readOnly={isLinear} // Lock for LINEAR
              onChange={(e) =>
                !isLinear && setWidth(parseFloat(e.target.value) || 0)
              }
              className={`w-full border rounded-xl p-3 text-center font-bold text-xl outline-none ${
                isLinear
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-slate-950 border-slate-700 text-white focus:border-emerald-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* 3. Quantity */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
          Quantity (Pcs)
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
