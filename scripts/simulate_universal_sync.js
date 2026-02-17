const mockSupabase = {
  updates: [],
  inserts: [],
  deletes: [],
  from: (table) => {
    return {
      update: (payload) => ({
        eq: (col, val) => {
          mockSupabase.updates.push({ table, payload, where: `${col}=${val}` });
          return { error: null };
        },
      }),
      insert: (payload) => {
        mockSupabase.inserts.push({ table, payload });
        return { error: null };
      },
      delete: () => ({
        eq: (col, val) => {
          mockSupabase.deletes.push({ table, where: `${col}=${val}` });
          return { error: null };
        },
      }),
      upsert: (payload, opts) => {
        // Mock for Matrix Price Sync
        mockSupabase.updates.push({ table, payload, type: "upsert", opts });
        return { error: null, select: () => ({}) };
      },
    };
  },
};

// MOCK PAYLOAD (Simulating UI State for Nota)
const productId = "master_nota_1ply";
const mockPayload = {
  variants: [
    {
      id: "var_nota_1ply_std",
      label: "NCR Top White",
      specs: "Standard",
      price: 0,
    }, // Existing
    { id: "new_var_123", label: "NCR Bottom Pink", specs: "Custom", price: 0 }, // New
  ],
  // Matrix Prices are usually separate or nested in variants.price_list
  // But Universal Sync Step 1 only cares about variants array.
};

async function simulateUniversalSync() {
  console.log("🚀 SIMULATION: Universal Material Sync");

  // 1. Process Variants (Step 1)
  const variants = mockPayload.variants;
  for (const v of variants) {
    const variantPayload = {
      product_id: productId,
      label: v.label,
      name: v.label,
      specs: v.specs || "",
      price_per_unit: v.price || 0,
      display_order: 99,
      is_active: true,
    };

    if (v.id && !v.id.startsWith("new_")) {
      // UPDATE EXISTING
      await mockSupabase
        .from("product_materials")
        .update(variantPayload)
        .eq("id", v.id);
      console.log(`✅ UPDATE Variant: ${v.label} (ID: ${v.id})`);
    } else {
      // INSERT NEW
      const newId = `gen_uuid_${Math.random().toString(36).substr(2, 5)}`; // Simulate DB ID generation

      // In real code, we Insert, then use the returned ID for the next step (Matrix Sync).
      // But here we just log the intent.
      await mockSupabase.from("product_materials").insert(variantPayload);
      console.log(`✅ INSERT New Variant: ${v.label} (Will get new UUID)`);
    }
  }

  console.log("\n📊 DATABASE ACTIONS LOG:");
  console.log("Updates:", mockSupabase.updates);
  console.log("Inserts:", mockSupabase.inserts);
}

simulateUniversalSync();
