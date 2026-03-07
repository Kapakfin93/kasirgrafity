import React, { useState } from "react";
import {
  useExpenseStore,
  EXPENSE_CATEGORIES,
} from "../../stores/useExpenseStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { formatCurrencyInput, parseCurrencyInput } from "../../core/formatters";
import { toast } from "react-hot-toast";

const ExpenseInputForm = ({ onClose }) => {
  const { addExpense } = useExpenseStore();
  const { employees } = useEmployeeStore();

  // Compute active employees directly from reactive state so component re-renders
  const activeEmployees = employees.filter((emp) => emp.status === "ACTIVE");

  const [formData, setFormData] = useState({
    displayAmount: "",
    rawAmount: 0,
    category: "OPERATIONAL",
    description: "",
    employeeId: "",
    employeeName: "",
    createdBy: "Owner",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleAmountChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    const raw = parseCurrencyInput(formatted);
    setFormData({ ...formData, displayAmount: formatted, rawAmount: raw });
  };

  const handleRecipientChange = (e) => {
    const selectedId = e.target.value;
    const selectedEmp = activeEmployees.find((emp) => emp.id === selectedId);
    setFormData({
      ...formData,
      employeeId: selectedId,
      employeeName: selectedEmp ? selectedEmp.name : "",
    });
  };

  const handleDispenserChange = (e) => {
    setFormData({ ...formData, createdBy: e.target.value });
  };

  const handleCategoryChange = (e) => {
    setFormData({
      ...formData,
      category: e.target.value,
      employeeId: "",
      employeeName: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (formData.rawAmount <= 0) {
      setFormError("Nominal harus diisi");
      return;
    }

    const isEmployeeTx =
      formData.category === "SALARY" || formData.category === "BON";

    if (isEmployeeTx && !formData.employeeId) {
      setFormError("❌ WAJIB pilih nama karyawan dari dropdown!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        amount: formData.rawAmount,
        category: formData.category,
        description: formData.description,
        employeeId: isEmployeeTx ? formData.employeeId : null,
        employeeName: isEmployeeTx ? formData.employeeName : null,
        createdBy: formData.createdBy,
      });

      toast.success(
        "✅ Pengeluaran dicatat!\n(Otomatis tersinkronisasi server)",
        { duration: 3000 },
      );

      setFormData({
        displayAmount: "",
        rawAmount: 0,
        category: "OPERATIONAL",
        description: "",
        employeeId: "",
        employeeName: "",
        createdBy: "Owner",
      });
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to add expense:", error);
      setFormError(error.message || "Gagal menyimpan data");
      toast.error(error.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">➕ Catat Pengeluaran</h2>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto custom-scrollbar space-y-4 relative"
        >
          {/* === TIRAI PENGUNCI SINKRONISASI (VISUAL FEEDBACK) === */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-b-2xl">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-emerald-400 font-bold animate-pulse tracking-wide shadow-black drop-shadow-md">
                Menyinkronkan Data...
              </p>
            </div>
          )}

          {formError && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg text-sm font-bold">
              {formError}
            </div>
          )}

          {/* 1. NOMINAL */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Nominal
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-3 text-emerald-500 font-bold">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formData.displayAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white text-lg font-mono outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* 2. KATEGORI */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={handleCategoryChange}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            >
              {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. PENERIMA DANA (KHUSUS GAJI/BON) */}
          {(formData.category === "SALARY" || formData.category === "BON") && (
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30">
              <label className="text-xs font-bold text-blue-300 uppercase block mb-2">
                👤 Penerima Dana (Karyawan)
              </label>
              <select
                value={formData.employeeId}
                onChange={handleRecipientChange}
                className="w-full bg-slate-900 border border-blue-500/50 rounded-lg p-3 text-white outline-none focus:border-blue-400"
              >
                <option value="">-- Pilih Karyawan --</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-blue-400 mt-1">
                * Wajib dipilih agar data akurat
              </p>
            </div>
          )}

          {/* 4. KETERANGAN */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Keterangan
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Contoh: Token Listrik / Kasbon"
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* 5. DISPENSER (DIKELUARKAN OLEH) */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              💁‍♂️ Dikeluarkan Oleh (Kasir/CS)
            </label>
            <select
              value={formData.createdBy}
              onChange={handleDispenserChange}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-purple-500"
            >
              <option value="Owner">👑 Owner</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || formData.rawAmount <= 0}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg mt-4 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan Pengeluaran"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseInputForm;
