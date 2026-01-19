import { supabase } from "../services/supabaseClient";

/**
 * Helper: Upload Order to Supabase (Clean State Integration)
 * STRICT MAPPING based on src/hooks/useTransaction.js Audit
 */
export const uploadToSupabase = async (order) => {
  try {
    console.log("🚀 Starting Supabase Sync for Order:", order.orderNumber);

    // 1. PREPARE HEADER PAYLOAD (Snake Case for Table 'orders')
    const orderPayload = {
      id: order.id,
      order_number: order.orderNumber,
      transaction_id: order.transactionId || null,

      // Customer Info
      customer_id: order.customerId || null,
      customer_name:
        order.customerSnapshot?.name || order.customerName || "Guest",
      customer_phone: order.customerSnapshot?.whatsapp || order.customerPhone,
      customer_snapshot: order.customerSnapshot, // JSONB

      // Financials
      total_amount: order.totalAmount,
      discount: order.discount || 0,
      grand_total: order.grandTotal || order.totalAmount,
      final_amount: order.finalAmount || order.totalAmount,

      // Payment Details
      payment_status: order.paymentStatus || "UNPAID",
      dp_amount: order.dpAmount || 0,
      paid_amount: order.paidAmount || 0,
      remaining_amount: order.remainingAmount || 0,

      // Status & Timestamps
      production_status: order.productionStatus || "PENDING",
      created_at: order.createdAt,
      is_tempo: order.isTempo || false,
      received_by: order.receivedBy || order.paymentState?.receivedBy || null,

      // Metadata (Full Dump)
      metadata: order, // Simpan full object sebagai backup di kolom JSONB 'metadata'
    };

    // 2. INSERT HEADER
    const { error: headerError } = await supabase
      .from("orders")
      .insert([orderPayload]);

    if (headerError) {
      console.error("❌ HEADER UPLOAD FAILED:", headerError);
      throw headerError; // Stop here if header fails
    }

    // 3. PREPARE ITEMS PAYLOAD (Snake Case for Table 'order_items')
    // MAPPING RULES (Source of Truth: useTransaction.js):
    // - unitPrice  --> price
    // - totalPrice --> subtotal
    // - qty        --> quantity
    // - productId  --> product_id (TEXT)

    if (order.items && order.items.length > 0) {
      const itemsPayload = order.items.map((item) => {
        // STRICT MAPPING (No "Bypass" / No "Sanitization")
        // Data harus Identik dengan yang ada di Lokal.

        const isValidUUID = (id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          );

        return {
          // Fix: Only send ID if it is a valid UUID (let DB generate if not)
          ...(isValidUUID(item.id) ? { id: item.id } : {}),
          order_id: order.id,

          // IDENTITAS PRODUK
          // "fee-express" tetap "fee-express" (Column Text)
          // IDENTITAS PRODUK
          // Fix: Check if ID is UUID. If "fee-express" (string), send null to avoid 22P02 error.
          product_id: isValidUUID(item.productId || item.id)
            ? item.productId || item.id
            : null,
          product_name: item.productName || item.name || "Unknown Product",
          category_id: isValidUUID(item.categoryId) ? item.categoryId : null, // Validate Category ID too
          description: item.description || "",

          // KEUANGAN
          quantity: item.qty || 1,
          price: item.unitPrice || 0,
          subtotal: item.totalPrice || 0,

          // METADATA TEKNIS (JSONB)
          pricing_type: item.pricingType,
          input_mode: item.inputMode || item.pricingType,

          // SIMPAN SPECS / DIMENSI KE METADATA (Snapshot)
          // Struktur dijaga agar transparan
          metadata: {
            dimensions: item.dimensions || {},
            finishings: item.finishings || [],
            specs_snapshot: item.selected_details || null, // Jika ada detail advanced
            original_meta: item.meta || {},
            notes: item.notes || "",
          },
        };
      });

      // 4. INSERT ITEMS
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsError) {
        console.error("⚠️ ITEM UPLOAD FAILED (Header Saved):", itemsError);
        console.error("❌ Sync considered FAILED due to missing items.");
        return false; // Fail the sync so it retries later
      }
    }

    console.log("✅ SUPABASE SYNC COMPLETE!");
    return true; // Success
  } catch (err) {
    console.error("🔥 SUPABASE UPLOAD EXCEPTION:", err.message);
    return false; // Failed
  }
};

/**
 * Helper: Update existing order in Supabase
 * Handles status changes (Payment, Production, Cancellation)
 */
export const updateSupabaseOrder = async (orderId, updates) => {
  try {
    // Mapping keys Local -> Supabase Schema
    const payload = {};
    if (updates.paymentStatus) payload.payment_status = updates.paymentStatus;
    if (updates.productionStatus)
      payload.production_status = updates.productionStatus;
    if (updates.paidAmount !== undefined)
      payload.paid_amount = updates.paidAmount;
    if (updates.dpAmount !== undefined) payload.dp_amount = updates.dpAmount;
    if (updates.remainingAmount !== undefined)
      payload.remaining_amount = updates.remainingAmount;

    // Cancellation & Audit fields -> metadata (Safe)
    if (updates.productionStatus === "CANCELLED" || updates.cancelReason) {
      // We need to fetch existing metadata first to merge?
      // For efficiency, let's just push specific cancellation metadata if your DB supports partial JSON update.
      // Without partial update support in simple UPDATE query, we might overwrite metadata.
      // BETTER: Just update specific columns if they exist.
      // Current script didn't add cancel_columns. So we use metadata.
      // FOr safety, simpler updates first.
    }

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId);

    if (error) {
      console.error("❌ SUPABASE UPDATE FAILED:", error);
      return false;
    }

    console.log("☁️ Supabase Updated:", orderId, payload);
    return true;
  } catch (err) {
    console.error("🔥 SUPABASE UPDATE EXCEPTION:", err);
    return false;
  }
};
