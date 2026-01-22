/**
 * App.jsx - REFACTORED with Admin Auth
 * Main application entry with Supabase Auth protection
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import { Login } from "./pages/Login";
import { EmployeeLogin } from "./modules/employees/EmployeeLogin";
import { AttendanceBoard } from "./modules/employees/AttendanceBoard";
import { EmployeeList } from "./modules/employees/EmployeeList";
import { OrderBoard } from "./modules/orders/OrderBoard";
import { OwnerDashboard } from "./modules/dashboard/OwnerDashboard";
import { ProductManager } from "./modules/products/ProductManager";
import { DataManagement } from "./modules/settings/DataManagement";
import { Workspace } from "./modules/pos/Workspace";
import { ExpensePage } from "./modules/expenses/ExpensePage";
import { MainLayout } from "./components/MainLayout";
import { WebInboxPanel } from "./modules/orders/WebInboxPanel";

import "./index.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Employee Routes (keep untouched) */}
          <Route path="/employee-login" element={<EmployeeLogin />} />
          <Route path="/attendance" element={<AttendanceBoard />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />

            {/* Admin Routes */}
            <Route path="/dashboard" element={<OwnerDashboard />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/products" element={<ProductManager />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/settings/data" element={<DataManagement />} />
            <Route path="/web-inbox" element={<WebInboxPanel />} />

            {/* POS Routes */}
            <Route path="/pos" element={<Workspace />} />

            {/* Production Routes */}
            <Route path="/orders" element={<OrderBoard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
