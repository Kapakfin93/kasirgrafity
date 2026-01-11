/**
 * MainLayout Component
 * Layout with navigation sidebar
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { usePermissions } from '../hooks/usePermissions';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function MainLayout() {
    const location = useLocation();
    const { currentUser, logout } = useAuthStore();
    const { isOwner, isCashier } = usePermissions();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutModal(false);
        logout();
        // Small delay to ensure localStorage is cleared before reload
        setTimeout(() => {
            window.location.href = '/';
        }, 100);
    };

    const handleLogoutCancel = () => {
        setShowLogoutModal(false);
    };

    // Navigation items based on role
    const navItems = [];

    if (isOwner) {
        navItems.push(
            { path: '/dashboard', icon: '📊', label: 'Dashboard' },
            { path: '/pos', icon: '💰', label: 'Kasir' },
            { path: '/orders', icon: '📋', label: 'Order' },
            { path: '/products', icon: '📦', label: 'Produk' },
            { path: '/employees', icon: '👥', label: 'Karyawan' },
            { path: '/attendance', icon: '⏰', label: 'Absensi' },
            { path: '/settings/data', icon: '💾', label: 'Backup Data' }
        );
    } else if (isCashier) {
        navItems.push(
            { path: '/pos', icon: '💰', label: 'Kasir' },
            { path: '/orders', icon: '📋', label: 'Order' },
            { path: '/attendance', icon: '⏰', label: 'Absensi' }
        );
    } else {
        navItems.push(
            { path: '/orders', icon: '📋', label: 'Order' },
            { path: '/attendance', icon: '⏰', label: 'Absensi' }
        );
    }

    return (
        <div className="main-layout">
            {/* Navigation Sidebar */}
            <div className="nav-sidebar">
                {/* Brand */}
                <div className="nav-brand">
                    <h2>🏢 JOGLO POS</h2>
                    <p className="brand-version">v2.4</p>
                </div>

                {/* User Info */}
                <div className="nav-user">
                    <div className="user-avatar">
                        {isOwner ? '👑' : isCashier ? '💰' : '🔨'}
                    </div>
                    <div className="user-info">
                        <strong>{currentUser?.name}</strong>
                        <span className="user-role">{currentUser?.role}</span>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="nav-links">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Logout Button */}
                <button className="nav-logout" onClick={handleLogoutClick}>
                    <span className="nav-icon">🚪</span>
                    <span className="nav-label">Logout</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="main-content">
                <Outlet />
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <LogoutConfirmModal
                    onConfirm={handleLogoutConfirm}
                    onCancel={handleLogoutCancel}
                />
            )}
        </div>
    );
}
