import React from "react";
import {
  Package,
  Ruler,
  Mountain,
  Scroll,
  CheckCircle2,
  ArrowRight,
  Zap, // Icon Petir untuk Grosir
  Image as ImageIcon, // Icon untuk Poster
  Shirt, // Icon untuk Apparel
} from "lucide-react";

export const ProductCard = ({ product, onClick }) => {
  const catId = product.category_id || product.categoryId;

  // --- 1. DETECT HERO CONDITION ---
  const isOutdoorHero =
    catId === "CAT_OUTDOOR" || product.input_mode === "AREA";

  const isPosterHero = catId === "CAT_POSTER";

  // Updated Logic: Check for Rolls or Sticker keywords but EXCLUDE A3+
  const isRollsHero =
    (catId === "CAT_ROLLS" ||
      catId === "CAT_STICKER" ||
      catId === "CAT_ROLL_MATERIALS" || // Added DB ID
      product.name?.toLowerCase().includes("stiker")) &&
    catId !== "DIGITAL_A3_PRO" && // Critical Exclusion
    catId !== "MERCH_APPAREL"; // Exclude Apparel

  const isA3Hero = catId === "DIGITAL_A3_PRO";

  const isApparelHero = catId === "MERCH_APPAREL";

  // --- 2. DETECT WHOLESALE (TIERED) ---
  // Cek apakah produk punya aturan grosir di advanced_features
  const wholesaleRules = product.advanced_features?.wholesale_rules || [];
  const hasWholesale = wholesaleRules.length > 0 || product.is_wholesale;

  // --- 3. HERO CARD LAYOUT (OUTDOOR / SPANDUK) ---
  if (isOutdoorHero) {
    return (
      <div
        onClick={() => onClick(product)}
        className="group relative col-span-full sm:col-span-2 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 border-cyan-500/30 p-6 hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] transition-all duration-300 cursor-pointer"
      >
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-400/20 transition-all duration-500"></div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Mountain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wide">
                  {product.name.replace("(Outdoor)", "")}
                </h3>
                <p className="text-cyan-400 text-sm font-medium tracking-wider">
                  OUTDOOR & BALIHO HIGH RES
                </p>
              </div>
            </div>

            {/* BADGE GROSIR HERO (JIKA ADA) */}
            {hasWholesale && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-yellow-400/50 bg-yellow-400/10 text-yellow-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                <Zap size={14} fill="currentColor" />
                <span>Grosir Available</span>
              </div>
            )}
          </div>

          {/* Smart Badges Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              icon={<Scroll size={14} />}
              text={`${product.variants?.length || 0} Opsi Bahan`}
              color="bg-slate-800 text-cyan-300 border-cyan-500/30"
            />
            <Badge
              icon={<CheckCircle2 size={14} />}
              text="Free Finishing"
              color="bg-emerald-900/30 text-emerald-400 border-emerald-500/30"
            />
            <Badge
              icon={<Ruler size={14} />}
              text="Hitung Meter (m²)"
              color="bg-purple-900/30 text-purple-400 border-purple-500/30"
            />
          </div>

          {/* Material Preview */}
          {product.variants?.length > 0 && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(6, 182, 212, 0.15)",
              }}
            >
              {product.variants.slice(0, 3).map((variant, idx) => (
                <div
                  key={variant.label || idx}
                  className="flex flex-col mb-2 last:mb-0"
                >
                  <span className="text-[13px] font-semibold text-cyan-300">
                    📦 {variant.label}
                  </span>
                  <span className="text-[12px] text-slate-400 leading-tight">
                    {variant.desc ||
                      variant.specs ||
                      "Material cetak berkualitas"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <div className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
            KONFIGURASI UKURAN <ArrowRight size={18} />
          </div>
        </div>
      </div>
    );
  }

  // --- 3.B. HERO CARD LAYOUT (POSTER / INDOOR) ---
  if (isPosterHero) {
    return (
      <div
        onClick={() => onClick(product)}
        className="group relative col-span-full sm:col-span-1 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900 border-2 border-purple-500/30 p-5 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all duration-300 cursor-pointer h-full"
      >
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-400/20 transition-all duration-500"></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wide leading-tight">
                  {product.name.replace("Cetak ", "")}
                </h3>
                <p className="text-purple-400 text-[10px] font-bold tracking-wider uppercase mb-1">
                  INDOOR & POSTER
                </p>
                {/* NEW: SIZE INDICATOR (The "Intern-Proof" Feature) */}
                <p className="text-purple-200/70 text-[10px] font-mono border-t border-purple-500/20 pt-1 mt-1">
                  Size: A0 • A1 • A2
                </p>
              </div>
            </div>
          </div>

          {/* Variant CHIPS List (Refined Layout) */}
          <div className="flex flex-wrap gap-1.5 mb-4 content-start">
            {product.variants?.slice(0, 8).map((variant, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-100 text-[9px] font-medium leading-tight max-w-[120px] truncate"
                title={variant.label} // Tooltip for full name
              >
                {variant.label || variant.name}
              </span>
            ))}
            {(product.variants?.length || 0) > 8 && (
              <span className="px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[9px]">
                +{product.variants.length - 8} More
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-auto w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
            PILIH UKURAN <ArrowRight size={14} />
          </div>
        </div>
      </div>
    );
  }

  // --- 3.C. HERO CARD LAYOUT (ROLLS / STIKER / TEXTILE) ---
  // --- 3.C. HERO CARD LAYOUT (ROLLS / STIKER / TEXTILE) - MINI-SPANDUK CLONE ---
  if (isRollsHero) {
    return (
      <div
        onClick={() => onClick(product)}
        className="group relative flex flex-col justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-slate-900 via-pink-900/40 to-slate-900 border-2 border-pink-500/30 hover:border-pink-400 hover:shadow-[0_0_30px_rgba(236,72,153,0.25)] h-full"
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* 1. Header & Title (Clone of Outdoor) */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20">
                {/* Roll Icon SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wide leading-tight">
                  {product.name.replace("Cetak ", "")}
                </h3>
                <p className="text-pink-400 text-[10px] font-bold tracking-wider uppercase">
                  ROLL MATERIALS
                </p>
              </div>
            </div>
          </div>

          {/* 2. Feature Badges (Mocking Spanduk Features) */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["High Res", "Indoor/Outdoor", "Custom Size"].map((badge, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-pink-900/50 border border-pink-500/30 text-pink-200 text-[9px] font-bold uppercase tracking-wide"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* 3. Content: Variants List */}
          <div className="flex flex-wrap gap-1.5 mb-4 content-start">
            {product.variants?.slice(0, 6).map((variant, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-200 text-[10px] font-medium truncate max-w-[120px]"
              >
                {variant.name || variant.label}
              </span>
            ))}
            {(product.variants?.length || 0) > 6 && (
              <span className="px-1.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                +{product.variants.length - 6}
              </span>
            )}
          </div>

          {/* 4. Footer: Full Width Action Button (Clone of Outdoor) */}
          <div className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2">
            PILIH BAHAN <ArrowRight size={14} />
          </div>
        </div>
      </div>
    );
  }

  // --- 3.D. HERO CARD LAYOUT (A3+ DIGITAL PRINT) - AMBER HERO ---
  if (isA3Hero) {
    return (
      <div
        onClick={() => onClick(product)}
        className="group relative flex flex-col justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-slate-900 via-amber-900/40 to-slate-900 border-2 border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] h-full"
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* 1. Header & Title (Productivity Theme) */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                {/* Sheet Icon for A3+ */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wide leading-tight">
                  {product.name.replace("Cetak ", "")}
                </h3>
                <p className="text-amber-400 text-[10px] font-bold tracking-wider uppercase">
                  DIGITAL LAZER A3+
                </p>
              </div>
            </div>

            {/* LIGHTNING BADGE (Wholesale Active) */}
            {wholesaleRules.length > 0 && (
              <div className="absolute top-0 right-0 animate-pulse">
                <div className="p-1.5 rounded-full bg-yellow-500/20 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                  <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
              </div>
            )}
          </div>

          {/* 2. Feature Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["Premium Color", "Fuji Xerox", "One Day Service"].map(
              (badge, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-500/30 text-amber-200 text-[9px] font-bold uppercase tracking-wide"
                >
                  {badge}
                </span>
              ),
            )}
          </div>

          {/* 3. Content: Variants List */}
          <div className="flex flex-wrap gap-1.5 mb-4 content-start">
            {product.variants?.slice(0, 6).map((variant, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] font-medium truncate max-w-[120px]"
              >
                {variant.name || variant.label}
              </span>
            ))}
            {(product.variants?.length || 0) > 6 && (
              <span className="px-1.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                +{product.variants.length - 6}
              </span>
            )}
          </div>

          {/* 4. Footer: Full Width Action Button */}
          <div className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2">
            KONFIGURASI CETAK <ArrowRight size={14} />
          </div>
        </div>
      </div>
    );
  }

  // --- 3.E. HERO CARD LAYOUT (APPAREL & MERCH) - RUBY HERO ---
  if (isApparelHero) {
    return (
      <div
        onClick={() => onClick(product)}
        className="group relative flex flex-col justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-slate-900 via-rose-900/40 to-slate-900 border-2 border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_30px_rgba(225,29,72,0.25)] h-full"
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* 1. Header & Title (Fashion Theme) */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20">
                {/* Shirt Icon for Apparel */}
                <Shirt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wide leading-tight">
                  {product.name.replace("Cetak ", "")}
                </h3>
                <p className="text-rose-400 text-[10px] font-bold tracking-wider uppercase">
                  APPAREL & MERCH
                </p>
              </div>
            </div>

            {/* WHOLESALE INDICATOR (LIGHTNING) */}
            {hasWholesale && (
              <div
                className="p-1.5 rounded-full bg-yellow-500/20 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse"
                title="GROSIR AVAILABLE"
              >
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>

          {/* 2. Content: Variants List (Sizes/Colors) - FOCUSED */}
          <div className="flex flex-wrap gap-2 mb-4 content-start">
            {product.variants?.slice(0, 10).map((variant, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-bold tracking-wide text-center min-w-[32px]"
              >
                {variant.name || variant.label}
              </span>
            ))}
            {(product.variants?.length || 0) > 10 && (
              <span className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                +{product.variants.length - 10} More
              </span>
            )}
          </div>

          {/* 4. Footer: Full Width Action Button */}
          <div className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2">
            PILIH UKURAN <ArrowRight size={14} />
          </div>
        </div>
      </div>
    );
  }

  // --- 4. STANDARD CARD LAYOUT ---
  const visibleVariants = product.variants?.slice(0, 4) || [];
  const remainingCount =
    (product.variants?.length || 0) - visibleVariants.length;

  return (
    <div
      onClick={() => onClick(product)}
      className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300 ease-in-out cursor-pointer"
      style={{
        background: "linear-gradient(145deg, #0f172a, #1e293b)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.5)";
        e.currentTarget.style.boxShadow = "0 0 15px rgba(6, 182, 212, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl opacity-30"></div>

      {/* --- BADGE GROSIR (NEON KUNING FUTURISTIC) --- */}
      {hasWholesale && (
        <div className="absolute top-4 right-4 z-20 group/tooltip">
          {/* The Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(234,179,8,0.15)] group-hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all">
            <Zap size={12} fill="currentColor" />
            <span>Grosir</span>
          </div>

          {/* THE TOOLTIP (Muncul saat Hover Badge) */}
          <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-lg bg-slate-900 border border-yellow-500/30 shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50">
            <p className="text-[10px] font-bold text-yellow-500 mb-2 uppercase tracking-wide border-b border-yellow-500/20 pb-1">
              Diskon Kuantitas
            </p>
            <div className="flex flex-col gap-1">
              {wholesaleRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-[10px]"
                >
                  <span className="text-slate-400">
                    {rule.min} - {rule.max} pcs
                  </span>
                  <span className="font-bold text-emerald-400">
                    Hemat Rp {rule.value?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Header: Category Name */}
        <div className="flex items-center justify-between mb-2 pr-16">
          {" "}
          {/* pr-16 biar gak nabrak badge */}
          <h3 className="text-xl font-bold text-white tracking-wide leading-tight">
            {product.name}
          </h3>
        </div>

        {/* Input Mode Badge (Subtle) */}
        <div className="mb-3">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(148, 163, 184, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.1)",
            }}
          >
            {product.input_mode} MODE
          </span>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-slate-400 text-sm leading-relaxed">
          {product.description || "Kategori Produk & Layanan"}
        </p>

        {/* Variant Badges */}
        {visibleVariants.length > 0 && (
          <div className="flex flex-col gap-2">
            {visibleVariants.map((variant, index) => (
              <div
                key={index}
                className="flex flex-col px-3 py-2 rounded-lg bg-white/5 border border-slate-700/50"
              >
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-cyan-400/90" />
                  <span className="font-semibold text-slate-200 text-sm">
                    {variant.label || variant.name}
                  </span>
                </div>
                {variant.desc && (
                  <span className="mt-1 ml-6 text-slate-400 text-xs">
                    {variant.desc}
                  </span>
                )}
                {/* Khusus Matrix: Tampilkan Hint Harga */}
                {variant.price_list && (
                  <span className="mt-1 ml-6 text-cyan-300/80 text-[10px]">
                    Tersedia {Object.keys(variant.price_list).length} Ukuran
                  </span>
                )}
              </div>
            ))}

            {remainingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 border border-slate-700/30 text-slate-400">
                +{remainingCount} pilihan lainnya
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---
const Badge = ({ icon, text, color }) => (
  <div
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${color} text-xs font-semibold`}
  >
    {icon}
    <span>{text}</span>
  </div>
);

export default ProductCard;
