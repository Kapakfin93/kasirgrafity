import React from "react";
import { FileText, Layers, Palette, Check } from "lucide-react";

export default function BookletRenderer({
  product,
  selectedVariant,
  setSelectedVariant,
  printMode,
  setPrintMode,
  sheetsPerBook,
  setSheetsPerBook,
}) {
  // LOGIC HITUNG ESTIMASI REALTIME (ISI BUKU)
  const paperPrice = selectedVariant?.price || 0;
  const printPrice = printMode?.price || 0;
  const costPerSheet = paperPrice + printPrice;
  const contentCost = costPerSheet * sheetsPerBook;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. BAGIAN KERTAS (PAPER) - CYAN THEME */}
      <div>
        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" /> Pilih Kertas (Bahan
          Baku)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {product.variants?.map((v, i) => {
            const isSelected = selectedVariant?.label === v.label;
            return (
              <button
                key={i}
                onClick={() => setSelectedVariant(v)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? "border-cyan-500 bg-slate-800 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-600"
                }`}
              >
                <div
                  className={`text-sm font-bold ${isSelected ? "text-cyan-400" : "text-slate-300"}`}
                >
                  {v.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 italic">
                  {v.specs}
                </div>
                <div className="absolute top-2 right-2 text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                  Rp{v.price}
                </div>
                {isSelected && (
                  <div className="absolute bottom-0 right-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BAGIAN TINTA (PRINT MODE) - PURPLE THEME */}
      {product.advanced_features?.print_modes && (
        <div>
          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Palette size={14} className="text-purple-400" /> Mode Cetak (Tinta
            / Klik)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {product.advanced_features.print_modes.map((mode, i) => {
              const isSelected = printMode?.id === mode.id;
              return (
                <button
                  key={i}
                  onClick={() => setPrintMode(mode)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-full group ${
                    isSelected
                      ? "border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)] scale-[1.02]"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  <div className="mb-2">
                    <div
                      className={`font-bold text-xs mb-1 ${isSelected ? "text-white" : "text-slate-300"}`}
                    >
                      {mode.label}
                    </div>
                    <div className="text-[9px] text-slate-500 leading-tight">
                      {mode.description}
                    </div>
                  </div>

                  <div
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded w-fit ${isSelected ? "bg-purple-500/20 text-purple-300" : "bg-black/30 text-slate-500"}`}
                  >
                    + Rp {mode.price} <span className="opacity-50">/muka</span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-purple-500/20 p-0.5 rounded-full text-purple-400 animate-in zoom-in duration-200">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. BAGIAN HALAMAN (VARIABLE) - YELLOW THEME */}
      <div className="bg-gradient-to-br from-slate-900 to-[#0c0a00] p-5 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <FileText size={100} className="text-yellow-500" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <label className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2 tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>{" "}
              Jumlah Halaman / Lembar
            </label>
            <span className="text-[10px] px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold">
              PER BUKU
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSheetsPerBook(Math.max(1, sheetsPerBook - 10))}
              className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-400 font-bold text-xl transition-colors"
            >
              -
            </button>

            <div className="flex-1 relative">
              <input
                type="number"
                value={sheetsPerBook}
                onChange={(e) =>
                  setSheetsPerBook(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full bg-transparent text-center text-4xl font-black text-white focus:outline-none focus:text-yellow-400 transition-colors placeholder-slate-700"
                placeholder="0"
              />
              <div className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
                Lembar Isi
              </div>
            </div>

            <button
              onClick={() => setSheetsPerBook(sheetsPerBook + 10)}
              className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-400 font-bold text-xl transition-colors"
            >
              +
            </button>
          </div>

          {/* KALKULATOR MINI (PREVIEW) */}
          <div className="mt-6 flex justify-between items-center bg-black/20 p-3 rounded-lg border border-slate-800/50">
            <div className="text-[10px] text-slate-500">
              Rumus: {sheetsPerBook} lbr x (Rp{paperPrice} + Rp{printPrice})
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase font-bold">
                Total Isi
              </div>
              <div className="text-sm font-mono font-bold text-emerald-400">
                Rp {contentCost.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
