// MOCK DATA
const employees = [
  { id: "emp1", name: "Budi" },
  { id: "emp2", name: "Siti" },
];

const mockExpenses = [
  {
    id: 1,
    category: "BON",
    amount: 200000,
    employeeId: "emp1",
    description: "Pinjam uang",
  },
  {
    id: 2,
    category: "BON",
    amount: 50000,
    employeeId: "emp1",
    description: "Beli pulsa",
  },
  {
    id: 3,
    category: "SALARY",
    amount: 3000000,
    employeeId: "emp1",
    description: "Gaji Maret",
  }, // Full Salary input manually?
  {
    id: 4,
    category: "BON",
    amount: 100000,
    employeeId: "emp2",
    description: "Kasbon sakit",
  },
];

// SIMULASI LAPORAN GABUNGAN (YANG DIHARAPKAN USER)
function generateUnifiedReport() {
  console.log("--- 🕵️ FORENSIC AUDIT: UNIFIED PAYROLL REPORT ---");

  employees.forEach((emp) => {
    console.log(`\n👤 Karyawan: ${emp.name} (${emp.id})`);

    const bons = mockExpenses.filter(
      (e) => e.employeeId === emp.id && e.category === "BON",
    );
    const salaries = mockExpenses.filter(
      (e) => e.employeeId === emp.id && e.category === "SALARY",
    );

    const totalBon = bons.reduce((sum, e) => sum + e.amount, 0);
    const totalSalary = salaries.reduce((sum, e) => sum + e.amount, 0);

    console.log(`   - Total Kasbon: Rp ${totalBon.toLocaleString()}`);
    console.log(`   - Total Gaji Input: Rp ${totalSalary.toLocaleString()}`);

    // GAP ANALYSIS
    // Current system treats them as independent expenses.
    // User wants: Net Take Home Pay = Salary - Bon?

    const netDeduction = totalSalary > 0 ? totalSalary - totalBon : 0;

    if (totalSalary > 0) {
      console.log(
        `   - ⚠️ SYSTEM GAP: Apakah input Gaji Rp ${totalSalary.toLocaleString()} itu sudah dipotong bon?`,
      );
      console.log(
        `     Jika belum, seharusnya terima bersih: Rp ${netDeduction.toLocaleString()}`,
      );
      console.log(`     Sistem saat ini TIDAK MELAKUKAN pemotongan otomatis.`);
    } else {
      console.log(`   - Belum ada input Gaji.`);
    }
  });

  // CHECK DATABASE LINK
  const orphanBons = mockExpenses.filter(
    (e) => e.category === "BON" && !e.employeeId,
  );
  if (orphanBons.length > 0) {
    console.log("\n❌ CRITICAL: Ada Kasbon tanpa Employee ID!");
  } else {
    console.log(
      "\n✅ OK: Semua Kasbon terhubung ke Employee ID (Data Structure Valid).",
    );
  }
}

generateUnifiedReport();
