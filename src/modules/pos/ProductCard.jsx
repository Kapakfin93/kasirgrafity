import React from "react";
import {
  Package,
  Ruler,
  Mountain,
  Scroll,
  CheckCircle2,
  ArrowRight,
  Zap, // Icon Petir untuk Grosir
} from "lucide-react";

export const ProductCard = ({ product, onClick }) => {
  // --- 1. DETECT HERO CONDITION ---
  const isOutdoorHero =
    product.categoryId === "CAT_OUTDOOR" || product.input_mode === "AREA";

  // --- 2. DETECT WHOLESALE (TIERED) ---
  // Cek apakah produk punya aturan grosir di advanced_features
  const wholesaleRules = product.advanced_features?.wholesale_rules || [];
  const hasWholesale = wholesaleRules.length > 0;

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
