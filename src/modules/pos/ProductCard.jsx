import React from "react";
import {
  Package,
  Ruler,
  Mountain,
  Scroll,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const ProductCard = ({ product, onClick }) => {
  // --- 1. DETECT HERO CONDITION (LOOSER CHECK) ---
  const isOutdoorHero =
    product.categoryId === "CAT_OUTDOOR" || product.input_mode === "AREA";

  // Debugging (Check Console if this triggers)
  if (product.name.includes("SPANDUK")) {
    console.log(
      `[ProductCard] Rendering ${product.name}: isOutdoorHero=${isOutdoorHero}, CatID=${product.categoryId}`,
    );
  }

  // --- 2. HERO CARD LAYOUT (OUTDOOR / SPANDUK) ---
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
          </div>

          {/* Smart Badges Info */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge
              icon={<Scroll size={14} />}
              text="4 Opsi Bahan"
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

          {/* Action Button */}
          <div className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-center tracking-widest uppercase group-hover:scale-[1.02] transition-transform shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
            KONFIGURASI UKURAN <ArrowRight size={18} />
          </div>
        </div>
      </div>
    );
  }

  // --- 3. STANDARD CARD LAYOUT (ELEGANT & MINIMALIST - MATCHING SPANDUK STYLE) ---
  const visibleVariants = product.variants?.slice(0, 4) || [];
  const remainingCount =
    (product.variants?.length || 0) - visibleVariants.length;
  const productDescription = product.description || "Kategori Produk & Layanan";

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

      <div className="relative z-10">
        {/* Header: Category Name */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white tracking-wide">
            {product.name}
          </h3>

          {/* Input Mode Badge (Subtle) */}
          <div
            className="px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(148, 163, 184, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.1)",
            }}
          >
            {product.input_mode}
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-sm mb-4 line-clamp-1">
          {productDescription}
        </p>

        {/* Variant Badges (Blended, Elegant) */}
        {visibleVariants.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleVariants.map((variant, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(203, 213, 225, 0.9)",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                }}
              >
                <Package size={12} style={{ opacity: 0.6 }} />
                <span className="line-clamp-1">
                  {variant.label || variant.name}
                </span>
              </div>
            ))}

            {remainingCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "rgba(148, 163, 184, 0.7)",
                  border: "1px solid rgba(148, 163, 184, 0.08)",
                }}
              >
                +{remainingCount} lainnya
              </div>
            )}
          </div>
        )}

        {/* Fallback if no variants */}
        {visibleVariants.length === 0 && (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "rgba(148, 163, 184, 0.6)" }}
          >
            <Package size={14} />
            <span>Tersedia berbagai pilihan</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS & FUNCTIONS ---

const Badge = ({ icon, text, color }) => (
  <div
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${color} text-xs font-semibold`}
  >
    {icon}
    <span>{text}</span>
  </div>
);

export default ProductCard;
