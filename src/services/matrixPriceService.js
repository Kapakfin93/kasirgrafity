/**
 * MATRIX PRICE SERVICE (OPTION B - ISOLATED)
 * Handles sync of MATRIX price_list to Supabase product_price_matrix table
 *
 * CRITICAL RULES:
 * - Only activated for calc_engine === "MATRIX_FIXED"
 * - DOES NOT touch TIERED/UNIT products
 * - Throws errors (fail-fast, no silent failures)
 * - Supabase is source of truth for MATRIX prices
 */

import { supabase } from "./supabaseClient.js";

/**
 * Sync MATRIX prices to Supabase product_price_matrix table
 *
 * @param {string} productId - e.g., "master_nota_1ply"
 * @param {Array} variants - Array of variant objects with price_list
 * @throws {Error} if sync fails
 */
export async function syncMatrixPricesToSupabase(productId, variants) {
  if (!productId) {
    throw new Error("productId is required for matrix price sync");
  }

  if (!variants || !Array.isArray(variants)) {
    throw new Error("variants must be an array");
  }

  console.log(`🔄 Syncing MATRIX prices for ${productId}...`);

  try {
    for (const variant of variants) {
      // Skip variants without price_list (not MATRIX type)
      if (!variant.price_list || typeof variant.price_list !== "object") {
        continue;
      }

      const materialId = variant.id;
      if (!materialId) {
        throw new Error(`Variant missing ID for product ${productId}`);
      }

      // Process each size in price_list (keys are size_id, not labels)
      for (const [sizeId, price] of Object.entries(variant.price_list)) {
        // UPSERT to product_price_matrix (direct size_id, no lookup)
        const { error: upsertError } = await supabase
          .from("product_price_matrix")
          .upsert(
            {
              product_id: productId,
              material_id: materialId,
              size_id: sizeId, // ✅ Direct from price_list key
              price: Number(price),
            },
            {
              onConflict: "product_id,material_id,size_id",
            },
          );

        if (upsertError) {
          throw new Error(
            `Failed to upsert matrix price for ${productId}/${materialId}/${sizeId}: ${upsertError.message}`,
          );
        }

        console.log(
          `   ✅ Synced size ${sizeId}: Rp ${price} (product: ${productId}, material: ${materialId})`,
        );
      }
    }

    console.log(`✅ Matrix price sync complete for ${productId}`);
  } catch (error) {
    console.error(`❌ Matrix price sync failed for ${productId}:`, error);
    throw error; // Re-throw to prevent Dexie update in caller
  }
}

/**
 * READ: Fetch MATRIX prices from Supabase (for product load/refresh)
 *
 * @param {string} productId - e.g., "master_nota_1ply"
 * @param {string} materialId - e.g., "var_nota_1ply_std"
 * @returns {Promise<Object>} price_list object { size_id: price }
 */
export async function fetchMatrixPricesFromSupabase(productId, materialId) {
  // 🔥 LOG RAW QUERY PARAMS
  console.log("🔍 MATRIX READ - Query params:", {
    table: "product_price_matrix",
    product_id: productId,
    material_id: materialId,
  });

  try {
    const { data, error } = await supabase
      .from("product_price_matrix")
      .select("size_id, price")
      .eq("product_id", productId)
      .eq("material_id", materialId);

    // 🔥 LOG RAW RESULT
    console.log("🔍 MATRIX READ rows =", data?.length || 0);

    if (error) {
      console.error(
        `❌ MATRIX READ ERROR for ${productId}/${materialId}:`,
        error.message,
      );
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ MATRIX READ: Zero rows for ${productId}/${materialId}`);
      return null;
    }

    // Convert to price_list format { size_id: price }
    const priceList = {};
    data.forEach((row) => {
      priceList[row.size_id] = row.price;
    });

    console.log(
      `✅ MATRIX READ SUCCESS: Loaded ${data.length} prices for ${productId}/${materialId}`,
    );
    return priceList;
  } catch (error) {
    console.error(
      `❌ Matrix READ error for ${productId}/${materialId}:`,
      error,
    );
    return null; // Fallback to hardcoded on error
  }
}
