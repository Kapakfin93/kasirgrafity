import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Info,
  FileText,
  Check,
  Ruler,
  Lock,
} from "lucide-react";

export default function ProductConfigModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) {
  // --- 1. INITIALIZERS (SAFE LEGACY) ---
  const getInitialVariant = () => {
    if (!product) return null;
    // Jaga-jaga untuk produk lama (Apparel/Stationery)
    if (
      (product.input_mode === "AREA" ||
        product.input_mode === "LINEAR" ||
        product.input_mode === "UNIT") &&
      product.variants?.length > 0
    ) {
      return product.variants[0];
    }
    return null;
  };

  const getInitialDimensions = () => {
    if (!product) return { length: 1, width: 1 };
    if (product.input_mode === "LINEAR" && product.variants?.length > 0) {
      return { length: 1, width: product.variants[0].width || 1 };
    }
    return { length: 1, width: 1 };
  };

  // --- 2. STATE ---
  const [qty, setQty] = useState(() => product?.min_qty || 1);
  const [selectedVariant, setSelectedVariant] = useState(getInitialVariant);

  // Matrix Selection State
  const [matrixSelection, setMatrixSelection] = useState({
    step1: null,
    step2: null,
  });

  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const [selectedFinishings, setSelectedFinishings] = useState({});
  const [notes, setNotes] = useState("");
  const [displayProduct, setDisplayProduct] = useState(product);

  // Booklet State
  const [printMode, setPrintMode] = useState(() => {
    if (product?.input_mode === "BOOKLET" && product?.print_modes?.length > 0) {
      return product.print_modes[0];
    }
    return null;
  });
  const [sheetsPerBook, setSheetsPerBook] = useState(100);

  // --- 3. DERIVED PROPS ---
  useEffect(() => {
    setDisplayProduct(product);
  }, [product]);

  const safeProduct = useMemo(() => displayProduct || {}, [displayProduct]);
  const inputMode = safeProduct.input_mode || "UNIT";
  const isArea = inputMode === "AREA";
  const isLinear = inputMode === "LINEAR";
  const isMatrix = inputMode === "MATRIX";
  const isBooklet = inputMode === "BOOKLET";

  // 🔥 DETEKTOR KHUSUS: Apakah ini Poster Supabase?
  // Syarat: Mode Matrix DAN punya data 'sizes' + 'price_matrix'
  const isNewMatrix =
    isMatrix &&
    safeProduct.sizes?.length > 0 &&
    safeProduct.price_matrix?.length > 0;

  // --- 4. PRICE CALCULATION ---
  const currentBasePrice = useMemo(() => {
    if (!product) return 0;

    // A. AREA / LINEAR / UNIT (APPAREL) / BOOKLET
    if (isArea || isLinear || (!isMatrix && !isBooklet)) {
      return selectedVariant
        ? selectedVariant.price || safeProduct.base_price || 0
        : safeProduct.base_price || 0;
    }

    // B. MATRIX LOGIC
    if (!matrixSelection.step1) return safeProduct.base_price || 0;

    // B1. JALUR BARU (Poster Supabase)
    if (isNewMatrix) {
      if (!matrixSelection.step2) return 0;
      const matrixRow = safeProduct.price_matrix.find(
        (row) =>
          row.size_id === matrixSelection.step1 &&
          row.material_id === matrixSelection.step2,
      );
      return matrixRow ? matrixRow.price : 0;
    }

    // B2. JALUR LAMA (Stationery Matrix)
    const variant1 = safeProduct.variants?.find(
      (v) => v.label === matrixSelection.step1,
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
    isLinear,
    isMatrix,
    isNewMatrix,
    isBooklet,
    selectedVariant,
    matrixSelection,
    safeProduct,
  ]);

  // AREA/LINEAR CALCULATION
  const areaCalculation = useMemo(() => {
    if (!isArea && !isLinear) return { area: 0, chargeable: 0 };
    const rawArea = dimensions.length * dimensions.width;
    const chargeable = isArea ? Math.ceil(rawArea) : dimensions.length;
    return { area: rawArea, chargeable };
  }, [dimensions, isArea, isLinear]);

  const getTieredPrice = useCallback(
    (base, quantity) => {
      if (!safeProduct.advanced_features?.wholesale_rules) return base;
      const rules = safeProduct.advanced_features.wholesale_rules;
      const rule = rules.find((r) => quantity >= r.min && quantity <= r.max);
      return rule ? rule.price : base;
    },
    [safeProduct.advanced_features],
  );

  const finalUnitPrice = useMemo(() => {
    let price = getTieredPrice(currentBasePrice, qty);

    if (isArea) return price * areaCalculation.chargeable;
    if (isLinear) return price * dimensions.length;
    if (isBooklet) {
      const paperPrice = selectedVariant?.price || 0;
      const printPrice = printMode?.price || 0;
      return (paperPrice + printPrice) * sheetsPerBook;
    }
    return price;
  }, [
    currentBasePrice,
    qty,
    isArea,
    isLinear,
    isBooklet,
    areaCalculation,
    dimensions,
    printMode,
    selectedVariant,
    sheetsPerBook,
    getTieredPrice,
  ]);

  const finishingTotal = useMemo(() => {
    if (isArea) return 0;
    if (!safeProduct.finishing_groups) return 0;
    let total = 0;
    safeProduct.finishing_groups.forEach((group) => {
      const selected = selectedFinishings[group.id];
      if (selected) {
        const calculateOptionPrice = (opt) => {
          if (isBooklet && group.price_mode === "PER_JOB") return opt.price;
          if (isBooklet && group.price_mode === "PER_UNIT")
            return opt.price * sheetsPerBook;
          if (isLinear && group.price_mode === "PER_METER")
            return opt.price * dimensions.length;
          return opt.price;
        };
        if (Array.isArray(selected)) {
          selected.forEach((optLabel) => {
            const opt = group.options?.find((o) => o.label === optLabel);
            if (opt) total += calculateOptionPrice(opt);
          });
        } else {
          const opt = group.options?.find((o) => o.label === selected);
          if (opt) total += calculateOptionPrice(opt);
        }
      }
    });
    return total;
  }, [
    safeProduct,
    selectedFinishings,
    isArea,
    isLinear,
    isBooklet,
    dimensions,
    sheetsPerBook,
  ]);

  const grandTotal = (finalUnitPrice + finishingTotal) * qty;

  // --- 5. HANDLERS ---
  const handleSave = () => {
    if (isMatrix && (!matrixSelection.step1 || !matrixSelection.step2)) {
      alert("Mohon lengkapi pilihan ukuran dan bahan");
      return;
    }

    let variantLabel = "Standard";

    // Labeling Logic
    if (isMatrix) {
      if (isNewMatrix) {
        // Poster Supabase
        const sizeLabel =
          safeProduct.sizes.find((s) => s.id === matrixSelection.step1)
            ?.label || matrixSelection.step1;
        const matLabel =
          safeProduct.variants.find((m) => m.id === matrixSelection.step2)
            ?.label || matrixSelection.step2;
        variantLabel = `${sizeLabel} | ${matLabel}`;
      } else {
        // Stationery Matrix (Legacy)
        variantLabel = `${matrixSelection.step1} | ${matrixSelection.step2}`;
      }
    } else if ((isArea || isLinear) && selectedVariant) {
      variantLabel = `${selectedVariant.label} (${dimensions.length}m x ${dimensions.width}m)`;
    } else if (selectedVariant) {
      // Apparel / Unit Normal
      variantLabel = selectedVariant.label;
    }

    const finishingsArray = [];
    if (safeProduct?.finishing_groups) {
      safeProduct.finishing_groups.forEach((group) => {
        const selected = selectedFinishings[group?.id];
        if (selected) {
          const processOpt = (optLabel) => {
            const opt = group?.options?.find((o) => o.label === optLabel);
            if (opt) {
              let finalOptPrice = opt.price || 0;
              if (isLinear && group.price_mode === "PER_METER")
                finalOptPrice = opt.price * dimensions.length;
              finishingsArray.push({
                id: opt.label,
                name: opt.label,
                price: finalOptPrice,
                price_mode: group.price_mode || "PER_UNIT",
              });
            }
          };
          if (Array.isArray(selected)) selected.forEach(processOpt);
          else processOpt(selected);
        }
      });
    }

    onAddToCart({
      product: { ...safeProduct, pricing_model: inputMode },
      qty,
      dimensions:
        isArea || isLinear
          ? {
              length: dimensions.length,
              width: dimensions.width,
              area: areaCalculation.area,
              variantLabel,
            }
          : isMatrix
            ? {
                sizeKey: matrixSelection.step1,
                material: matrixSelection.step2,
                variantLabel,
              }
            : { variantLabel },
      finishings: finishingsArray,
      selected_details: { variant: variantLabel, notes },
      finalTotal: grandTotal,
      pricingSnapshot: {
        basePrice: currentBasePrice,
        finalUnitPrice,
        finishingTotal,
        grandTotal,
        qty,
      },
    });
    onClose();
  };

  if (!isOpen || !product) return null;

  // --- 6. RENDERERS (THE FIX IS HERE) ---

  // Render untuk AREA/LINEAR (Spanduk/Stiker/Kain)
  const renderDimensionInputs = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <div>
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih Bahan
          {isLinear ? " (Per Meter Lari)" : " (Per Meter Persegi)"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {product.variants?.map((v, i) => {
            const isSelected = selectedVariant?.label === v.label;
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedVariant(v);
                  // UNTUK KAIN/STIKER: Set lebar otomatis sesuai varian (Lock)
                  if (isLinear) {
                    setDimensions((prev) => ({ ...prev, width: v.width || 1 }));
                  }
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex justify-between items-start group ${
                  isSelected
                    ? isArea
                      ? "border-cyan-400 bg-slate-800 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                      : "border-cyan-500 bg-slate-800 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    : isArea
                      ? "border-slate-700/50 hover:border-slate-500 bg-slate-800/30 opacity-70"
                      : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className={`font-bold text-base ${
                      isSelected
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {v.label}
                  </span>
                  {/* Tampilkan Info Lock Lebar jika Linear */}
                  {isLinear && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Lock size={10} className="text-amber-500" /> Lebar:{" "}
                      {v.width}m (Fixed)
                    </span>
                  )}
                  {v.specs && (
                    <span className="text-[10px] text-slate-600 italic">
                      {v.specs}
                    </span>
                  )}
                </div>
                <span className="text-xs bg-slate-900 px-3 py-1 rounded-full text-cyan-400 font-mono border border-slate-700">
                  Rp {v.price?.toLocaleString()}/{isLinear ? "m" : "m²"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`p-6 rounded-3xl backdrop-blur-sm ${
          isArea
            ? "bg-slate-900/50 border border-slate-700 shadow-inner"
            : "bg-slate-800/30 border border-slate-700/50"
        }`}
      >
        <h3 className="text-slate-200 text-sm font-bold mb-6 flex items-center gap-2">
          <Ruler size={18} className="text-emerald-400" /> Input Ukuran
        </h3>
        <div className="flex items-center gap-4">
          {/* INPUT PANJANG (ANTI BANDEL) */}
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-2 block font-bold uppercase tracking-wider">
              Panjang (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              // Trik 1: Jika nilainya 0, ubah jadi string kosong "" agar placeholder "0" muncul
              value={dimensions.length === 0 ? "" : dimensions.length}
              placeholder="0"
              // Trik 2: Auto Blok angka saat diklik atau di-Tab
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.target.select()}
              onChange={(e) =>
                setDimensions((prev) => ({
                  ...prev,
                  // Trik 3: Jika dihapus habis (""), kembalikan ke 0
                  length:
                    e.target.value === "" ? 0 : parseFloat(e.target.value),
                }))
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white text-center font-black text-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
            />
          </div>

          <div className="text-slate-600 font-black text-xl pt-6">X</div>

          {/* INPUT LEBAR (ANTI BANDEL + LOCK) */}
          <div className="flex-1 relative">
            <label className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider flex justify-between">
              Lebar (m){" "}
              {isLinear && <Lock size={12} className="text-amber-500" />}
            </label>
            <input
              type="number"
              value={dimensions.width === 0 ? "" : dimensions.width}
              placeholder="0"
              readOnly={isLinear} // Kunci jika Kain/Stiker
              onFocus={(e) => !isLinear && e.target.select()}
              onClick={(e) => !isLinear && e.target.select()}
              onChange={(e) =>
                !isLinear &&
                setDimensions((prev) => ({
                  ...prev,
                  width: e.target.value === "" ? 0 : parseFloat(e.target.value),
                }))
              }
              className={`w-full border rounded-xl p-4 text-center font-black text-2xl outline-none transition-all ${
                isLinear
                  ? "bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-slate-900 border-slate-600 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              }`}
            />
          </div>
        </div>

        {/* INFO TOTAL LUAS */}
        <div className="mt-6 flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 border-dashed">
          <div className="text-xs text-slate-400 font-medium">
            Total Luas:{" "}
            <span className="text-white font-bold ml-1">
              {areaCalculation.area.toFixed(2)} m²
            </span>
          </div>
          {isArea && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Pembulatan:
              </span>
              <span className="text-lg text-emerald-400 font-black bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/30">
                {areaCalculation.chargeable} m²
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div
        className={`${isArea ? "bg-slate-950" : "bg-[#0f172a]"} w-full max-w-6xl rounded-[2rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row h-[95vh] md:h-[90vh] overflow-hidden relative`}
      >
        {/* LEFT COLUMN */}
        <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
          <header className="mb-10 border-b border-slate-800/50 pb-6">
            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-800/30 mb-3 inline-block">
              {product.categoryId?.replace("_", " ")}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              {product.name}
            </h2>
          </header>

          <div className="space-y-12">
            {/* ⚠️ JALUR 1: AREA / LINEAR (Spanduk/Stiker) */}
            {isArea || isLinear ? (
              renderDimensionInputs()
            ) : /* ⚠️ JALUR 2: NEW MATRIX (POSTER SUPABASE) */
            isNewMatrix ? (
              <>
                {/* STEP 1: UKURAN */}
                <section>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih
                    Ukuran
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {safeProduct.sizes?.map((v, i) => {
                      const isSelected = matrixSelection.step1 === v.id;
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            setMatrixSelection({ step1: v.id, step2: null })
                          }
                          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                            isSelected
                              ? "border-cyan-500 bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                              : "border-slate-700/50 hover:border-slate-500 bg-slate-800/30"
                          }`}
                        >
                          <div
                            className={`font-bold text-lg relative z-10 ${isSelected ? "text-cyan-400" : "text-slate-200"}`}
                          >
                            {v.label}
                          </div>
                          {(v.width_mm || v.height_mm) && (
                            <div className="text-xs text-slate-500 mt-1 italic relative z-10">
                              {v.width_mm && v.height_mm
                                ? `${v.width_mm / 10} x ${v.height_mm / 10} cm`
                                : ""}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-3 right-3 text-cyan-500">
                              <Check size={20} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* STEP 2: BAHAN */}
                {matrixSelection.step1 && (
                  <section className="animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-slate-600"></span> Pilih
                      Bahan
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {safeProduct.variants?.map((mat, i) => {
                        const isSelected = matrixSelection.step2 === mat.id;
                        const priceRow = safeProduct.price_matrix?.find(
                          (r) =>
                            r.size_id === matrixSelection.step1 &&
                            r.material_id === mat.id,
                        );
                        const price = priceRow ? priceRow.price : 0;

                        return (
                          <button
                            key={i}
                            onClick={() =>
                              setMatrixSelection((prev) => ({
                                ...prev,
                                step2: mat.id,
                              }))
                            }
                            className={`p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all group ${
                              isSelected
                                ? "border-emerald-500 bg-slate-800"
                                : "border-slate-700/50 bg-slate-800/30"
                            }`}
                          >
                            <span
                              className={`font-medium ${isSelected ? "text-emerald-400" : "text-slate-300"}`}
                            >
                              {mat.label}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded font-bold ${isSelected ? "bg-emerald-900/30 text-emerald-400" : "bg-slate-900/50 text-slate-400"}`}
                            >
                              {price > 0
                                ? `Rp ${price.toLocaleString()}`
                                : "N/A"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            ) : (
              /* ⚠️ JALUR 3 (THE RESCUE): LEGACY MATRIX & UNIT (Apparel/Stationery) */
              /* Ini adalah kode asli yang saya kembalikan agar Apparel tidak hilang */
              <section>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-cyan-500"></span> Pilih Tipe &
                  Spesifikasi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.variants?.map((v, i) => {
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
                  })}
                </div>

                {/* Legacy Matrix Step 2 (Stationery Only) */}
                {isMatrix && matrixSelection.step1 && !isNewMatrix && (
                  <div className="mt-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-4">
                    {Object.keys(
                      product.variants?.find(
                        (v) => v.label === matrixSelection.step1,
                      )?.price_list || {},
                    ).map((opt, i) => {
                      const isSelected = matrixSelection.step2 === opt;
                      const price = product.variants.find(
                        (v) => v.label === matrixSelection.step1,
                      ).price_list[opt];
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            setMatrixSelection((p) => ({ ...p, step2: opt }))
                          }
                          className={`p-4 rounded-xl border-2 flex justify-between ${isSelected ? "border-emerald-500 bg-slate-800" : "border-slate-700/50 bg-slate-800/30"}`}
                        >
                          <span
                            className={
                              isSelected ? "text-emerald-400" : "text-slate-300"
                            }
                          >
                            {opt}
                          </span>
                          <span className="text-xs text-slate-400">
                            Rp {price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* FINISHING SECTION (SHARED) */}
            {product.finishing_groups?.length > 0 && (
              <section className="border-t border-slate-800/50 pt-8">
                <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info size={14} /> Finishing & Opsi
                </h3>
                <div className="space-y-6">
                  {product.finishing_groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-slate-800/20 p-5 rounded-2xl border border-slate-700/30"
                    >
                      <div className="text-sm font-bold text-slate-200 mb-4">
                        {group.title}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {group.options?.map((opt, i) => {
                          const isChecked =
                            group.type === "radio"
                              ? selectedFinishings[group.id] === opt.label
                              : selectedFinishings[group.id]?.includes(
                                  opt.label,
                                );
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (group.type === "radio")
                                  setSelectedFinishings((p) => ({
                                    ...p,
                                    [group.id]: opt.label,
                                  }));
                                else
                                  setSelectedFinishings((p) => {
                                    const curr = p[group.id] || [];
                                    return {
                                      ...p,
                                      [group.id]: curr.includes(opt.label)
                                        ? curr.filter((x) => x !== opt.label)
                                        : [...curr, opt.label],
                                    };
                                  });
                              }}
                              className={`px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center gap-2 font-medium ${isChecked ? "border-cyan-500 bg-cyan-950/40 text-cyan-300" : "border-slate-700/50 bg-slate-900/50 text-slate-400"}`}
                            >
                              {isChecked && <Check size={14} />} {opt.label}
                              <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                                {opt.price > 0
                                  ? `+${opt.price / 1000}k`
                                  : "FREE"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* BOOKLET RENDERER (SHARED) */}
            {isBooklet && (
              <div className="text-slate-400 text-sm">
                Mode Booklet Aktif (UI Booklet Render...)
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CALCULATION */}
        <div className="w-full md:w-[420px] bg-[#020617] p-8 flex flex-col justify-between border-l border-slate-800/50 relative shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="mt-12 space-y-8">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                Jumlah Order
              </label>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-16 h-16 rounded-xl bg-slate-800 text-white font-bold text-2xl"
                >
                  -
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex-1 bg-transparent text-center text-white text-3xl font-black outline-none"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-16 h-16 rounded-xl bg-slate-800 text-white font-bold text-2xl"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                Catatan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-slate-200 outline-none resize-none"
                placeholder="Catatan pesanan..."
              />
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800/50 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-[1.5rem] border border-slate-800 shadow-inner">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                Total Estimasi
              </div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                Rp {grandTotal.toLocaleString()}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-black text-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} /> Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
