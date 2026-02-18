/**
 * src/services/OrderSyncService.js
 * Background service to sync offline orders to Supabase.
 *
 * STRATEGY:
 * 1. Poll Dexie for 'orders' where sync_status = 'PENDING'
 * 2. Push to Supabase RPC 'create_pos_order_notary'
 * 3. Update Dexie with Server ID and sync_status = 'SYNCED'
 */

import { supabase } from "./supabaseClient";
import { db } from "../data/db/schema";

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 10;

export const OrderSyncService = {
  /**
   * Main Sync Function
   * Call this on interval (e.g., 60s) or window.online event
   */
  async syncOfflineOrders() {
    if (!navigator.onLine) {
      // console.log("📴 Offline: Skipping Sync");
      return;
    }

    try {
      // 1. Fetch Pending Orders (INSERT OR UPDATE)
      const pendingOrders = await db.orders
        .where("sync_status")
        .anyOf("PENDING", "UPDATE_PENDING")
        .limit(BATCH_SIZE)
        .toArray();

      if (pendingOrders.length === 0) return;

      console.log(
        `🚀 [SYNC START] Found ${pendingOrders.length} pending operations...`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const order of pendingOrders) {
        let success = false;

        // ROUTING LOGIC
        if (order.sync_status === "PENDING") {
          // INSERT PATH
          success = await this.processSingleOrder(order);
        } else if (order.sync_status === "UPDATE_PENDING") {
          // UPDATE PATH
          success = await this.processSingleUpdate(order);
        }

        if (success) successCount++;
        else failCount++;
      }

      console.log(
        `📊 [RESULT] Succes: ${successCount}, Fail: ${failCount}, Pending: ${pendingOrders.length - successCount - failCount}`,
      );
    } catch (err) {
      console.error("❌ Sync Service Error:", err);
    }
  },

  /**
   * PROCESS: INSERT (New Order)
   */
  async processSingleOrder(order) {
    try {
      // 2. Map Payload to RPC Expectations
      // Ensure we send the *Original* created time (Time Travel)

      // --- 🛡️ IDEMPOTENCY FIX (UUID-FIRST STRATEGY) ---
      // 1. Ensure UUID integrity locally
      let finalUuid = order.uuid;
      if (!finalUuid) {
        finalUuid = crypto.randomUUID();
        // CRITICAL: Persist the new UUID locally first!
        await db.orders.update(order.id, { uuid: finalUuid });
        console.log(
          `⚠️ [SELF-HEAL] Generated missing UUID for Order #${order.id}`,
        );
      }

      const payload = {
        ...order,

        // INJECT THESE MISSING FIELDS:
        id: finalUuid, // FORCE Supabase ID to be the UUID

        ref_local_id: order.id, // MANDATORY: Maps Dexie ID
        local_created_at: order.createdAt, // MANDATORY: Maps Original Time
        source: "OFFLINE", // MANDATORY: Hardcoded flag
        idempotency_key: finalUuid, // MANDATORY: Anti-duplication key (UUID)
        is_tempo: order.is_tempo || order.isTempo, // MANDATORY: Rule Engine Logic (Handle snake_case from Dexie)

        created_at: order.local_created_at || order.createdAt, // TIME TRAVEL

        // Ensure customer object exists (even if partial)
        customer: order.customer || {
          name: order.customerName || "Guest",
          phone: order.customerPhone || "-",
        },

        // Ensure payment object exists
        payment: order.payment || {
          amount: order.paidAmount || 0,
          method: "TUNAI", // Default fallback
          received_by: "System",
        },

        // Ensure Meta exists
        meta: order.meta || {},
      };

      // 3. Remove Local-Only Fields (Clean Payload)
      delete payload.uuid; // Synced as 'id'
      delete payload.sync_status;
      delete payload.last_sync_error;

      console.log("📦 [INSERT START] Payload prepared:", {
        ref_id: payload.ref_local_id,
        items: payload.items?.length || 0,
        customer: payload.customer.name,
      });

      // 3. RPC Call (with Latency Check)
      const startTime = performance.now();
      const { data: rpcResult, error } = await supabase.rpc(
        "create_pos_order_notary",
        { p_payload: payload },
      );
      const endTime = performance.now();
      const latency = (endTime - startTime).toFixed(0);

      if (error) throw error;

      if (!rpcResult.success) {
        throw new Error(rpcResult.message || "RPC returned false success");
      }

      // 4. Success Handling
      console.log(
        `✅ [INSERT SUCCESS] Server ID: ${rpcResult.order_number} (Latency: ${latency}ms)`,
      );

      await db.orders.update(order.id, {
        sync_status: "SYNCED",
        server_id: rpcResult.order_id,
        server_order_number: rpcResult.order_number,
        status: rpcResult.status || order.status, // Update status (e.g. PAID/UNPAID)
        updatedAt: new Date().toISOString(),
        last_sync_error: null,
      });

      return true; // Success
    } catch (err) {
      // 5. Failure Handling (INSERT)

      // --- 🛡️ IDEMPOTENCY FIX (Self-Healing) ---
      // Jika error "Duplicate Key", artinya data SUDAH ADA di server (Ghost Sync).
      // Jangan hitung sebagai error, tapi lakukan "Link & Sync".
      if (
        err.message?.includes("duplicate key") ||
        err.message?.includes("idx_orders_ref_local_id")
      ) {
        console.warn(
          "⚠️ Duplicate Key Detected (Ghost Sync). Attempting self-healing...",
          order.id,
        );

        try {
          // 1. Ambil Data dari Server (Cari pakai ref_local_id)
          const { data: existingServerOrder } = await supabase
            .from("orders")
            .select("id, order_number, status")
            .eq("ref_local_id", order.id)
            .single();

          if (existingServerOrder) {
            console.log(
              "✅ Self-Healing Success! Linking to:",
              existingServerOrder.order_number,
            );

            // 2. Update Lokal (Link ke Server ID)
            await db.orders.update(order.id, {
              sync_status: "SYNCED",
              server_id: existingServerOrder.id,
              server_order_number: existingServerOrder.order_number,
              // status: existingServerOrder.status, // Opsional: Ikuti server atau pertahankan lokal? Kita pertahankan lokal dulu.
              last_sync_error: null,
              updatedAt: new Date().toISOString(),
            });

            return true; // ANGGAP SUKSES!
          }
        } catch (recoverErr) {
          console.error("❌ Self-Healing Failed:", recoverErr);
          // Fallthrough ke logic error biasa
        }
      }

      console.error(
        `❌ [INSERT FAIL] ID: ${order.ref_local_id || order.id}`,
        err.message,
      );

      const attempts = (order.sync_attempts || 0) + 1;
      const updates = {
        sync_attempts: attempts,
        last_sync_error: err.message,
        updatedAt: new Date().toISOString(),
      };

      // Give up after MAX_ATTEMPTS
      if (attempts >= MAX_ATTEMPTS) {
        updates.sync_status = "SYNC_FAILED";
        console.error(
          `🛑 Giving up on order ${order.orderNumber} after ${attempts} attempts.`,
        );
      }

      await db.orders.update(order.id, updates);
      return false; // Failed
    }
  },

  /**
   * PROCESS: UPDATE (Existing Order)
   */
  async processSingleUpdate(order) {
    try {
      // Safety Check: Ensure we have a target ID
      const targetId = order.server_id || order.id;

      if (!targetId) {
        throw new Error(
          "Cannot sync update: Missing target ID (server_id or id).",
        );
      }

      console.log(`📝 [UPDATE START] Syncing changes for ID: ${targetId}`);

      // Map Local State -> Server Columns
      const payload = {
        production_status: order.productionStatus,
        payment_status: order.paymentStatus,
        is_tempo: order.is_tempo || order.isTempo, // <--- CRITICAL: Fixes Rule Engine (Handle snake_case from Dexie)
        paid_amount: order.paidAmount,
        remaining_amount: order.remainingAmount,
        assigned_to: order.assignedTo, // For SPK / Operator
        cancel_reason: order.cancelReason,
        cancelled_at: order.cancelledAt, // ISO String
        financial_action: order.financialAction,

        // MARKETING EVIDENCE (SIDECAR)
        marketing_evidence_url: order.marketing_evidence_url,
        is_public_content: order.is_public_content,
        is_approved_for_social: order.is_approved_for_social, // <--- FIX: Added Approval Column

        updated_at: new Date().toISOString(),
        // We generally don't update 'items' or 'customer' on status changes in this V1
      };

      console.log(
        "👉 [SYNC DEBUG] Update Payload:",
        JSON.stringify(payload, null, 2),
      );
      console.log("👉 [SYNC DEBUG] Target Server ID:", targetId);

      // --- 🛡️ NETWORK RESILIENCE WRAPPER ---
      // Wrap Supabase call in a Promise.race to enforce a 20s timeout
      const TIMEOUT_MS = 20000;

      const updatePromise = supabase
        .from("orders")
        .update(payload)
        .eq("id", targetId);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED")), TIMEOUT_MS),
      );

      // Execute Race
      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) {
        console.error("❌ [SYNC ERROR] Supabase Update Failed:", error);
        throw error;
      } else {
        console.log("✅ [SYNC SUCCESS] Supabase Updated!");
      } // Secure lookup by ID

      console.log(`✅ [UPDATE SUCCESS] State synced for ${order.orderNumber}`);

      // Update Local Sync Status
      await db.orders.update(order.id, {
        sync_status: "SYNCED",
        last_sync_error: null,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      const isNetworkIssue =
        err.message === "TIMEOUT_EXCEEDED" ||
        err.message?.includes("AbortError") ||
        err.message?.includes("network");

      if (isNetworkIssue) {
        console.warn(
          `⚠️ [NETWORK ISSUE] Update ID: ${order.id} - ${err.message}`,
        );
      } else {
        console.error(
          `❌ [UPDATE FAIL] ID: ${order.id} / Server: ${order.server_id}`,
          err.message,
        );
      }

      const attempts = (order.sync_attempts || 0) + 1;
      const updates = {
        sync_attempts: attempts,
        last_sync_error: err.message,
        updatedAt: new Date().toISOString(),
      };

      if (attempts >= MAX_ATTEMPTS) {
        updates.sync_status = "SYNC_FAILED";
        console.error(
          `🛑 Giving up on update ${order.orderNumber} after ${attempts} attempts.`,
        );
      }

      await db.orders.update(order.id, updates);
      return false;
    }
  },

  /**
   * Start Background Interval
   */
  start(intervalMs = 60000) {
    console.log("🚀 Order Sync Service Started");

    // Initial Run
    this.syncOfflineOrders();

    // Loop
    setInterval(() => this.syncOfflineOrders(), intervalMs);

    // Event Listener
    window.addEventListener("online", () => {
      console.log("🌐 Network Restored: Triggering Sync...");
      this.syncOfflineOrders();
    });
  },
};
