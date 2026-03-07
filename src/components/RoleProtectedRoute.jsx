/**
 * RoleProtectedRoute.jsx
 * Guard component that restricts access based on user role.
 * Redirects to /pos if the user is not authorized.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export function RoleProtectedRoute({ children, requiredRole = "owner" }) {
  const { currentUser, isAuthenticated } = useAuthStore();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role doesn't match, redirect to POS (Dashboard Kasir)
  if (currentUser?.role !== requiredRole) {
    console.warn(
      `Access denied for role: ${currentUser?.role}. Expected: ${requiredRole}`,
    );
    return <Navigate to="/pos" replace />;
  }

  return children;
}
