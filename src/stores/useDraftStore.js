import { create } from "zustand";
import { supabase } from "../services/supabaseClient";

// ⏱️ Timeout Guard (prevent hang after tab-switching)
const withTimeout = (promise, ms = 8000, msg = "Koneksi lambat, coba lagi.") =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

const useDraftStore = create((set, get) => ({
  drafts: [],
  isLoading: false,
  error: null,

  // 1. Fetch Drafts (Filter Expired + Auto-Release Stuck)
  // 1. Fetch Drafts (Filter Expired + Auto-Release Stuck)
  fetchDrafts: async () => {
    set({ isLoading: true, error: null });

    // DIAGNOSTIC LOG (USER REQUEST)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (import.meta.env.DEV)
      console.log("🔍 Auth User ID saat fetch:", user?.id);

    const now = new Date();
    if (import.meta.env.DEV)
      console.log("🔄 FETCH DRAFTS START", { now: now.toISOString() });

    try {
      // A. Fetch valid drafts (User Only via RLS)
      const { data, error } = await supabase
        .from("pos_drafts")
        .select("*")
        .gt("expires_at", now.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ FETCH DRAFTS ERROR:", error);
        throw error;
      }

      if (import.meta.env.DEV)
        console.log("📥 FETCH DRAFTS SUCCESS:", {
          count: data?.length,
          sample: data?.[0],
        });

      // B. Identify & Auto-Release Stuck Drafts (> 30 mins)
      const stuckDrafts = [];
      const processedData = (data || []).map((d) => {
        if (d.status === "ACTIVE" && d.active_since) {
          const elapsed = now - new Date(d.active_since);
          if (elapsed > 30 * 60 * 1000) {
            // 30 mins
            stuckDrafts.push(d.id);
            return { ...d, status: "PENDING", active_since: null }; // Optimistic UI Update
          }
        }
        return d;
      });

      // C. Safe Background Release (Fire & Forget)
      if (stuckDrafts.length > 0) {
        supabase
          .from("pos_drafts")
          .update({ status: "PENDING", active_since: null })
          .in("id", stuckDrafts)
          .then(({ error }) => {
            if (error) console.error("Auto-release failed:", error);
          });
      }

      set({ drafts: processedData });
    } catch (err) {
      console.error("Fetch drafts error:", err);
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // 2. Save Draft (Smart: UPDATE if draftId exists, INSERT if new)
  saveDraft: async (payload, draftId = null) => {
    set({ isLoading: true, error: null });
    try {
      // A. Get User (Required for created_by)
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sesi login tidak valid. Silakan login ulang.");
      }

      if (import.meta.env.DEV)
        console.log("🔍 created_by saat save:", user.id, "| draftId:", draftId);

      // --- BRANCH: UPDATE existing draft ---
      if (draftId) {
        console.log("📝 MODE: UPDATE draft ID:", draftId);
        const { data, error } = await withTimeout(
          supabase
            .from("pos_drafts")
            .update({
              items_json: {
                version: 1,
                items: payload.items,
                meta: payload.meta,
              },
              total_amount: payload.total,
              customer_name: payload.customer?.name || "Guest",
              customer_phone: payload.customer?.phone || null,
              status: "PENDING",
              active_since: null,
              expires_at: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            })
            .eq("id", draftId)
            .select()
            .single(),
          8000,
          "Timeout saat update draft. Coba lagi.",
        );

        if (error) throw error;

        console.log("✅ UPDATE SUCCESS:", data?.id);
        await get().fetchDrafts();
        return { success: true, data };
      }

      // --- BRANCH: INSERT new draft ---
      console.log("➕ MODE: INSERT new draft");

      // B. Check Limit via COUNT (INSERT only)
      const { count, error: countError } = await supabase
        .from("pos_drafts")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      if (count >= 10) {
        throw new Error(
          "Limit Penuh (Maks 10 Draft). Harap hapus draft yang tidak perlu.",
        );
      }

      // C. Insert with Versioning
      const { data, error } = await withTimeout(
        supabase
          .from("pos_drafts")
          .insert([
            {
              created_by: user.id,
              customer_name: payload.customer?.name || "Guest",
              customer_phone: payload.customer?.phone || null,
              total_amount: payload.total,
              items_json: {
                version: 1,
                items: payload.items,
                meta: payload.meta,
              },
              status: "PENDING",
            },
          ])
          .select()
          .single(),
        8000,
        "Timeout saat menyimpan draft baru. Coba lagi.",
      );

      if (error) throw error;

      console.log("✅ INSERT SUCCESS:", data?.id);
      await get().fetchDrafts();
      return { success: true, data };
    } catch (err) {
      console.error("Save draft error:", err);
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // 3. Load Draft (Race Condition Guard)
  loadDraft: async (draftId) => {
    set({ isLoading: true, error: null });
    try {
      // 🛡️ ATOMIC CLAIM: Update only if PENDING
      const { data, error } = await withTimeout(
        supabase
          .from("pos_drafts")
          .update({
            status: "ACTIVE",
            active_since: new Date().toISOString(),
          })
          .eq("id", draftId)
          .eq("status", "PENDING")
          .select()
          .single(),
        8000,
        "Timeout saat membuka draft. Coba lagi.",
      );

      if (error || !data) {
        // Double check if it exists but is taken
        throw new Error("Gagal membuka: Draft sedang dikerjakan kasir lain!");
      }

      return { success: true, payload: data };
    } catch (err) {
      console.error("Load draft error:", err);
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // 4. Release Draft (Reset to PENDING)
  releaseDraft: async (draftId) => {
    if (!draftId) return;
    try {
      const { error } = await supabase
        .from("pos_drafts")
        .update({ status: "PENDING", active_since: null })
        .eq("id", draftId);

      if (error) throw error;
      get().fetchDrafts(); // Refresh list logic
    } catch (err) {
      console.error("Release draft error:", err);
    }
  },

  // 5. Delete Draft (Cleanup)
  deleteDraft: async (draftId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from("pos_drafts")
        .delete()
        .eq("id", draftId);

      if (error) throw error;
      await get().fetchDrafts();
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useDraftStore;
