import React, { useEffect, useState } from "react";
import useDraftStore from "../../stores/useDraftStore";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { buildWAMessage } from "../../utils/waMessageBuilder";

const DraftListModal = ({ isOpen, onClose, onLoadDraft }) => {
  const { drafts, fetchDrafts, deleteDraft, loadDraft, isLoading } =
    useDraftStore();
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDrafts();
    }
  }, [isOpen, fetchDrafts]);

  const handleShareWA = (draft) => {
    let phone = draft.customer_phone || "";
    // Normalize
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);

    // Guard: Check and Prompt if empty
    if (!phone) {
      const input = prompt(
        "Nomor WA pelanggan belum tersimpan. Masukkan nomor tujuan (62...):",
      );
      if (!input) return; // User cancelled
      phone = input.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    }

    if (!phone) return; // Double check

    // Build Message using Helper
    const msg = buildWAMessage(draft);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleLoad = async (draft) => {
    if (draft.status === "ACTIVE") {
      alert("Draft ini sedang dibuka/aktif di kasir lain!");
      return;
    }

    setProcessingId(draft.id);
    const result = await loadDraft(draft.id);
    setProcessingId(null);

    if (result.success) {
      onLoadDraft(result.payload); // Callback to hydration logic
      onClose();
    } else {
      alert(result.error);
      fetchDrafts(); // Refresh to see updated status
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus draft ini permanen?")) {
      await deleteDraft(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📂 Estimasi Pending
            <span className="text-sm font-normal text-gray-400">
              ({drafts.length}/10)
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && drafts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 animate-pulse">
              Memuat data...
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>Tidak ada draft tersimpan.</p>
              <p className="text-xs mt-1 opacity-70">
                Tekan "Simpan Estimasi" untuk memarkir pesanan.
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className={`relative group bg-gray-900 border rounded-lg p-4 flex justify-between items-center transition-all ${
                  draft.status === "ACTIVE"
                    ? "border-yellow-600/50 opacity-75"
                    : "border-gray-700 hover:border-blue-500 hover:bg-gray-800"
                }`}
              >
                {/* Info Utama */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">
                      {draft.customer_name || "Pelanggan Umum"}
                    </h3>
                    {draft.status === "ACTIVE" && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-yellow-900 text-yellow-200 rounded-full border border-yellow-700">
                        Sedang Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Rp {parseInt(draft.total_amount).toLocaleString("id-ID")} •{" "}
                    {draft.items_json?.items?.length || 0} Item
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Dibuat{" "}
                    {formatDistanceToNow(new Date(draft.created_at), {
                      addSuffix: true,
                      locale: id,
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleShareWA(draft)}
                    disabled={draft.status === "ACTIVE"}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
                      draft.status === "ACTIVE"
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed hidden"
                        : "bg-green-900/40 border border-green-700 text-green-400 hover:bg-green-900/60"
                    }`}
                    title="Kirim ulang ke WA"
                  >
                    <span>📱</span>
                  </button>

                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => handleLoad(draft)}
                    disabled={
                      processingId === draft.id || draft.status === "ACTIVE"
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all ${
                      draft.status === "ACTIVE"
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95"
                    }`}
                  >
                    {processingId === draft.id ? "Loading..." : "Buka Draft"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-gray-900 border-t border-gray-700 text-center text-xs text-gray-500">
          Draft otomatis dihapus setelah 7 hari. Maksimal 10 draft per user.
        </div>
      </div>
    </div>
  );
};

export default DraftListModal;
