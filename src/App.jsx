/**
 * App.jsx - REFACTORED with Routing
 * Main application entry with navigation
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';

// Pages
import { EmployeeLogin } from './modules/employees/EmployeeLogin';
import { AttendanceBoard } from './modules/employees/AttendanceBoard';
import { EmployeeList } from './modules/employees/EmployeeList';
import { OrderBoard } from './modules/orders/OrderBoard';
import { OwnerDashboard } from './modules/dashboard/OwnerDashboard';
import { ProductManager } from './modules/products/ProductManager';
import { DataManagement } from './modules/settings/DataManagement';
import { Workspace } from './modules/pos/Workspace';
import { MainLayout } from './components/MainLayout';

import './index.css';

function App() {
  const { isAuthenticated, currentUser } = useAuthStore();

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <EmployeeLogin />;
  }

  // Determine default route based on role
  const getDefaultRoute = () => {
    if (!currentUser) return '/login';

    switch (currentUser.role) {
      case 'OWNER':
        return '/dashboard';
      case 'CASHIER':
        return '/pos';
      case 'PRODUCTION':
        return '/orders';
      default:
        return '/login';
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<EmployeeLogin />} />
        <Route path="/attendance" element={<AttendanceBoard />} />

        {/* Protected Routes with Layout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to={getDefaultRoute()} replace />} />

          {/* Owner Routes */}
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/settings/data" element={<DataManagement />} />

          {/* Cashier Routes */}
          <Route path="/pos" element={<Workspace />} />

          {/* Production Routes */}
          <Route path="/orders" element={<OrderBoard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
