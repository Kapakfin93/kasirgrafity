import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// WAJIB: side-effect import
import "./data/seeders/largeFormat.js";

import { useProductStore } from "./stores/useProductStore";

// 🔥 URUTAN BENAR
(async () => {
  if (window.runLargeFormatReconstruction) {
    await window.runLargeFormatReconstruction(); // isi Dexie
  }
  await useProductStore.getState().fetchMasterData(); // baca Dexie → Zustand
})();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
