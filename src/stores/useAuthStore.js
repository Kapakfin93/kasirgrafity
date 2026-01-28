/**
 * src/stores/useAuthStore.js
 * (FINAL SAFETY VERSION)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
// Pastikan path ini benar sesuai struktur folder Anda
// Jika error "Cannot resolve", cek folder core/constants
import { ROLES, STORAGE_KEYS } from "../core/constants";
import { getSetting } from "../data/db/schema";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      loginOwner: async (pin) => {
        set({ loading: true, error: null });
        try {
          const ownerPin = (await getSetting("owner_pin")) || "123456";
          if (pin !== ownerPin) throw new Error("PIN salah");

          const user = {
            id: "owner",
            name: "Joglo Owner",
            role: "owner",
            permissions: ROLES?.OWNER?.permissions || [], // Safety check
          };

          set({ currentUser: user, isAuthenticated: true, loading: false });
          return user;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      loginUser: (user) => {
        set({
          currentUser: user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, error: null });
        localStorage.removeItem(STORAGE_KEYS?.AUTH_USER || "auth-user");
      },

      // 🔥 FUNGSI ANTI-CRASH 🔥
      hasPermission: (permission) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        if (currentUser.role === "owner") return true;

        // JANGAN LANGSUNG .includes, CEK DULU ARRAYNYA ADA TIDAK
        const perms = currentUser.permissions || [];
        return perms.includes(permission);
      },

      isOwner: () => get().currentUser?.role === "owner",
      isCashier: () => {
        const r = get().currentUser?.role;
        return r === "cashier" || r === "kasir";
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
