/**
 * Owner Action Panel Component
 * Pure UI component for displaying and executing owner actions
 * READ-ONLY: No database updates, no auto-send, manual execution only
 *
 * @component OwnerActionPanel
 */

import React, { useState } from "react";
import { formatActionForWhatsApp } from "../../core/ownerActionResolver";

/**
 * Priority indicator component
 */
const PriorityBadge = ({ priority }) => {
  const styles = {
    HIGH: {
      bg: "rgba(239, 68, 68, 0.1)",
      border: "#ef4444",
      text: "#ef4444",
      icon: "🔴",
    },
    MEDIUM: {
      bg: "rgba(251, 191, 36, 0.1)",
      border: "#fbbf24",
      text: "#fbbf24",
      icon: "🟡",
    },
    LOW: {
      bg: "rgba(34, 197, 94, 0.1)",
      border: "#22c55e",
      text: "#22c55e",
      icon: "🟢",
    },
  };

  const style = styles[priority] || styles.LOW;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
      }}
    >
      {style.icon} {priority}
    </span>
  );
};

/**
 * Action target item component
 */
const TargetItem = ({ target, channels, onWhatsApp, onCall }) => {
  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
        borderRadius: "8px",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "4px" }}
          >
            {target.customerName}
          </div>
          <div
            style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}
          >
            {target.orderNumber}
          </div>
          {target.remainingAmount && (
            <div
              style={{ color: "#fbbf24", fontSize: "14px", fontWeight: "600" }}
            >
              Rp {target.remainingAmount.toLocaleString()}
            </div>
          )}
          {target.ageInDays && (
            <div
              style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}
            >
              {target.ageInDays} hari
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {channels.includes("WHATSAPP") &&
            target.phone &&
            target.phone !== "-" && (
              <button
                onClick={() => onWhatsApp(target)}
                style={{
                  padding: "6px 12px",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
                }}
              >
                📱 WhatsApp
              </button>
            )}

          {channels.includes("CALL") &&
            target.phone &&
            target.phone !== "-" && (
              <button
                onClick={() => onCall(target)}
                style={{
                  padding: "6px 12px",
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                }}
              >
                📞 Call
              </button>
            )}
        </div>
      </div>

      {target.message && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#cbd5e1",
            fontStyle: "italic",
          }}
        >
          "{target.message}"
        </div>
      )}
    </div>
  );
};

/**
 * Single action card component
 */
const ActionCard = ({ action }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleWhatsApp = (target) => {
    const targetIndex = action.targets.indexOf(target);
    const waFormat = formatActionForWhatsApp(action, targetIndex);

    if (waFormat && waFormat.url) {
      window.open(waFormat.url, "_blank");
    } else {
      alert("Nomor WhatsApp tidak tersedia");
    }
  };

  const handleCall = (target) => {
    if (target.phone && target.phone !== "-") {
      const cleanPhone = target.phone.replace(/\D/g, "");
      window.location.href = `tel:${cleanPhone}`;
    } else {
      alert("Nomor telepon tidak tersedia");
    }
  };

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <PriorityBadge priority={action.riskLevel} />
            <span
              style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "15px" }}
            >
              {action.label}
            </span>
          </div>
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>
            {action.targets.length} target{action.targets.length > 1 ? "s" : ""}
            {action.channels.length > 0 && (
              <span> • {action.channels.join(", ")}</span>
            )}
          </div>
        </div>

        {action.targets.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: "6px 12px",
              background: "rgba(139, 92, 246, 0.1)",
              color: "#a78bfa",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
            }}
          >
            {isExpanded ? "▲ Tutup" : "▼ Lihat Detail"}
          </button>
        )}
      </div>

      {/* Original recommendation */}
      {action.originalRecommendation && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(139, 92, 246, 0.05)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#c4b5fd",
            marginBottom: "12px",
          }}
        >
          💡 {action.originalRecommendation}
        </div>
      )}

      {/* Expanded targets */}
      {isExpanded && action.targets.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            DAFTAR TARGET:
          </div>
          {action.targets.map((target, index) => (
            <TargetItem
              key={index}
              target={target}
              channels={action.channels}
              onWhatsApp={handleWhatsApp}
              onCall={handleCall}
            />
          ))}
        </div>
      )}

      {/* No action needed */}
      {action.actionType === "NO_ACTION" && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            textAlign: "center",
            padding: "8px",
          }}
        >
          ✅ Tidak ada tindakan yang diperlukan
        </div>
      )}

      {/* Monitor only */}
      {action.actionType === "MONITOR_ONLY" && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            textAlign: "center",
            padding: "8px",
          }}
        >
          👁️ Pantau saja, tidak perlu tindakan khusus
        </div>
      )}
    </div>
  );
};

/**
 * Main Owner Action Panel Component
 *
 * @param {Object} props
 * @param {Array} props.actions - Array of resolved actions
 * @param {string} props.title - Optional panel title
 * @param {boolean} props.showEmpty - Show message when no actions
 */
export const OwnerActionPanel = ({
  actions = [],
  title = "🎯 Action Center",
  showEmpty = true,
}) => {
  // Group actions by priority
  const urgentActions = actions.filter((a) => a.riskLevel === "HIGH");
  const normalActions = actions.filter((a) => a.riskLevel === "MEDIUM");
  const lowActions = actions.filter((a) => a.riskLevel === "LOW");

  // Calculate summary
  const totalTargets = actions.reduce((sum, a) => sum + a.targets.length, 0);
  const contactActions = actions.filter(
    (a) => a.actionType === "CONTACT_CUSTOMER",
  ).length;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #0f172a, #1e293b)",
        borderRadius: "12px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            color: "#fff",
            margin: "0 0 8px 0",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          {title}
        </h2>
        {actions.length > 0 && (
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>
            {actions.length} aksi • {totalTargets} target
            {contactActions > 0 && ` • ${contactActions} perlu kontak`}
          </div>
        )}
      </div>

      {/* Empty state */}
      {actions.length === 0 && showEmpty && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
          <div
            style={{ fontSize: "16px", fontWeight: "600", color: "#94a3b8" }}
          >
            Semua Baik-Baik Saja
          </div>
          <div style={{ fontSize: "13px", marginTop: "4px" }}>
            Tidak ada tindakan yang diperlukan saat ini
          </div>
        </div>
      )}

      {/* Urgent actions */}
      {urgentActions.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            🚨 URGENT (Hari Ini)
          </div>
          {urgentActions.map((action, index) => (
            <ActionCard key={index} action={action} />
          ))}
        </div>
      )}

      {/* Normal actions */}
      {normalActions.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              color: "#fbbf24",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            📋 NORMAL (Minggu Ini)
          </div>
          {normalActions.map((action, index) => (
            <ActionCard key={index} action={action} />
          ))}
        </div>
      )}

      {/* Low priority actions */}
      {lowActions.length > 0 && (
        <div>
          <div
            style={{
              color: "#22c55e",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            ℹ️ INFO
          </div>
          {lowActions.map((action, index) => (
            <ActionCard key={index} action={action} />
          ))}
        </div>
      )}

      {/* Footer note */}
      {actions.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(139, 92, 246, 0.05)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#a78bfa",
            textAlign: "center",
          }}
        >
          💡 Klik tombol WhatsApp atau Call untuk menghubungi customer
        </div>
      )}
    </div>
  );
};

export default OwnerActionPanel;
