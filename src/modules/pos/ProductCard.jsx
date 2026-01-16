import React from "react";
import {
  Package,
  Ruler,
  Mountain,
  Scroll,
  Image as ImageIcon,
  Shirt,
  Settings,
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
      `[ProductCard] Rendering ${product.name}: isOutdoorHero=${isOutdoorHero}, CatID=${product.categoryId}`
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

  // --- 3. STANDARD CARD LAYOUT (FOR OTHERS) ---
  return (
    <div
      onClick={() => onClick(product)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-700/50 p-5 hover:bg-slate-800 hover:border-cyan-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-2xl ${getIconColor(
            product.categoryId
          )} bg-opacity-20`}
        >
          {getCategoryIcon(product.categoryId)}
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400">
          {product.input_mode}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-100 leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-slate-500 text-xs">{product.description}</p>
      </div>

      {/* Standard Price Display */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-400 font-medium mb-1">Mulai dari</p>
        <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
          {formatCurrency(product.base_price || 0)}
          {product.input_mode === "LINEAR" && (
            <span className="text-sm text-slate-500 font-normal">/m</span>
          )}
        </p>
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getCategoryIcon = (catId) => {
  switch (catId) {
    case "CAT_OUTDOOR":
      return <Mountain size={24} className="text-emerald-400" />;
    case "CAT_ROLLS":
      return <Scroll size={24} className="text-cyan-400" />;
    case "CAT_POSTER":
      return <ImageIcon size={24} className="text-purple-400" />;
    case "MERCHANDISE":
      return <Shirt size={24} className="text-pink-400" />;
    default:
      return <Package size={24} className="text-slate-400" />;
  }
};

const getIconColor = (catId) => {
  switch (catId) {
    case "CAT_OUTDOOR":
      return "bg-emerald-500";
    case "CAT_ROLLS":
      return "bg-cyan-500";
    case "CAT_POSTER":
      return "bg-purple-500";
    case "MERCHANDISE":
      return "bg-pink-500";
    default:
      return "bg-slate-500";
  }
};

export default ProductCard;
