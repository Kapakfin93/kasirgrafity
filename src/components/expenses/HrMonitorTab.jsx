import React from "react";
import { formatRupiah } from "../../core/formatters";

const HrMonitorTab = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  isHrMatrixLoading,
  hrMatrixData,
  handleHrCellClick,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-4 mb-4 select-none">
        {/* Month/Year Selector */}
        <div className="flex gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-900 text-white p-2 rounded border border-slate-700 focus:outline-none focus:border-purple-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(0, m - 1).toLocaleString("id-ID", {
                  month: "long",
                })}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-900 text-white p-2 rounded border border-slate-700 focus:outline-none focus:border-purple-500"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {isHrMatrixLoading && (
          <div className="text-purple-400 text-sm animate-pulse flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin"></div>
            Sinkronisasi Awan...
          </div>
        )}
      </div>

      <table className="w-full text-left text-slate-300">
        <thead className="bg-purple-900/20 text-xs font-bold uppercase text-purple-300 border-b border-purple-500/30">
          <tr>
            <th className="p-4 min-w-[150px]">Karyawan</th>
            <th className="p-4 text-center">
              Minggu 1<br />
              <span className="text-[10px] opacity-60">Tgl 1-7</span>
            </th>
            <th className="p-4 text-center">
              Minggu 2<br />
              <span className="text-[10px] opacity-60">Tgl 8-14</span>
            </th>
            <th className="p-4 text-center">
              Minggu 3<br />
              <span className="text-[10px] opacity-60">Tgl 15-21</span>
            </th>
            <th className="p-4 text-center">
              Minggu 4+
              <br />
              <span className="text-[10px] opacity-60">Tgl 22-End</span>
            </th>
            <th className="p-4 text-right bg-slate-900/50">TOTAL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {/* Render from Server Data */}
          {hrMatrixData.length === 0 && !isHrMatrixLoading ? (
            <tr>
              <td colSpan="6" className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-2">📭</div>
                <p>Tidak ada data kasbon atau absensi di bulan ini.</p>
              </td>
            </tr>
          ) : (
            hrMatrixData.map((row) => (
              <tr key={row.name} className="hover:bg-slate-700/50">
                <td className="p-4 font-bold text-white">{row.name}</td>
                {[1, 2, 3, 4].map((w) => {
                  const weekData = row.weeks?.[w] || {
                    hours: 0,
                    money: 0,
                  };
                  return (
                    <td
                      key={w}
                      className="p-2 text-center border-l border-slate-700/50 cursor-pointer hover:bg-purple-500/10 transition-colors"
                      onClick={() => handleHrCellClick(row.id, row.name, w)}
                      title="Klik untuk detail"
                    >
                      <div className="flex flex-col gap-1 items-center">
                        {/* Hours Badge */}
                        {weekData.hours > 0 ? (
                          <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                            {Number(weekData.hours).toFixed(1)}j
                          </span>
                        ) : null}

                        {/* Money Text */}
                        {weekData.money > 0 ? (
                          <span className="text-xs text-red-400 font-mono font-bold">
                            {formatRupiah(weekData.money)}
                          </span>
                        ) : null}

                        {/* Empty State */}
                        {weekData.hours === 0 && weekData.money === 0 && (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="p-4 text-right bg-slate-900/30 border-l border-slate-700">
                  <div className="font-bold text-white">
                    {Number(row.total?.hours || 0).toFixed(1)} Jam
                  </div>
                  <div className="text-red-400 font-mono font-bold mt-1">
                    {formatRupiah(row.total?.money || 0)}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HrMonitorTab;
