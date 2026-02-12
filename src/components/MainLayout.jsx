/**
 * src/components/MainLayout.jsx
 * (INTEGRATED VERSION - FIXED PERMISSIONS)
 */
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useAttendanceStore } from "../stores/useAttendanceStore";
import { LogoutConfirmModal } from "./LogoutConfirmModal";
import { ThemeToggle } from "./ThemeToggle";
import { useEmployeeStore } from "../stores/useEmployeeStore";

// 👇 IMPORT INI HARUS SESUAI DENGAN FILE TAHAP 1
import { useAutoLock } from "../hooks/useAutoLock";

export function MainLayout() {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { initTheme } = useThemeStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [realUser, setRealUser] = useState(null);
  const [realRole, setRealRole] = useState("loading");

  // 1. PANGGIL TIMER (Tahap 1)
  const { lockSystem } = useAutoLock();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // 2. AMBIL DATA REAL & SYNC (Penyelamat)
  useEffect(() => {
    const fetchRealProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setRealUser(profile);
          setRealRole(profile.role);

          // ✅ PERBAIKAN DIMULAI DI SINI
          // 1️⃣ Definisikan logic permissions
          let permissions = [];

          if (profile.role === "admin") {
            permissions = [
              "view_orders",
              "use_kasir",
              "view_inbox",
              "manage_expenses",
              "view_attendance",
              "update_status",
            ];
          }

          // INJECT KE STORE (Tahap 2)
          useAuthStore.setState({
            currentUser: {
              id: profile.id,
              name: profile.name,
              role: profile.role,
              email: user.email,
              // 2️⃣ Masukkan variable permissions ke sini
              permissions,
            },
            isAuthenticated: true,
          });
          // ✅ PERBAIKAN SELESAI

          // 🔄 AUTO-SYNC DATA UNTUK ADMIN (BACKGROUND, SEKALI SAAT LOGIN)
          if (profile.role === "admin") {
            useEmployeeStore.getState().syncFromCloud();
            useExpenseStore.getState().syncFromCloud();
            useAttendanceStore.getState().syncFromCloud();
          }
        } else {
          setRealRole("guest");
        }
      } else {
        setRealRole("guest");
      }
    };

    fetchRealProfile();

    // 3. GLOBAL PRE-LOAD & SYNC QUEUE (Offline Resilience)
    useEmployeeStore.getState().loadEmployees();
    useAttendanceStore.getState().processSyncQueue();
    useExpenseStore.getState().processSyncQueue();
  }, []);

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    logout();
    window.location.href = "/login";
  };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  const isOwner = realRole === "owner";
  const isAdmin = realRole === "admin";
  const isCashier = realRole === "cashier" || realRole === "kasir";

  const navItems = [];
  if (isOwner) {
    navItems.push(
      { path: "/dashboard", icon: "📊", label: "Dashboard" },
      { path: "/pos", icon: "💰", label: "Kasir" },
      { path: "/orders", icon: "📋", label: "Order" },
      { path: "/marketing-gallery", icon: "📸", label: "Gallery" }, // 🆕 Marketing Review
      { path: "/web-inbox", icon: "📩", label: "Inbox" },
      { path: "/expenses", icon: "💸", label: "Pengeluaran" },
      { path: "/products", icon: "📦", label: "Produk" },
      { path: "/employees", icon: "👥", label: "Karyawan" },
      { path: "/attendance", icon: "⏰", label: "Absensi" },
      { path: "/settings/data", icon: "💾", label: "Backup Data" },
    );
  } else if (isAdmin) {
    navItems.push(
      { path: "/pos", icon: "💰", label: "Kasir" },
      { path: "/orders", icon: "📋", label: "Order" },
      { path: "/marketing-gallery", icon: "📸", label: "Gallery" }, // 🆕 Marketing Review
      { path: "/web-inbox", icon: "📩", label: "Inbox" },
      { path: "/expenses", icon: "💸", label: "Pengeluaran" },
      { path: "/attendance", icon: "⏰", label: "Absensi" },
    );
  } else if (isCashier) {
    navItems.push(
      { path: "/pos", icon: "💰", label: "Kasir" },
      { path: "/orders", icon: "📋", label: "Order" },
      { path: "/marketing-gallery", icon: "📸", label: "Gallery" }, // 🆕 Opsional: Kasir juga bisa lihat?
      { path: "/attendance", icon: "⏰", label: "Absensi" },
    );
  } else {
    navItems.push({ path: "/orders", icon: "📋", label: "Order" });
  }

  return (
    <div className="main-layout">
      <div className="nav-sidebar">
        <div
          className="nav-brand"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2>🏢 JOGLO POS</h2>
            <p className="brand-version">v2.5</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="nav-user">
          <div className="user-avatar">{isOwner ? "👑" : "👤"}</div>
          <div className="user-info">
            <strong>{realUser?.name || "Loading..."}</strong>
            <span className="user-role">{realRole.toUpperCase()}</span>
          </div>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div
          style={{ padding: "0 16px 16px 16px", display: "flex", gap: "8px" }}
        >
          {isOwner && (
            <button
              onClick={lockSystem}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                width: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#ef4444",
                fontSize: "16px",
              }}
            >
              🔒
            </button>
          )}
          <button
            className="nav-logout"
            onClick={handleLogoutClick}
            style={{ flex: 1, margin: 0 }}
          >
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      )}
    </div>
  );
}
