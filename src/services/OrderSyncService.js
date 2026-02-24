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
import { useOrderStore } from "../stores/useOrderStore";
import { logger } from "../utils/logger";

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 10;

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap + random jitter
const getBackoffMs = (attempts) => {
  const base = Math.min(30000, 1000 * Math.pow(2, attempts));
  const jitter = Math.random() * 1000;
  return base + jitter;
};

export const OrderSyncService = {
  // --- Resource & State Tracking ---
  _isSyncing: false,
  _intervalId: null,
  _onlineHandler: null,

  /**
   * Main Sync Function
   * Call this on interval (e.g., 60s) or window.online event
   */
  async syncOfflineOrders() {
    if (this._isSyncing) {
      logger.debug("⏳ Sync sudah berjalan — skip");
      return;
    }
    this._isSyncing = true;

    if (!navigator.onLine) {
      this._isSyncing = false;
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

      // 2. Filter orders still in backoff cooldown
      const now = Date.now();
      const readyOrders = pendingOrders.filter((order) => {
        if (!order.last_sync_attempt_at || !order.sync_attempts) return true;
        const backoffMs = getBackoffMs(order.sync_attempts);
        const elapsed = now - new Date(order.last_sync_attempt_at).getTime();
        return elapsed >= backoffMs;
      });

      if (readyOrders.length === 0) return;

      logger.debug(
        `🚀 [SYNC START] Found ${readyOrders.length} ready (${pendingOrders.length} total pending)...`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const order of readyOrders) {
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

      logger.debug(
        `📊 [RESULT] Success: ${successCount}, Fail: ${failCount}, Pending: ${readyOrders.length - successCount - failCount}`,
      );
    } catch (err) {
      logger.error("❌ Sync Service Error:", err);
    } finally {
      this._isSyncing = false;
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
        logger.debug(
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

      logger.debug("📦 [INSERT START] Payload prepared:", {
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
      logger.debug(
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

      // 5. Update Zustand state → NotaPreview re-render dengan nomor resmi
      try {
        const { updateOrderServerNumber } = useOrderStore.getState();
        await updateOrderServerNumber(order.id, rpcResult.order_number);
      } catch (stateErr) {
        // Non-fatal — sync tetap dianggap berhasil
        logger.warn("⚠️ [STATE SYNC] Gagal update Zustand:", stateErr.message);
      }

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
        logger.warn(
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
            logger.debug(
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
          logger.error("❌ Self-Healing Failed:", recoverErr);
          // Fallthrough ke logic error biasa
        }
      }

      logger.error(
        `❌ [INSERT FAIL] ID: ${order.ref_local_id || order.id}`,
        err.message,
      );

      const attempts = (order.sync_attempts || 0) + 1;
      const updates = {
        sync_attempts: attempts,
        last_sync_error: err.message,
        last_sync_attempt_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Give up after MAX_ATTEMPTS
      if (attempts >= MAX_ATTEMPTS) {
        updates.sync_status = "SYNC_FAILED";
        logger.error(
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

      logger.debug(`📝 [UPDATE START] Syncing changes for ID: ${targetId}`);

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

        // GALLERY ARCHIVE & APPROVAL AUDIT TRAIL
        archived_at: order.archivedAt ?? order.archived_at ?? null,
        approved_by: order.approvedBy ?? order.approved_by ?? null,
        approved_by_role:
          order.approvedByRole ?? order.approved_by_role ?? null,

        updated_at: new Date().toISOString(),
        // We generally don't update 'items' or 'customer' on status changes in this V1
      };

      logger.debug(
        "👉 [SYNC DEBUG] Update Payload:",
        JSON.stringify(payload, null, 2),
      );
      logger.debug("👉 [SYNC DEBUG] Target Server ID:", targetId);

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
        logger.error("❌ [SYNC ERROR] Supabase Update Failed:", error);
        throw error;
      } else {
        logger.debug("✅ [SYNC SUCCESS] Supabase Updated!");
      } // Secure lookup by ID

      logger.debug(`✅ [UPDATE SUCCESS] State synced for ${order.orderNumber}`);

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
        logger.warn(
          `⚠️ [NETWORK ISSUE] Update ID: ${order.id} - ${err.message}`,
        );
      } else {
        logger.error(
          `❌ [UPDATE FAIL] ID: ${order.id} / Server: ${order.server_id}`,
          err.message,
        );
      }

      const attempts = (order.sync_attempts || 0) + 1;
      const updates = {
        sync_attempts: attempts,
        last_sync_error: err.message,
        last_sync_attempt_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (attempts >= MAX_ATTEMPTS) {
        updates.sync_status = "SYNC_FAILED";
        logger.error(
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
    if (this.isStarted) {
      logger.debug("⚡ OrderSyncService already running — skipped");
      return;
    }
    this.isStarted = true;
    logger.debug("🚀 Order Sync Service Started");

    // Initial Run
    this.syncOfflineOrders();

    // Loop (save ref for cleanup)
    this._intervalId = setInterval(() => this.syncOfflineOrders(), intervalMs);

    // Event Listener (save ref for cleanup)
    this._onlineHandler = () => {
      logger.debug("🌐 Network Restored: Triggering Sync...");
      this.syncOfflineOrders();
    };
    window.addEventListener("online", this._onlineHandler);
  },

  /**
   * Stop Background Interval & Cleanup
   */
  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    if (this._onlineHandler) {
      window.removeEventListener("online", this._onlineHandler);
      this._onlineHandler = null;
    }
    this.isStarted = false;
    this._isSyncing = false;
    logger.debug("🛑 Order Sync Service Stopped");
  },
};
