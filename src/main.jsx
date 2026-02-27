import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// =================================================================
// 1. IMPORT SEEDERS (Pemicu agar file .js dimuat ke browser)
// =================================================================
import "./data/seeders/largeFormat.js";
import "./data/seeders/reconstructStationery.js";
import "./data/seeders/reconstructMerchandise.js"; // Merchandise disiapkan

import { useProductStore } from "./stores/useProductStore";
import { useOrderStore } from "./stores/useOrderStore";

// =================================================================
// 2. SYSTEM BOOTSTRAP (Jantung Aplikasi)
// Ini berjalan otomatis setiap kali aplikasi dibuka/refresh
// =================================================================
(async () => {
  console.log("🚀 SYSTEM BOOT SEQUENCE STARTED...");

  try {
    // A. LARGE FORMAT RECONSTRUCTION (DISABLED: Now Syncing from Supabase)
    // if (typeof window.runLargeFormatReconstruction === "function") {
    //   console.log("🔄 Booting Large Format...");
    //   await window.runLargeFormatReconstruction();
    // }

    // B. STATIONERY RECONSTRUCTION (FIXED NAME)
    // Kita panggil nama fungsi yang benar sesuai file reconstructStationery.js terbaru

    if (typeof window.runOfficeReconstruction === "function") {
      console.log("🔄 Booting Stationery...");
      await window.runOfficeReconstruction();
    } else {
      console.warn("⚠️ Warning: runOfficeReconstruction function not found!");
    }

    // C. MERCHANDISE RECONSTRUCTION (DISABLED: Data now comes from Supabase Cloud)
    // if (typeof window.runMerchReconstruction === "function") {
    //   console.log("🔄 Booting Merchandise...");
    //   await window.runMerchReconstruction();
    // }
    // D. LOAD DATA TO STATE (ZUSTAND)
    // Setelah semua data siap di Dexie, tarik ke memori aplikasi

    console.log("📥 Loading data to App State...");
    await useProductStore.getState().initialize();

    // E. STATE 3: SYNC SERVICE
    // Now handled by OrderSyncService in App.jsx
    console.log("✅ SYSTEM BOOT COMPLETE. Ready to serve.");
  } catch (error) {
    console.error("❌ CRITICAL BOOT ERROR:", error);
  }
})();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
