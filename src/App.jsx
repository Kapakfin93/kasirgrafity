/**
 * src/App.jsx (FULL RESTORE)
 * Memastikan semua Rute (Dashboard, POS, Products) terdaftar.
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CSProvider } from "./context/CSContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedWithPIN } from "./components/ProtectedWithPIN"; // Pastikan file ini ada
import { MainLayout } from "./components/MainLayout";

// Pages
import { Login } from "./pages/Login";
import { OwnerDashboard } from "./modules/dashboard/OwnerDashboard";
import { ProductManager } from "./modules/products/ProductManager";
import { EmployeeList } from "./modules/employees/EmployeeList";
import { DataManagement } from "./modules/settings/DataManagement";
import { Workspace } from "./modules/pos/Workspace";
import { OrderBoard } from "./modules/orders/OrderBoard";
import { ExpensePage } from "./modules/expenses/ExpensePage";
import { WebInboxPanel } from "./modules/orders/WebInboxPanel";
import { AttendanceBoard } from "./modules/employees/AttendanceBoard";

// Style
import "./index.css";

// Services
import { OrderSyncService } from "./services/OrderSyncService";

function App() {
  // 🔥 Start Background Sync Service
  React.useEffect(() => {
    OrderSyncService.start();
  }, []);

  return (
    <AuthProvider>
      <CSProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes (Harus Login) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect ke POS */}
              <Route index element={<Navigate to="/pos" replace />} />

              {/* === ZONA OWNER (TERKUNCI PIN) === */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedWithPIN>
                    <OwnerDashboard />
                  </ProtectedWithPIN>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedWithPIN>
                    <ProductManager />
                  </ProtectedWithPIN>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedWithPIN>
                    <EmployeeList />
                  </ProtectedWithPIN>
                }
              />
              <Route
                path="/settings/data"
                element={
                  <ProtectedWithPIN>
                    <DataManagement />
                  </ProtectedWithPIN>
                }
              />

              {/* === ZONA BEBAS (OPERASIONAL) === */}
              <Route path="/pos" element={<Workspace />} />
              <Route path="/orders" element={<OrderBoard />} />
              <Route path="/expenses" element={<ExpensePage />} />
              <Route path="/web-inbox" element={<WebInboxPanel />} />
              <Route path="/attendance" element={<AttendanceBoard />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CSProvider>
    </AuthProvider>
  );
}

export default App;
