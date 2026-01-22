/**
 * Event Insights - READ-ONLY Analytics Layer
 * Based on event_logs table
 *
 * RULES:
 * - READ ONLY (no writes)
 * - No automation
 * - No realtime subscriptions
 * - Cacheable results
 */

import { supabase } from "../services/supabaseClient";

/**
 * Get daily event counts
 * Returns counts for today
 */
export const getDailyEventCounts = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("event_logs")
      .select("event_name")
      .gte("created_at", today.toISOString());

    if (error) throw error;

    // Count by event type
    const counts = {
      web_orders: 0,
      pos_orders: 0,
      payments: 0,
    };

    (data || []).forEach((log) => {
      if (log.event_name === "web_order_received") counts.web_orders++;
      if (log.event_name === "pos_order_created") counts.pos_orders++;
      if (log.event_name === "payment_recorded") counts.payments++;
    });

    return counts;
  } catch (error) {
    console.error("Failed to get daily counts:", error);
    return { web_orders: 0, pos_orders: 0, payments: 0 };
  }
};

/**
 * Check if order came from web (single order)
 * Returns boolean
 */
export const isWebOrder = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from("event_logs")
      .select("id")
      .eq("event_name", "pos_order_created")
      .eq("ref_id", orderId)
      .eq("source", "WEB_LANDING")
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch (error) {
    console.error("Failed to check web order:", error);
    return false;
  }
};

/**
 * Get web order IDs (batch)
 * Returns Set of order IDs that came from web
 * Use for batch checking multiple orders
 */
export const getWebOrderIds = async (orderIds) => {
  try {
    if (!orderIds || orderIds.length === 0) return new Set();

    const { data, error } = await supabase
      .from("event_logs")
      .select("ref_id")
      .eq("event_name", "pos_order_created")
      .eq("source", "WEB_LANDING")
      .in("ref_id", orderIds);

    if (error) throw error;

    return new Set((data || []).map((log) => log.ref_id));
  } catch (error) {
    console.error("Failed to get web order IDs:", error);
    return new Set();
  }
};

/**
 * Get event timeline for order (audit trail)
 * Returns array of events sorted by time
 */
export const getOrderTimeline = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from("event_logs")
      .select("event_name, created_at, actor, metadata")
      .eq("ref_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((log) => ({
      event: log.event_name,
      time: new Date(log.created_at).toLocaleString("id-ID"),
      actor: log.actor,
      details: log.metadata,
    }));
  } catch (error) {
    console.error("Failed to get order timeline:", error);
    return [];
  }
};

/**
 * Cache helper for web order checks
 * Stores results in localStorage
 */
export const getCachedWebOrderStatus = (orderId) => {
  try {
    const cached = localStorage.getItem(`web_order_${orderId}`);
    return cached === "true";
  } catch {
    return null;
  }
};

export const setCachedWebOrderStatus = (orderId, isWeb) => {
  try {
    localStorage.setItem(`web_order_${orderId}`, isWeb.toString());
  } catch {
    // Ignore cache errors
  }
};

export default {
  getDailyEventCounts,
  isWebOrder,
  getWebOrderIds,
  getOrderTimeline,
  getCachedWebOrderStatus,
  setCachedWebOrderStatus,
};
