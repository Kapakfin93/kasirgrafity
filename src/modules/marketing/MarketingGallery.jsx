import React, { useState, useEffect } from "react";
import { Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { useOrderStore } from "../../stores/useOrderStore";

/**
 * MarketingGallery
 * Review Queue for Social Media Content
 */
export function MarketingGallery() {
  const {
    orders,
    loadOrders,
    approveMarketingContent,
    rejectMarketingContent,
    loading,
  } = useOrderStore();
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING | APPROVED

  // Initial Load
  useEffect(() => {
    // 🛡️ ROLLING WINDOW: Only fetch last 24h to save bandwidth
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    loadOrders({
      limit: 50,
      updatedAfter: oneDayAgo.toISOString(),
    });
  }, [loadOrders]);

  // Filter Logic:
  // 1. Must have Evidence URL
  // 2. Must be flagged as Public Content by Cashier
  // 3. Status based on Tab
  const galleryItems = orders.filter((o) => {
    const hasEvidence = !!o.marketingEvidenceUrl;
    const isPublic = o.isPublicContent;

    if (!hasEvidence || !isPublic) return false;

    if (activeTab === "PENDING") {
      return !o.isApprovedForSocial;
    } else {
      return o.isApprovedForSocial;
    }
  });

  const handleApprove = async (id) => {
    if (window.confirm("Approve this photo for social media?")) {
      await approveMarketingContent(id, true);
    }
  };

  const handleReject = async (id) => {
    if (
      window.confirm(
        "Tolak foto ini? (Akan dihapus dari antrean dan ditandai privat)",
      )
    ) {
      await rejectMarketingContent(id);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Marketing Gallery
          </h1>
          <p className="text-gray-400 text-sm">
            Curate customer photos for Google Maps & Social Media
          </p>
        </div>

        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "PENDING"
                ? "bg-gray-700 text-white shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Review Queue ({galleryItems.length})
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "APPROVED"
                ? "bg-green-900/30 text-green-400 shadow ring-1 ring-green-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Approved History
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading gallery...
        </div>
      )}

      {!loading && galleryItems.length === 0 && (
        <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
          <div className="inline-block p-4 bg-gray-800 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-300">All Caught Up!</h3>
          <p className="text-gray-500">No photos pending review.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {galleryItems.map((order) => (
          <div
            key={order.id}
            className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {/* Image Container with Lazy Loading */}
            <div className="aspect-[4/3] overflow-hidden bg-gray-900 relative">
              <img
                src={order.marketingEvidenceUrl}
                alt={`Order ${order.orderNumber}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Overlay Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <p className="text-white font-bold">{order.customerName}</p>
                <p className="text-xs text-gray-300">{order.orderNumber}</p>
                <p className="text-xs text-brand-orange mt-1">
                  {order.items[0]?.productName} +{order.items.length - 1} items
                </p>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                {activeTab === "APPROVED" ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50 flex items-center gap-1">
                    <CheckCircle size={12} /> Live
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/50 flex items-center gap-1">
                    <Clock size={12} /> Pending
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-700 flex justify-between items-center bg-gray-800">
              <div className="flex gap-2">
                <a
                  href={order.marketingEvidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition"
                  title="View Full Size"
                >
                  <Download size={18} />
                </a>
              </div>

              <div className="flex gap-2">
                {activeTab === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleReject(order.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition"
                      title="Tolak & Sembunyikan"
                    >
                      <XCircle size={16} />
                      Tolak
                    </button>
                    <button
                      onClick={() => handleApprove(order.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-green-900/20"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
