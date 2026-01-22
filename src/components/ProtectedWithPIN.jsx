/**
 * ProtectedWithPIN Component
 * Guard component that requires PIN verification to access children
 * - Checks sessionStorage for existing verification
 * - Shows PINModal if not verified
 * - Redirects to /pos on cancel
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PINModal, isPinVerified } from "./PINModal";

export function ProtectedWithPIN({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already verified in this session
    if (isPinVerified()) {
      setIsVerified(true);
    } else {
      setShowPinModal(true);
    }
  }, []);

  const handlePinSuccess = () => {
    setIsVerified(true);
    setShowPinModal(false);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    navigate("/pos"); // Redirect to POS on cancel
  };

  // Show nothing while checking verification
  if (!isVerified && !showPinModal) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#020617",
          color: "#94a3b8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
          <p>Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPinModal && (
        <PINModal onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      )}
      {isVerified && children}
    </>
  );
}
