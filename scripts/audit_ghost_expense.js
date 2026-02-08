// 🕵️‍♂️ SCRIPT FORENSIK: Mencari "Ghost Expense" (Data Lenyap)
// ID Kasus: c28d3de8-4dc4-4e0b-99ed-554e3a4c72fd
// Gejala: Ada di DB, tapi tidak muncul di Owner (bahkan setelah login ulang).

// 1. REKONSTRUKSI LOGIC 'syncFromCloud' (dari useExpenseStore.js)
const simulateSync = (expenseDateStr, clientTimeStr) => {
  const clientNow = new Date(clientTimeStr);

  // Logic existing di useExpenseStore.js
  const today = new Date(clientNow);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const expenseDate = new Date(expenseDateStr);

  console.log(`\n📅 Analisis Waktu:`);
  console.log(`   Client Time (Owner): ${clientNow.toISOString()}`);
  console.log(`   Fetch Range Start:   ${monthAgo.toISOString()}`);
  console.log(`   Fetch Range End:     ${today.toISOString()}`);
  console.log(`   Expense Date (DB):   ${expenseDate.toISOString()}`);

  // Simulasi Query Supabase: .gte(monthAgo).lte(today)
  const isTooOld = expenseDate < monthAgo;
  const isFuture = expenseDate > today;

  if (isTooOld) {
    console.log(`❌ HASIL: TERABAIKAN! Data dianggap 'Expired' (> 1 bulan).`);
    return "MISSING_OLD";
  }
  if (isFuture) {
    console.log(`❌ HASIL: TERABAIKAN! Data dianggap 'Masa Depan'.`);
    console.log(
      `   Penyebab: Jam PC Admin mungkin lebih cepat dari jam PC Owner?`,
    );
    return "MISSING_FUTURE";
  }

  console.log(`✅ HASIL: TERANGKUT. Data harusnya muncul.`);
  return "FOUND";
};

// ==========================================
// SKENARIO 1: "PC Admin Lebih Cepat 5 Menit"
// ==========================================
console.log("--- SKENARIO 1: Time Drift (Admin PC ahead) ---");
// Admin input "Hari ini" tapi jam PC dia 14:05.
// Owner login jam 14:00.
// DB mencatat date = 14:05.
// Owner fetch LTE 14:00.
simulateSync("2026-02-09T14:05:00Z", "2026-02-09T14:00:00Z");

// ==========================================
// SKENARIO 2: "Idle Lama = Tanggal Basi?"
// ==========================================
console.log("\n--- SKENARIO 2: PC Idle Lama (Salah Tanggal) ---");
// PC Admin idle dari kemarin, tidak refresh date picker?
// (Mungkin tidak relevan jika pakai default Date.now())

// ==========================================
// SKENARIO 3: "Timezone Confusion"
// ==========================================
console.log("\n--- SKENARIO 3: UTC vs Local ---");
// Supabase simpan UTC. App request ISOString.
// Biasanya aman, tapi sensitif di batas jam.
