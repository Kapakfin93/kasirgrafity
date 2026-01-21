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

          {/* Material Preview - Show first 3 variants */}
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom:
                      idx < 2 && idx < product.variants.length - 1
                        ? "8px"
                        : "0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#67e8f9", // cyan-300
                    }}
                  >
                    📦 {variant.label}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8", // slate-400
                      lineHeight: "1.3",
                    }}
                  >
                    {variant.desc ||
                      variant.specs ||
                      "Material cetak berkualitas"}
                  </span>
                </div>
              ))}
              {product.variants.length > 3 && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#06b6d4", // cyan-500
                    fontStyle: "italic",
                  }}
                >
                  +{product.variants.length - 3} bahan lainnya
                </div>
              )}
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

        {/* Description - Improved Contrast */}
        <p
          className="mb-4 line-clamp-2"
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          {productDescription}
        </p>

        {/* Variant Badges (Improved Readability with Descriptions) */}
        {visibleVariants.length > 0 && (
          <div className="flex flex-col gap-2">
            {visibleVariants.map((variant, index) => (
              <div
                key={index}
                className="flex flex-col px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                }}
              >
                {/* Variant Name - Prominent */}
                <div className="flex items-center gap-2">
                  <Package
                    size={14}
                    style={{ color: "#06b6d4", opacity: 0.9 }}
                  />
                  <span
                    className="font-semibold"
                    style={{
                      color: "#e2e8f0",
                      fontSize: "14px",
                    }}
                  >
                    {variant.label || variant.name}
                  </span>
                </div>
                {/* Variant Description OR Material Hint (for MATRIX) */}
                {variant.price_list ? (
                  // MATRIX Product: Show material options from price_list keys
                  <span
                    className="mt-1 ml-6"
                    style={{
                      color: "#67e8f9",
                      fontSize: "11px",
                      lineHeight: "1.4",
                    }}
                  >
                    🎨 Bahan: {Object.keys(variant.price_list).join(" • ")}
                  </span>
                ) : variant.desc ? (
                  // Non-MATRIX: Show regular description
                  <span
                    className="mt-1 ml-6"
                    style={{
                      color: "#94a3b8",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    {variant.desc}
                  </span>
                ) : null}
              </div>
            ))}

            {remainingCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "rgba(148, 163, 184, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.08)",
                }}
              >
                +{remainingCount} pilihan bahan lainnya
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
