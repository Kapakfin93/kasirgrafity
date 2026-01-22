/**
 * Owner Action Panel - Usage Example
 * Demonstrates how to integrate OwnerActionPanel in dashboard
 */

import React, { useEffect, useState } from "react";
import { OwnerActionPanel } from "./OwnerActionPanel";
import { getOwnerDailySnapshot } from "../../core/ownerDecisionEngine";
import { resolveActionsFromSnapshot } from "../../core/ownerActionResolver";

/**
 * Example 1: Basic usage in Owner Dashboard
 */
export const OwnerDashboardWithActions = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActions = async () => {
      try {
        // Get daily snapshot
        const snapshot = await getOwnerDailySnapshot();

        // Resolve actions
        const resolvedActions = resolveActionsFromSnapshot(snapshot);

        setActions(resolvedActions);
      } catch (error) {
        console.error("Failed to load actions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, []);

  if (loading) {
    return <div>Loading actions...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Owner Dashboard</h1>

      {/* Action Panel */}
      <OwnerActionPanel actions={actions} title="🎯 Tindakan yang Diperlukan" />
    </div>
  );
};

/**
 * Example 2: With refresh button
 */
export const ActionPanelWithRefresh = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadActions = async () => {
    setLoading(true);
    try {
      const snapshot = await getOwnerDailySnapshot();
      const resolvedActions = resolveActionsFromSnapshot(snapshot);
      setActions(resolvedActions);
    } catch (error) {
      console.error("Failed to load actions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  return (
    <div>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h2>Action Center</h2>
        <button
          onClick={loadActions}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      <OwnerActionPanel actions={actions} />
    </div>
  );
};

/**
 * Example 3: With risky orders
 */
export const ActionPanelWithRiskyOrders = () => {
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const loadActions = async () => {
      const { getTopRiskyOrders } =
        await import("../../core/ownerDecisionEngine");
      const { resolveActionsFromRiskyOrders } =
        await import("../../core/ownerActionResolver");

      const riskyOrders = await getTopRiskyOrders(10);
      const resolvedActions = resolveActionsFromRiskyOrders(riskyOrders);

      setActions(resolvedActions);
    };

    loadActions();
  }, []);

  return (
    <OwnerActionPanel actions={actions} title="🚨 Order Berisiko Tinggi" />
  );
};

/**
 * Example 4: Compact version (no empty state)
 */
export const CompactActionPanel = () => {
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const loadActions = async () => {
      const snapshot = await getOwnerDailySnapshot();
      const resolvedActions = resolveActionsFromSnapshot(snapshot);
      setActions(resolvedActions);
    };

    loadActions();
  }, []);

  return (
    <OwnerActionPanel
      actions={actions}
      title="⚡ Quick Actions"
      showEmpty={false}
    />
  );
};

/**
 * Example 5: Integration in existing dashboard
 */
export const IntegratedDashboard = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const snapshotData = await getOwnerDailySnapshot();
      const resolvedActions = resolveActionsFromSnapshot(snapshotData);

      setSnapshot(snapshotData);
      setActions(resolvedActions);
    };

    loadDashboard();
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "20px",
        padding: "20px",
      }}
    >
      {/* Left: Main dashboard */}
      <div>
        <h1>Dashboard Owner</h1>

        {snapshot && (
          <div>
            <h2>{snapshot.summary.message}</h2>
            <p>Cashflow: Rp {snapshot.today.netCashflow.toLocaleString()}</p>
            {/* Other dashboard content */}
          </div>
        )}
      </div>

      {/* Right: Action panel */}
      <div>
        <OwnerActionPanel actions={actions} />
      </div>
    </div>
  );
};

export default {
  OwnerDashboardWithActions,
  ActionPanelWithRefresh,
  ActionPanelWithRiskyOrders,
  CompactActionPanel,
  IntegratedDashboard,
};
