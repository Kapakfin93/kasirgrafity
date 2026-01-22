/**
 * ProtectedRoute - Route Protection Component
 * Redirects to /login if user not authenticated
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#020617",
          color: "#06b6d4",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            ⚡
          </div>
          <div style={{ fontSize: "18px", fontWeight: "600" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
}
