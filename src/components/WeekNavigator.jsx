import React, { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  setDate,
} from "date-fns";
import { id } from "date-fns/locale";

/**
 * WeekNavigator
 * Komponen navigasi mingguan untuk Aggregator Order.
 * Menggunakan definisi Kalender Tanggal:
 * - Minggu 1: Tanggal 1-7
 * - Minggu 2: Tanggal 8-14
 * - Minggu 3: Tanggal 15-21
 * - Minggu 4+: Tanggal 22-Akhir Bulan
 *
 * @param {Date} initialDate - Tanggal awal (default: Hari ini)
 * @param {Function} onWeekChange - Callback ({ start, end, weekIndex, label })
 */
const WeekNavigator = ({ initialDate = new Date(), onWeekChange }) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedWeek, setSelectedWeek] = useState(null); // 1, 2, 3, 4

  // Helper: Hitung Minggu Aktif saat init
  useEffect(() => {
    const today = new Date();
    // Jika currentDate bulan/tahun sama dengan hari ini, pilih minggu hari ini
    if (
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    ) {
      const date = today.getDate();
      if (date <= 7) setSelectedWeek(1);
      else if (date <= 14) setSelectedWeek(2);
      else if (date <= 21) setSelectedWeek(3);
      else setSelectedWeek(4);
    } else {
      // Default ke Minggu 1 jika pindah bulan
      setSelectedWeek(1);
    }
  }, [currentDate]);

  // Effect: Trigger onWeekChange saat state berubah
  useEffect(() => {
    if (selectedWeek === null) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    let startDay, endDay;
    let label = "";

    switch (selectedWeek) {
      case 1:
        startDay = 1;
        endDay = 7;
        label = "Minggu 1 (01-07)";
        break;
      case 2:
        startDay = 8;
        endDay = 14;
        label = "Minggu 2 (08-14)";
        break;
      case 3:
        startDay = 15;
        endDay = 21;
        label = "Minggu 3 (15-21)";
        break;
      case 4:
        startDay = 22;
        // End day is last day of month
        endDay = endOfMonth(currentDate).getDate();
        label = `Minggu 4+ (22-${endDay})`;
        break;
      default:
        return;
    }

    const startDate = new Date(year, month, startDay);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, endDay);
    endDate.setHours(23, 59, 59, 999);

    if (onWeekChange) {
      onWeekChange({
        start: startDate,
        end: endDate,
        weekIndex: selectedWeek,
        label,
        monthLabel: format(currentDate, "MMMM yyyy", { locale: id }),
      });
    }
  }, [selectedWeek, currentDate]); // Dependencies strict

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* 1. Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          ← Bulan Lalu
        </button>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          {format(currentDate, "MMMM yyyy", { locale: id })}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          Bulan Depan →
        </button>
      </div>

      {/* 2. Week Selector */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((week) => {
          const isActive = selectedWeek === week;
          const baseClass =
            "py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200 text-center border";
          const activeClass =
            "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/50 scale-105 transform";
          const inactiveClass =
            "bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white";

          let subLabel = "";
          if (week === 1) subLabel = "01 - 07";
          if (week === 2) subLabel = "08 - 14";
          if (week === 3) subLabel = "15 - 21";
          if (week === 4) subLabel = "22 - End";

          return (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
            >
              <div className="text-xs opacity-70 mb-0.5">MINGGU {week}</div>
              <div className="text-lg font-bold">{subLabel}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekNavigator;
