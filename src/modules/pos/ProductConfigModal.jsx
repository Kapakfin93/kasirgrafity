import React, { useState, useEffect, useMemo } from "react";
import { X, ShoppingCart, Info, FileText, Check, Ruler } from "lucide-react";

export default function ProductConfigModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [matrixSelection, setMatrixSelection] = useState({
    step1: null,
    step2: null,
  });
  const [dimensions, setDimensions] = useState({ length: 1, width: 1 });
  const [selectedFinishings, setSelectedFinishings] = useState({});
  const [notes, setNotes] = useState("");

  // --- 1. RESET STATE ON OPEN ---
  useEffect(() => {
    if (isOpen && product) {
      setQty(product.min_qty || 1);
      setNotes("");
      setSelectedFinishings({});
      setDimensions({ length: 1, width: 1 });

      // Auto-select defaults based on Mode
      if (product.input_mode === "AREA" && product.variants?.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else if (
        product.input_mode === "UNIT" &&
        product.variants?.length > 0
      ) {
        setSelectedVariant(product.variants[0]);
      } else if (product.input_mode === "MATRIX") {
        setMatrixSelection({ step1: null, step2: null });
      }
    }
  }, [isOpen, product]);

  // --- 2. SAFE GUARDS & HELPERS ---
  const safeProduct = product || {};
  const inputMode = safeProduct.input_mode || "UNIT";
  const isArea = inputMode === "AREA";
  const isMatrix = inputMode === "MATRIX";

  // --- 3. PRICE CALCULATION LOGIC ---
  const currentBasePrice = useMemo(() => {
    if (!product) return 0;
    if (isArea || !isMatrix) {
      return selectedVariant
        ? selectedVariant.price || safeProduct.base_price || 0
        : safeProduct.base_price || 0;
    }
    // Matrix Logic
    if (!matrixSelection.step1) return safeProduct.base_price || 0;
    const variant1 = safeProduct.variants?.find(
      (v) => v.label === matrixSelection.step1
    );
    if (matrixSelection.step2 && variant1?.price_list) {
      return (
        variant1.price_list[matrixSelection.step2] ||
        safeProduct.base_price ||
        0
      );
    }
    return safeProduct.base_price || 0;
  }, [
    product,
    isArea,
    isMatrix,
    selectedVariant,
    matrixSelection,
    safeProduct,
  ]);

  // AREA LOGIC: Ceiling Rounding (1.5 x 1.5 = 2.25 -> 3m)
  const areaCalculation = useMemo(() => {
    if (!isArea) return { area: 0, chargeable: 0 };
    const rawArea = dimensions.length * dimensions.width;
    const chargeable = Math.ceil(rawArea); // RULE: ROUND UP (CEILING)
    return { area: rawArea, chargeable };
  }, [dimensions, isArea]);

  const getTieredPrice = (base, quantity) => {
    if (!safeProduct.advanced_features?.wholesale_rules) return base;
    const rules = safeProduct.advanced_features.wholesale_rules;
    const rule = rules.find((r) => quantity >= r.min && quantity <= r.max);
    return rule ? rule.price : base;
  };

  const finalUnitPrice = useMemo(() => {
    let price = getTieredPrice(currentBasePrice, qty);
    if (isArea) {
      // Display Price = Price/m² * Chargeable Area
      return price * areaCalculation.chargeable;
    }
    return price;
  }, [currentBasePrice, qty, isArea, areaCalculation]);

  const finishingTotal = useMemo(() => {
    // RULE: Finishing is FREE for Large Format (Area Mode)
    if (isArea) return 0;

    if (!safeProduct.finishing_groups) return 0;
    let total = 0;
    safeProduct.finishing_groups.forEach((group) => {
      const selected = selectedFinishings[group.id];
      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach((optLabel) => {
            const opt = group.options?.find((o) => o.label === optLabel);
            if (opt) total += opt.price;
          });
        } else {
          const opt = group.options?.find((o) => o.label === selected);
          if (opt) total += opt.price;
        }
      }
    });
    return total;
  }, [safeProduct, selectedFinishings, isArea]);

  const grandTotal = (finalUnitPrice + finishingTotal) * qty;

  const tierHint = useMemo(() => {
    if (!safeProduct.advanced_features?.wholesale_rules) return null;
    const rules = safeProduct.advanced_features.wholesale_rules;
    const nextRule = rules.find((r) => r.min > qty);
    if (nextRule) return { min: nextRule.min, price: nextRule.price };
    return null;
  }, [safeProduct, qty]);

  // --- 4. HANDLERS ---
  const handleSave = () => {
    if (isMatrix && (!matrixSelection.step1 || !matrixSelection.step2)) {
      alert("Mohon lengkapi pilihan varian");
      return;
    }

    // Payload Construction
    const productPriceToSend = isArea
      ? currentBasePrice // Send RAW price/m² for Area
      : finalUnitPrice + finishingTotal; // Send Final Unit Price for others

    let variantLabel = "Standard";
    if (isMatrix)
      variantLabel = `${matrixSelection.step1} | ${matrixSelection.step2}`;
    else if (isArea && selectedVariant)
      variantLabel = `${selectedVariant.label} (${dimensions.length}m x ${dimensions.width}m)`;
    else if (selectedVariant) variantLabel = selectedVariant.label;

    // Build finishings array for cart validator (FIX: object -> array)
    const finishingsArray = [];
    if (safeProduct?.finishing_groups) {
      safeProduct.finishing_groups.forEach((group) => {
        const selected = selectedFinishings[group?.id];
        if (selected) {
          if (Array.isArray(selected)) {
            selected.forEach((optLabel) => {
              const opt = group?.options?.find((o) => o.label === optLabel);
              if (opt)
                finishingsArray.push({
                  id: opt.label,
                  name: opt.label,
                  price: opt.price || 0,
                });
            });
          } else {
            const opt = group?.options?.find((o) => o.label === selected);
            if (opt)
              finishingsArray.push({
                id: opt.label,
                name: opt.label,
                price: opt.price || 0,
              });
          }
        }
      });
    }

    onAddToCart({
      product: {
        ...safeProduct,
        price: productPriceToSend,
        pricing_model: inputMode,
      },
      qty,
      dimensions: isArea
        ? {
            length: dimensions.length,
            width: dimensions.width,
            area: areaCalculation.area,
          }
        : isMatrix
        ? { sizeKey: matrixSelection.step2 }
        : {},
      final_price: productPriceToSend,
      finishings: finishingsArray, // ✅ FIXED: Array instead of object
      selected_details: {
        variant: variantLabel,
        notes: notes,
      },
    });
    onClose();
  };

  if (!isOpen || !product) return null;

  // --- 5. RENDERERS (SULTAN STYLING APPLIED) ---

  const renderAreaInputs = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <div>
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih Bahan (Per
          Meter)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {product.variants?.map((v, i) => {
            const isSelected = selectedVariant?.label === v.label;
            return (
              <button
                key={i}
                onClick={() => setSelectedVariant(v)}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex justify-between items-center group ${
                  isSelected
                    ? "border-cyan-500 bg-slate-800 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                }`}
              >
                <span
                  className={`font-bold text-base ${
                    isSelected
                      ? "text-white"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  {v.label}
                </span>
                <span className="text-xs bg-slate-900 px-3 py-1 rounded-full text-cyan-400 font-mono border border-slate-700">
                  Rp {v.price?.toLocaleString()}/m²
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <h3 className="text-slate-200 text-sm font-bold mb-6 flex items-center gap-2">
          <Ruler size={18} className="text-emerald-400" /> Input Ukuran (Meter)
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-2 block font-bold uppercase tracking-wider">
              Panjang (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={dimensions.length}
              onFocus={(e) => e.target.select()} // UX: Auto-select
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  length: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white text-center font-black text-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
            />
          </div>
          <div className="text-slate-600 font-black text-xl pt-6">X</div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-2 block font-bold uppercase tracking-wider">
              Lebar (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={dimensions.width}
              onFocus={(e) => e.target.select()} // UX: Auto-select
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  width: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white text-center font-black text-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 border-dashed">
          <div className="text-xs text-slate-400 font-medium">
            Total Luas Real:{" "}
            <span className="text-white font-bold ml-1">
              {areaCalculation.area.toFixed(2)} m²
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
              Pembulatan:
            </span>
            <span className="text-lg text-emerald-400 font-black bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/30">
              {areaCalculation.chargeable} m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] w-full max-w-6xl rounded-[2rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row h-[95vh] md:h-[90vh] overflow-hidden relative">
        {/* LEFT COLUMN: OPTIONS */}
        <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
          <header className="mb-10 border-b border-slate-800/50 pb-6">
            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-800/30 mb-3 inline-block shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              {product.categoryId?.replace("_", " ")}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight leading-tight">
              {product.name}
            </h2>
          </header>

          <div className="space-y-12">
            {isArea ? (
              renderAreaInputs()
            ) : (
              <section>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih Tipe &
                  Spesifikasi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(isMatrix ? product.variants : product.variants)?.map(
                    (v, i) => {
                      const isSelected = isMatrix
                        ? matrixSelection.step1 === v.label
                        : selectedVariant?.label === v.label;
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            isMatrix
                              ? setMatrixSelection((prev) => ({
                                  ...prev,
                                  step1: v.label,
                                  step2: null,
                                }))
                              : setSelectedVariant(v)
                          }
                          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                            isSelected
                              ? "border-cyan-500 bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                              : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                          }`}
                        >
                          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div
                            className={`font-bold text-lg relative z-10 ${
                              isSelected
                                ? "text-cyan-400"
                                : "text-slate-200 group-hover:text-white"
                            }`}
                          >
                            {v.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 italic relative z-10">
                            {v.specs}
                          </div>
                          {!isMatrix && (
                            <div className="mt-3 font-bold text-cyan-300 relative z-10">
                              Rp {v.price?.toLocaleString()}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-3 right-3 text-cyan-500">
                              <Check size={20} />
                            </div>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {isMatrix && matrixSelection.step1 && (
              <section className="animate-in slide-in-from-top-4 duration-300">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-slate-600"></span>Langkah 2:
                  Pilih Detail
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(
                    product.variants?.find(
                      (v) => v.label === matrixSelection.step1
                    )?.price_list || {}
                  ).map((opt, i) => {
                    const isSelected = matrixSelection.step2 === opt;
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setMatrixSelection((prev) => ({
                            ...prev,
                            step2: opt,
                          }))
                        }
                        className={`p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all group ${
                          isSelected
                            ? "border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                        }`}
                      >
                        <span
                          className={`font-medium ${
                            isSelected
                              ? "text-emerald-400"
                              : "text-slate-300 group-hover:text-white"
                          }`}
                        >
                          {opt}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold ${
                            isSelected
                              ? "bg-emerald-900/30 text-emerald-400"
                              : "bg-slate-900/50 text-slate-400"
                          }`}
                        >
                          Rp{" "}
                          {product.variants
                            .find((v) => v.label === matrixSelection.step1)
                            .price_list[opt].toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {product.finishing_groups?.length > 0 && (
              <section className="border-t border-slate-800/50 pt-8">
                <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="p-1.5 bg-cyan-950 rounded-lg">
                      <Info size={14} />
                    </span>{" "}
                    Finishing & Opsi
                  </span>
                  {isArea && (
                    <span className="text-emerald-400 text-[10px] bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-500/30 font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      FREE FOR LARGE FORMAT
                    </span>
                  )}
                </h3>
                <div className="space-y-6">
                  {product.finishing_groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-slate-800/20 p-5 rounded-2xl border border-slate-700/30 backdrop-blur-sm"
                    >
                      <div className="text-sm font-bold text-slate-200 mb-4">
                        {group.title}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {group.options?.map((opt, i) => {
                          const isSelected =
                            group.type === "radio"
                              ? selectedFinishings[group.id] === opt.label
                              : selectedFinishings[group.id]?.includes(
                                  opt.label
                                );
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (group.type === "radio")
                                  setSelectedFinishings((prev) => ({
                                    ...prev,
                                    [group.id]: opt.label,
                                  }));
                                else
                                  setSelectedFinishings((prev) => {
                                    const curr = prev[group.id] || [];
                                    return {
                                      ...prev,
                                      [group.id]: curr.includes(opt.label)
                                        ? curr.filter((x) => x !== opt.label)
                                        : [...curr, opt.label],
                                    };
                                  });
                              }}
                              className={`px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center gap-2 font-medium ${
                                isSelected
                                  ? "border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                  : "border-slate-700/50 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                              }`}
                            >
                              {isSelected && (
                                <Check size={14} className="text-cyan-400" />
                              )}
                              {opt.label}
                              {!isArea && opt.price > 0 ? (
                                <span className="ml-1 opacity-70 text-[10px] bg-slate-950 px-1.5 rounded text-slate-400">
                                  +{opt.price / 1000}k
                                </span>
                              ) : (
                                <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                                  FREE
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CALCULATION */}
        <div className="w-full md:w-[420px] bg-[#020617] p-8 flex flex-col justify-between border-l border-slate-800/50 relative shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-slate-900/50 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="mt-12 space-y-8">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                Jumlah Order (Pcs)
              </label>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 text-2xl font-bold transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={qty}
                  onFocus={(e) => e.target.select()} // UX: Auto-select
                  onChange={(e) =>
                    setQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex-1 bg-transparent text-center text-white text-3xl font-black outline-none"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 text-2xl font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="text-xs text-center mt-3 text-slate-500 font-medium">
                {isArea ? (
                  <span>
                    Total Cetak:{" "}
                    <strong className="text-slate-300">{qty}</strong> x (
                    <strong className="text-slate-300">
                      {areaCalculation.chargeable}m²
                    </strong>
                    )
                  </span>
                ) : (
                  <span>
                    Total Barang:{" "}
                    <strong className="text-slate-300">{qty} pcs</strong>
                  </span>
                )}
              </div>

              {/* TIER HINT */}
              {tierHint && (
                <div className="mt-4 text-sm text-emerald-300 flex items-start gap-3 bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/20 animate-pulse">
                  <Info size={20} className="shrink-0 mt-0.5" />
                  <span>
                    Ambil <b>{tierHint.min} pcs</b>, harga jadi{" "}
                    <b>Rp {tierHint.price?.toLocaleString()}</b>/pcs!
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText size={14} className="text-cyan-400" /> Catatan Khusus
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Nama file, Nama punggung..."
                className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-slate-200 text-sm focus:border-cyan-500 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none transition-all placeholder:text-slate-600"
              ></textarea>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800/50 space-y-6">
            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Harga Dasar {isArea ? "(Per Meter)" : "(Satuan)"}</span>
                <span className="text-slate-300">
                  Rp{" "}
                  {isArea
                    ? currentBasePrice.toLocaleString()
                    : finalUnitPrice.toLocaleString()}
                </span>
              </div>
              {isArea && (
                <div className="flex justify-between text-slate-500">
                  <span>Luas Terhitung</span>
                  <span className="text-emerald-400">
                    {areaCalculation.chargeable} m²
                  </span>
                </div>
              )}
              {finishingTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Finishing</span>
                  <span className="text-cyan-400">
                    + Rp {finishingTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-[1.5rem] border border-slate-800 shadow-inner">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                Total Estimasi
              </div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                Rp {grandTotal.toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onClose}
                className="py-4 rounded-2xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-black text-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} /> Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
