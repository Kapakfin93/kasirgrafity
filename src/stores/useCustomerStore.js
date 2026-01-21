import { create } from "zustand";
import { supabase } from "../services/supabaseClient";

// INI GUDANG PELANGGAN (CUSTOMER)
export const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  // Load Data Pelanggan
  loadCustomers: async () => {
    if (get().customers.length > 0) return; // Hemat kuota, kalau ada jangan ambil lagi
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true })
        .limit(1000);

      if (error) throw error;
      set({ customers: data || [] });
    } catch (err) {
      console.error("Gagal load customers:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  // Tambah ke Cache (Biar gak perlu refresh halaman setelah input)
  addCustomerToCache: (newCustomer) => {
    set((state) => {
      const exists = state.customers.find((c) => c.id === newCustomer.id);
      if (exists) return state;
      return {
        customers: [...state.customers, newCustomer].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };
    });
  },
}));
