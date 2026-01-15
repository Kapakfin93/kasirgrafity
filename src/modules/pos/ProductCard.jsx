import React from 'react';
import { Package, Shirt, Scroll, Sticker, CreditCard, Settings, Printer, Stamp } from 'lucide-react';

// Helper to pick icon based on category ID keywords
const getIcon = (catId) => {
    const id = catId?.toUpperCase() || '';
    if (id.includes('JERSEY') || id.includes('KAOS')) return <Shirt size={24} className="text-cyan-400" />;
    if (id.includes('BANNER') || id.includes('LARGE')) return <Scroll size={24} className="text-amber-400" />;
    if (id.includes('STIKER')) return <Sticker size={24} className="text-emerald-400" />;
    if (id.includes('A3') || id.includes('POD')) return <Printer size={24} className="text-rose-400" />;
    if (id.includes('KARTU') || id.includes('OFFICE')) return <CreditCard size={24} className="text-purple-400" />;
    if (id.includes('MERCH') || id.includes('PIN')) return <Stamp size={24} className="text-indigo-400" />;
    if (id.includes('CUSTOM')) return <Settings size={24} className="text-slate-400" />;
    return <Package size={24} className="text-slate-400" />; // Default
};

export default function ProductCard({ product, onSelect }) {
    // Check if product has wholesale features enabled
    const hasWholesale = product.advanced_features?.wholesale_rules?.length > 0 || product.calc_engine === 'TIERED' || product.input_mode === 'MATRIX';

    return (
        <button
            onClick={() => onSelect(product)}
            // SULTAN STYLING: Dark theme, glass effect border, neon glow on hover
            className="relative group bg-slate-800/40 backdrop-blur-md p-5 rounded-[1.5rem] border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all duration-300 text-left flex flex-col h-full overflow-hidden hover:-translate-y-1"
        >
            {/* Glow Effect Background Layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10 flex-1 flex flex-col justify-between">
                {/* HEADER: Icon & Badge */}
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 group-hover:border-cyan-500/30 transition-colors shadow-inner">
                        {getIcon(product.categoryId)}
                    </div>
                    {hasWholesale && (
                        <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold bg-emerald-950/50 text-emerald-400 rounded-full border border-emerald-800/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            Grosir Ready
                        </span>
                    )}
                </div>

                {/* PRODUCT INFO */}
                <div>
                    <h3 className="text-xl font-black text-slate-100 leading-tight mb-2 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 transition-all">
                        {product.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium flex items-baseline gap-1">
                        Mulai <span className="text-base font-bold text-slate-300">Rp {product.base_price?.toLocaleString()}</span>
                    </p>
                </div>
            </div>

            {/* FOOTER: Input Mode Tag */}
            <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/30 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
                <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${product.input_mode === 'MATRIX' ? 'bg-rose-500' : product.input_mode === 'TIERED' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
                    {product.input_mode} MODE
                </span>
            </div>
        </button>
    );
}
