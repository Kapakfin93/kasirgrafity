import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrderBridge } from "../hooks/useOrderBridge";
import { CalculatorForm } from "../components/forms/CalculatorForm";
import { MatrixForm } from "../components/forms/MatrixForm";
import { UnitForm } from "../components/forms/UnitForm";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "../services/supabaseClient";

export default function WebOrderPage() {
  const { webCode } = useParams();
  const navigate = useNavigate();
  const { productData, loading, error, engineMode } = useOrderBridge(webCode);

  // Form State
  const [specsSnapshot, setSpecsSnapshot] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Customer State
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // 🔥 FIX: Prevent Infinite Loop with useCallback & Deep Compare
  const handleSpecsUpdate = useCallback((newSpecs) => {
    setSpecsSnapshot((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newSpecs)) {
        return prev;
      }
      return newSpecs;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name || !customer.phone) {
      toast.error("Nama dan No. HP wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      // Construct Payload for web_order_inbox
      const payload = {
        product_code: webCode,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        specs_snapshot: specsSnapshot,
        notes_customer: specsSnapshot.notes || "",
        status: "NEW",
        // We set quoted_amount to 0 or estimate.
        // For now, let POS handle pricing. Or we could estimate if we had pricing logic here.
        // The prompt said "Pricing: transaction must carry pos_product_id".
        // We don't have price calculation in frontend yet (that's POS logic), so we send 0.
        quoted_amount: 0,
      };

      const { error } = await supabase.from("web_order_inbox").insert(payload);
      if (error) throw error;

      toast.success("Order Berhasil Dikirim!");
      setTimeout(() => {
        // Reset or Redirect
        setCustomer({ name: "", phone: "", email: "" });
        // navigate("/success"); // or just stay
      }, 1000);
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Gagal mengirim order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Memuat Produk...
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
        Produk tidak ditemukan atau belum dikonfigurasi.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
      <Toaster position="top-center" />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-slate-200 tracking-wide">
            Joglo Printing
          </span>
          <div className="w-8"></div> {/* Spacer */}
        </div>
      </header>

      {/* CONTENT */}
      <main className="pt-24 pb-32 px-4 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* PRODUCT HERO */}
        <section className="text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
            {productData.pos_category?.replace(/_/g, " ")}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
            {productData.web_display_name}
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            {productData.web_description}
          </p>
        </section>

        {/* DYNAMIC FORM */}
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          {(engineMode === "AREA" || engineMode === "LINEAR") && (
            <CalculatorForm
              product={productData}
              engineMode={engineMode}
              onUpdate={handleSpecsUpdate}
            />
          )}

          {engineMode === "MATRIX" && (
            <MatrixForm product={productData} onUpdate={handleSpecsUpdate} />
          )}

          {(engineMode === "UNIT" ||
            engineMode === "TIERED" ||
            engineMode === "BOOKLET") && (
            <UnitForm product={productData} onUpdate={handleSpecsUpdate} />
          )}
        </div>

        {/* CUSTOMER INFO */}
        <section className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">
            Data Pemesan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nama Lengkap"
              className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
              value={customer.name}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
            />
            <input
              type="tel"
              placeholder="Nomor WhatsApp"
              className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
              value={customer.phone}
              onChange={(e) =>
                setCustomer({ ...customer, phone: e.target.value })
              }
            />
          </div>
        </section>
      </main>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-50">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" /> Mengirim...
              </>
            ) : (
              <>
                <ShoppingCart className="fill-white/20" /> Buat Pesanan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
