import React, { useState, useEffect } from "react";
import { useExpenseStore } from "../../../stores/useExpenseStore";
import { useEmployeeStore } from "../../../stores/useEmployeeStore";

const ExpenseModal = ({ onClose }) => {
  const { addExpense, isLoading } = useExpenseStore();
  const { activeEmployees, getActiveEmployees } = useEmployeeStore();

  // Initial State
  const [formData, setFormData] = useState({
    amount: "",
    category: "OPERATIONAL",
    description: "",
    employeeId: "", // UUID start as empty string
    employeeName: "",
    createdBy: "Owner",
  });

  const [error, setError] = useState(null);

  // Load Data Karyawan
  useEffect(() => {
    getActiveEmployees();
  }, [getActiveEmployees]);

  // Handle Input Text Biasa
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Ganti Kategori
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    console.log("🔄 Ganti Kategori:", category); // CCTV 1

    setFormData((prev) => ({
      ...prev,
      category,
      employeeId: "", // Reset ID
      employeeName: "",
      description: "",
    }));
  };

  // Handle Pilih Penerima (Karyawan)
  const handleRecipientChange = (e) => {
    const selectedId = e.target.value;
    const selectedEmployee = activeEmployees.find(
      (emp) => emp.id === selectedId,
    );

    console.log("👤 Pilih Karyawan:", {
      id: selectedId,
      nama: selectedEmployee?.name,
    }); // CCTV 2

    setFormData((prev) => ({
      ...prev,
      employeeId: selectedId,
      employeeName: selectedEmployee ? selectedEmployee.name : "",
    }));
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // CCTV 3: Intip data sebelum dikirim
    console.log("📦 PAYLOAD FINAL:", formData);

    const isEmployeeTx =
      formData.category === "SALARY" || formData.category === "BON";

    // Validasi Manual di UI
    if (isEmployeeTx && !formData.employeeId) {
      const msg = "❌ STOP: Anda belum memilih nama karyawan!";
      console.error(msg);
      setError(msg);
      return;
    }

    try {
      await addExpense({
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
        employeeId: isEmployeeTx ? formData.employeeId : null,
        employeeName: isEmployeeTx ? formData.employeeName : null,
        createdBy: formData.createdBy,
      });

      console.log("✅ Sukses Simpan!");
      onClose();
    } catch (err) {
      console.error("❌ Gagal Simpan di Store:", err);
      setError(err.message || "Gagal menyimpan data.");
    }
  };

  const isEmployeeMode =
    formData.category === "SALARY" || formData.category === "BON";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header dengan Penanda V2.0 */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            💰 Catat Pengeluaran (V2.0)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg text-sm font-bold animate-pulse">
              {error}
            </div>
          )}

          {/* 1. NOMINAL */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Nominal (Rp)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-3 text-emerald-500 font-bold">
                Rp
              </span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white text-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* 2. KATEGORI */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Kategori
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="OPERATIONAL">🛠️ Operasional</option>
              <option value="SALARY">💰 Gaji Karyawan</option>
              <option value="BON">📝 Kasbon / Hutang</option>
              <option value="MATERIAL">📦 Bahan Baku</option>
              <option value="OTHER">✨ Lainnya</option>
            </select>
          </div>

          {/* 3. PENERIMA DANA (WAJIB MUNCUL JIKA GAJI/BON) */}
          {isEmployeeMode && (
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30">
              <label className="text-xs font-bold text-blue-300 uppercase block mb-2">
                👤 Penerima Dana (Karyawan)
              </label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleRecipientChange}
                className="w-full bg-slate-900 border border-blue-500/50 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-400 outline-none"
                required
              >
                <option value="">-- Pilih Nama Karyawan --</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. KETERANGAN */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Keterangan
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Contoh: Pinjam uang bensin"
              required
            />
          </div>

          {/* 5. DIKELUARKAN OLEH (DISPENSER) */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              💁‍♂️ Dikeluarkan Oleh (Kasir/CS)
            </label>
            <select
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="Owner">👑 Owner</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 pt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            {isLoading ? "⏳ Menyimpan..." : "💾 Simpan (V2)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;
