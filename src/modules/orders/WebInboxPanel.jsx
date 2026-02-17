import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { WebOrderBridge } from "../../services/WebOrderBridge";
// import { useOrderStore } from "../../stores/useOrderStore"; // Removed unused import
import { useAuthStore } from "../../stores/useAuthStore";
import { useOrderStore } from "../../stores/useOrderStore"; // 🔥 Import Global Store
import { toast } from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  Eye,
  ShoppingCart,
  RefreshCw,
  MessageCircle,
  FileText,
  AlertCircle,
} from "lucide-react";

const WebInboxPanel = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { setIncomingWebOrder } = useOrderStore(); // 🔥 Atomic Dispatcher
  // const { createOrder } = useOrderStore(); // createOrder is available, though we don't use it here anymore directly. Safest to keep or remove if unused. Let's just remove the invalid ones.
  // Actually, we don't use createOrder here either, we transform and pass to POS.
  // But let's check if useOrderStore is used elsewhere. It is used for orders list maybe?
  // No, fetchOrders uses supabase directly.
  // So we can probably remove the destructuring entirely or just leave it empty if we want to keep the hook call for some reason (subscription?).
  // lines 5 already imported it.

  // Checking line 22: const { addToCart, setCustomer } = useOrderStore();
  // We will remove this line.

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("NEW");
  const [processing, setProcessing] = useState(null);

  // ============================================
  // FETCH WEB ORDERS
  // ============================================
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("web_order_inbox")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching web orders:", error);
      toast.error("Gagal memuat order web");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("web_order_inbox_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "web_order_inbox" },
        (payload) => {
          console.log("Web order change:", payload);
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ============================================
  // FILTER ORDERS BY STATUS
  // ============================================
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "ALL") return true;
    return order.status === activeFilter;
  });

  // ============================================
  // POLYMORPHIC ADAPTER: Web Item → POS Item
  // ============================================
  /**
   * CTO-MANDATED: Root-Level Redundancy Strategy
   * Maps dimensions to BOTH root level AND dimensions object
   * to support legacy calc_engine (expects item.length) and
   * newer logic (expects item.dimensions.length).
   *
   * Handles 3 distinct data shapes safely:
   * - CALCULATOR (Spanduk): Unpack length/width to root
   * - MATRIX (Kartu Nama): Handle empty dimensions
   * - UNIT (Jasa Desain): Default dimensions to 0
   */
  const transformWebItemToPosItem = (cartItem) => {
    const specs = cartItem.specs || {};
    const inputs = specs.inputs || {};

    // SAFE EXTRACTION with strict Number() coercion
    const safeQty = Number(inputs.qty || inputs.qty_books || 1);
    const safeLength = Number(inputs.length || 0);
    const safeWidth = Number(inputs.width || 0);

    // SCENARIO DETECTION (for debugging)
    const hasCalculatorInputs =
      inputs.length !== undefined || inputs.width !== undefined;
    const hasMatrixInputs =
      inputs.size !== undefined || inputs.material !== undefined;

    return {
      // 1. IDENTITY
      product: cartItem.product,
      productId: cartItem.product?.id,
      categoryId: cartItem.categoryId,

      // 2. ROOT METRICS (CRITICAL FOR LEGACY CALC ENGINE)
      qty: safeQty,
      length: safeLength, // ← MUST BE AT ROOT (CTO mandate)
      width: safeWidth, // ← MUST BE AT ROOT (CTO mandate)

      // 3. DIMENSIONS OBJECT (For Newer Logic/Display)
      dimensions: {
        length: safeLength,
        width: safeWidth,
        sizeKey: inputs.size || inputs.variant || null,
        material: inputs.material || null,
        ...inputs, // Preserve original inputs for debugging
      },

      // 4. FINISHINGS (already lifted by Bridge)
      finishings: cartItem.finishings || [],

      // 5. PRICING (0 = force POS recalculation)
      price: 0,
      unitPrice: 0,
      totalPrice: 0,
      finalTotal: 0,

      // 6. METADATA
      specs: specs,
      pricingType: cartItem.pricingType,
      notes: inputs.notes || cartItem.notes || "",
      source: "WEB_ORDER",

      // 7. DEBUG INFO
      _adapterVersion: "polymorphic_v1_root_redundancy",
      _detectedShape: hasCalculatorInputs
        ? "CALCULATOR"
        : hasMatrixInputs
          ? "MATRIX"
          : "UNIT",
    };
  };

  // ============================================
  // HANDLE CREATE ORDER (THE MAIN INTEGRATION!)
  // ============================================
  const handleCreateOrder = async (webOrder) => {
    setProcessing(webOrder.id);

    try {
      // Step 1: Transform web order to POS item using the Bridge
      toast.loading("Memproses order...", { id: "processing" });

      const cartItem = await WebOrderBridge.transformToPosItem(webOrder);

      // Step 1b: Apply Polymorphic Adapter (CTO-mandated root-level redundancy)
      const posItem = transformWebItemToPosItem(cartItem);

      console.log("[WebInbox] Bridge Output:", cartItem);
      console.log("[WebInbox] Polymorphic POS Item:", posItem);
      console.log("[WebInbox] Detected Shape:", posItem._detectedShape);

      // Step 2: Mark order as REVIEWED (Optimistic Update)
      const { error: updateError } = await supabase
        .from("web_order_inbox")
        .update({
          status: "REVIEWED",
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.email || "Admin",
        })
        .eq("id", webOrder.id);

      if (updateError) throw updateError;

      // Step 3: Dispatch to Global Store (Atomic & Clean)
      // This fixes the "Cart Flooding" bug by ensuring data is consumed exactly once.
      const payload = {
        cartItem: posItem, // ← Use polymorphic adapter output
        customer: {
          name: webOrder.customer_name,
          phone: webOrder.customer_phone,
          email: webOrder.customer_email || "",
        },
      };

      setIncomingWebOrder(payload); // 🚀 Dispatch!

      toast.success("✅ Mengalihkan ke POS...", { id: "processing" });

      setTimeout(() => {
        navigate("/pos"); // Clean Navigation (No State Payload)
      }, 500);
    } catch (error) {
      console.error("[WebInbox] Error creating order:", error);

      // User-friendly error messages
      let errorMessage = "Gagal memproses order";

      if (error.message.includes("mapping not found")) {
        errorMessage = `Produk "${webOrder.product_code}" belum terdaftar di sistem. Hubungi admin.`;
      } else if (error.message.includes("Required field")) {
        errorMessage = `Data tidak lengkap: ${error.message}`;
      } else if (
        error.message.includes("minimum") ||
        error.message.includes("maximum")
      ) {
        errorMessage = `Validasi gagal: ${error.message}`;
      }

      toast.error(errorMessage, { id: "processing", duration: 5000 });
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // HANDLE REJECT ORDER
  // ============================================
  const handleReject = async (webOrder) => {
    const reason = prompt("Alasan reject (opsional):");

    try {
      const { error } = await supabase
        .from("web_order_inbox")
        .update({
          status: "REJECTED",
          rejected_at: new Date().toISOString(),
          notes_internal: reason || "Ditolak oleh admin",
        })
        .eq("id", webOrder.id);

      if (error) throw error;

      toast.success("Order ditolak");
      fetchOrders();
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error("Gagal reject order");
    }
  };

  // ============================================
  // HANDLE WHATSAPP
  // ============================================
  const handleWhatsApp = (webOrder) => {
    const message = `Halo ${webOrder.customer_name}, terima kasih sudah order di Joglo Printing. Order Anda sedang kami proses.`;
    const waUrl = `https://wa.me/${webOrder.customer_phone.replace(/^0/, "62")}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  // ============================================
  // STATUS BADGE
  // ============================================
  const StatusBadge = ({ status }) => {
    const styles = {
      NEW: "bg-blue-100 text-blue-700 border-blue-300",
      REVIEWED: "bg-yellow-100 text-yellow-700 border-yellow-300",
      APPROVED: "bg-green-100 text-green-700 border-green-300",
      REJECTED: "bg-red-100 text-red-700 border-red-300",
      PROCESSED: "bg-gray-100 text-gray-700 border-gray-300",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded border ${styles[status] || styles.NEW}`}
      >
        {status}
      </span>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0f172a] p-6 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#1e293b] p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                📥
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Web Order Inbox
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sinkronisasi Realtime Aktif
            </p>
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="text-right hidden md:block border-r border-slate-700 pr-6">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                Total Order
              </p>
              <p className="text-2xl font-black text-white">{orders.length}</p>
            </div>
            <button
              onClick={fetchOrders}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-200 rounded-xl transition-all shadow-lg active:scale-95"
            >
              <RefreshCw
                size={18}
                className={`text-blue-400 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
              />
              <span className="font-semibold tracking-wide">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-[#1e293b] p-2 rounded-xl border border-slate-700/50 shadow-lg flex overflow-x-auto no-scrollbar gap-1">
          {["ALL", "NEW", "REVIEWED", "APPROVED", "REJECTED"].map((filter) => {
            const count = orders.filter((o) =>
              filter === "ALL" ? true : o.status === filter,
            ).length;
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-6 py-3 rounded-lg text-xs font-bold tracking-wider transition-all relative uppercase flex items-center gap-3 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {filter === "ALL" ? "ALL TRADES" : filter}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black min-w-[24px] text-center ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-900 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 bg-[#1e293b] rounded-2xl border border-dashed border-slate-700">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-slate-400 font-medium mt-6 tracking-wide animate-pulse">
              SYNCING MARKET DATA...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 bg-[#1e293b] rounded-2xl border border-dashed border-slate-700 text-center">
            <div className="bg-slate-800/50 p-6 rounded-full mb-6 ring-1 ring-slate-700">
              <FileText className="text-slate-600" size={48} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Open Orders
            </h3>
            <p className="text-slate-500 max-w-sm">
              Waiting for incoming transactions from the web platform.
            </p>
          </div>
        )}

        {/* Order Cards Grid */}
        {!loading && filteredOrders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="group bg-[#1e293b] border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 relative overflow-hidden"
              >
                {/* Status Indicator Glow */}
                <div
                  className={`absolute top-0 left-0 w-1 h-full shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                    order.status === "NEW"
                      ? "bg-gradient-to-b from-blue-400 to-blue-600 shadow-blue-500/50"
                      : order.status === "APPROVED"
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-emerald-500/50"
                        : order.status === "REJECTED"
                          ? "bg-gradient-to-b from-red-400 to-red-600 shadow-red-500/50"
                          : "bg-slate-600"
                  }`}
                />

                {/* Header */}
                <div className="flex justify-between items-start mb-6 pl-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                        {order.customer_name}
                      </h3>
                      {order.status === "NEW" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium tracking-wide">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">ID:</span> #
                        {order.id.slice(0, 8)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span>
                        {new Date(order.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Price Tag (Ticker Style) */}
                  {order.quoted_amount && (
                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-right shadow-inner">
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-0.5">
                        EST. VAL
                      </p>
                      <p className="text-lg font-black text-white tracking-tight">
                        Rp {order.quoted_amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="ml-4 space-y-5">
                  {/* Product Info Block */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
                        <FileText size={20} className="text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-200 text-sm mb-1">
                              {order.product_code}
                            </h4>
                            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
                              {order.variant_label || "No Variant"}
                            </p>
                          </div>
                        </div>

                        {/* Specs Terminal View */}
                        {order.specs_snapshot && (
                          <div className="bg-black/40 rounded-lg p-3 text-[11px] border border-slate-800 font-mono text-emerald-400/90 leading-relaxed shadow-inner">
                            {(() => {
                              const specs = order.specs_snapshot;
                              return Object.entries(specs).map(
                                ([k, v]) =>
                                  v &&
                                  typeof v !== "object" && (
                                    <div
                                      key={k}
                                      className="flex justify-between border-b border-slate-800/50 last:border-0 py-1"
                                    >
                                      <span className="text-slate-500 uppercase">
                                        {k.replace(/_/g, " ")}
                                      </span>
                                      <span className="font-bold text-right truncate max-w-[150px]">
                                        {v}
                                      </span>
                                    </div>
                                  ),
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {order.notes_customer && (
                    <div className="flex gap-3 items-start bg-yellow-900/10 p-3 rounded-lg border border-yellow-700/20">
                      <MessageCircle
                        className="text-yellow-600 mt-1 flex-shrink-0"
                        size={16}
                      />
                      <p className="text-sm text-yellow-500/90 italic font-medium">
                        "{order.notes_customer}"
                      </p>
                    </div>
                  )}

                  {/* Rejection Notes */}
                  {order.status === "REJECTED" && order.notes_internal && (
                    <div className="flex gap-3 items-start bg-red-900/10 p-3 rounded-lg border border-red-700/20">
                      <AlertCircle
                        className="text-red-500 mt-1 flex-shrink-0"
                        size={16}
                      />
                      <div>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-red-400 mt-1">
                          {order.notes_internal}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="ml-4 mt-6 pt-5 border-t border-slate-800 flex gap-3">
                  <button
                    onClick={() => handleWhatsApp(order)}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all font-semibold text-sm hover:text-white"
                  >
                    <MessageCircle size={18} /> Chat
                  </button>

                  {order.status === "NEW" && (
                    <>
                      <button
                        onClick={() => handleReject(order)}
                        className="flex-none px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all font-bold text-sm"
                        title="Tolak Order"
                      >
                        <XCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleCreateOrder(order)}
                        disabled={processing === order.id}
                        className="flex-[2] flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 disabled:opacity-70 disabled:cursor-wait tracking-wide"
                      >
                        {processing === order.id ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            EXECUTE ORDER <ShoppingCart size={18} />
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Read-only status indicators */}
                  {order.status !== "NEW" && (
                    <div
                      className={`flex-[2] flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border ${
                        order.status === "REVIEWED"
                          ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/50"
                          : order.status === "REJECTED"
                            ? "bg-red-900/20 text-red-400 border-red-800/50"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {order.status === "REVIEWED"
                        ? "✅ ORDER EXECUTED"
                        : order.status === "REJECTED"
                          ? "❌ TRANSACTION VOID"
                          : "COMPLETED"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebInboxPanel;
