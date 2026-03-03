import React from "react";
import { formatRupiah } from "../../core/formatters";

const MatrixDetailModal = ({
  selectedDetail,
  setSelectedDetail,
  drillDownData,
}) => {
  if (!selectedDetail) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-fadeIn"
      onClick={() => setSelectedDetail(null)}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Detail: {selectedDetail.name}
            </h2>
            <div className="text-xs text-purple-400 font-mono mt-1">
              Minggu ke-{selectedDetail.week} •{" "}
              {selectedDetail.start.toLocaleDateString("id-ID")} -{" "}
              {selectedDetail.end.toLocaleDateString("id-ID")}
            </div>
          </div>
          <button
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all"
            onClick={() => setSelectedDetail(null)}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* SECTION A: ATTENDANCE LOG (HR ONLY) */}
          {selectedDetail.type === "HR" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                  🕒
                </div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Riwayat Absensi (Jam Kerja)
                </h3>
              </div>

              {drillDownData.attendances.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                  Tidak ada data absensi di minggu ini.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-700">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800 text-xs text-slate-400 uppercase font-bold">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Masuk</th>
                        <th className="p-3">Pulang</th>
                        <th className="p-3 text-right">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                      {drillDownData.attendances.map((att) => (
                        <tr key={att.id}>
                          <td className="p-3 font-medium text-white">
                            {new Date(att.date).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="p-3 font-mono text-emerald-400">
                            {att.check_in_time
                              ? new Date(att.check_in_time).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "-"}
                          </td>
                          <td className="p-3 font-mono text-red-400">
                            {att.check_out_time
                              ? new Date(att.check_out_time).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "-"}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-300">
                            {Number(att.total_hours || 0).toFixed(1)}j
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION B: EXPENSE LOG (Shared by HR and Operational) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400">
                💸
              </div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                {selectedDetail.type === "HR"
                  ? "Riwayat Pengambilan Uang"
                  : selectedDetail.type === "OPERATIONAL_WEEKLY"
                    ? "Bedah Pengeluaran Mingguan"
                    : `Rekam Jejak: ${selectedDetail.name}`}
              </h3>
            </div>

            {/* 📊 SECTION A: AGGREGATOR (OPERATIONAL WEEKLY ONLY) */}
            {selectedDetail.type === "OPERATIONAL_WEEKLY" &&
              drillDownData.categorySummary && (
                <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  {[
                    {
                      key: "KONSUMSI",
                      label: "🍛 KONSUMSI",
                      color: "text-orange-400",
                    },
                    {
                      key: "TRANSPORT",
                      label: "⛽ TRANSPORT",
                      color: "text-blue-400",
                    },
                    {
                      key: "UTILITAS",
                      label: "⚡ UTILITAS",
                      color: "text-yellow-400",
                    },
                    {
                      key: "ATK_BAHAN",
                      label: "📎 ATK & BAHAN",
                      color: "text-pink-400",
                    },
                    {
                      key: "LAIN_LAIN",
                      label: "📦 LAIN-LAIN",
                      color: "text-slate-400",
                    },
                  ].map((cat) => (
                    <div
                      key={cat.key}
                      className="flex justify-between items-center"
                    >
                      <span className="text-xs text-slate-400 font-bold">
                        {cat.label}
                      </span>
                      <span
                        className={`text-sm font-mono font-bold ${
                          drillDownData.categorySummary[cat.key] > 0
                            ? cat.color
                            : "text-slate-600"
                        }`}
                      >
                        {formatRupiah(
                          drillDownData.categorySummary[cat.key] || 0,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            {/* 📝 SECTION B: TRANSACTION SNAPSHOT */}
            {drillDownData.expenses.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                {selectedDetail.type === "HR"
                  ? "Tidak ada pengambilan uang (Bon/Gaji) di minggu ini."
                  : "Tidak ada transaksi kategori ini di minggu ini."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800 text-xs text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Item / Keterangan</th>
                      <th className="p-3 text-right">Nominal</th>
                      <th className="p-3 text-right">👮 Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                    {drillDownData.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-3 text-xs text-slate-400">
                          <span className="opacity-50">
                            {new Date(exp.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "numeric",
                            })}
                          </span>{" "}
                          <span className="font-mono text-white">
                            {new Date(exp.date).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">
                            {exp.description}
                          </div>
                          {selectedDetail.type === "HR" && (
                            <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                              {exp.category}
                            </div>
                          )}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${selectedDetail.type === "HR" ? "text-red-400" : "text-emerald-400"}`}
                        >
                          {formatRupiah(exp.amount)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold uppercase">
                            {exp.created_by || "Owner"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixDetailModal;
