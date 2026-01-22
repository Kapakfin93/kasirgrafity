/**
 * PINModal Component
 * Modal for PIN input to access owner-only pages
 * - Hardcoded PIN (can be moved to env later)
 * - Session-based verification (sessionStorage)
 * - Auto-focus on input
 */

import React, { useState, useEffect, useRef } from "react";

const OWNER_PIN = "1234"; // Hardcoded for now, can be moved to import.meta.env.VITE_OWNER_PIN
const PIN_SESSION_KEY = "owner_pin_verified";

export function PINModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsVerifying(true);

    // Simulate verification delay (for UX)
    setTimeout(() => {
      if (pin === OWNER_PIN) {
        // Store verification in sessionStorage
        sessionStorage.setItem(PIN_SESSION_KEY, "true");
        onSuccess();
      } else {
        setError("PIN salah");
        setPin("");
        setIsVerifying(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }, 300);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only digits
    if (value.length <= 6) {
      setPin(value);
      setError("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(8px)",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <h2
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            Akses Owner
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Masukkan PIN untuk melanjutkan
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              placeholder="Masukkan PIN..."
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "rgba(30, 41, 59, 0.8)",
                border: error
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: "white",
                fontSize: "18px",
                textAlign: "center",
                letterSpacing: "4px",
                outline: "none",
                transition: "all 0.2s",
              }}
            />
            {error && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "12px",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isVerifying}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "rgba(71, 85, 105, 0.5)",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isVerifying ? "not-allowed" : "pointer",
                opacity: isVerifying ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying || pin.length < 4}
              style={{
                flex: 1,
                padding: "12px 24px",
                background:
                  isVerifying || pin.length < 4
                    ? "rgba(6, 182, 212, 0.3)"
                    : "linear-gradient(135deg, #06b6d4, #3b82f6)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor:
                  isVerifying || pin.length < 4 ? "not-allowed" : "pointer",
                opacity: isVerifying || pin.length < 4 ? 0.5 : 1,
                transition: "all 0.2s",
                boxShadow:
                  isVerifying || pin.length < 4
                    ? "none"
                    : "0 0 20px rgba(6, 182, 212, 0.4)",
              }}
            >
              {isVerifying ? "⏳ Verifikasi..." : "Masuk"}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          💡 Halaman ini hanya untuk Owner
        </div>
      </div>
    </div>
  );
}

// Helper function to check if PIN is verified
export function isPinVerified() {
  return sessionStorage.getItem(PIN_SESSION_KEY) === "true";
}

// Helper function to clear PIN verification
export function clearPinVerification() {
  sessionStorage.removeItem(PIN_SESSION_KEY);
}
