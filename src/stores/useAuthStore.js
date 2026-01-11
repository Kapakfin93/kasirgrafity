/**
 * Auth Store - Zustand
 * Simple PIN-based authentication for local app
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ROLES, STORAGE_KEYS } from '../core/constants';
import db, { getSetting } from '../data/db/schema';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            currentUser: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            // Actions
            loginOwner: async (pin) => {
                set({ loading: true, error: null });
                try {
                    const ownerPin = await getSetting('owner_pin');

                    if (pin !== ownerPin) {
                        throw new Error('PIN salah');
                    }

                    const user = {
                        id: 'owner',
                        name: 'Owner',
                        role: ROLES.OWNER.id,
                        permissions: ROLES.OWNER.permissions,
                    };

                    set({
                        currentUser: user,
                        isAuthenticated: true,
                        loading: false
                    });

                    return user;
                } catch (error) {
                    set({ error: error.message, loading: false });
                    throw error;
                }
            },

            loginEmployee: async (employeeId, pin) => {
                set({ loading: true, error: null });
                try {
                    const employee = await db.employees.get(employeeId);

                    if (!employee) {
                        throw new Error('Karyawan tidak ditemukan');
                    }

                    if (employee.status !== 'ACTIVE') {
                        throw new Error('Akun tidak aktif');
                    }

                    if (employee.pin !== pin) {
                        throw new Error('PIN salah');
                    }

                    const roleConfig = ROLES[employee.role];
                    const user = {
                        id: employee.id,
                        name: employee.name,
                        role: employee.role,
                        shift: employee.shift,
                        permissions: roleConfig?.permissions || [],
                    };

                    set({
                        currentUser: user,
                        isAuthenticated: true,
                        loading: false
                    });

                    return user;
                } catch (error) {
                    set({ error: error.message, loading: false });
                    throw error;
                }
            },

            logout: () => {
                set({
                    currentUser: null,
                    isAuthenticated: false,
                    error: null
                });
                // Force clear localStorage to ensure logout
                localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
            },

            hasPermission: (permission) => {
                const user = get().currentUser;
                if (!user) return false;

                // Owner has all permissions
                if (user.permissions.includes('all')) return true;

                return user.permissions.includes(permission);
            },

            isOwner: () => {
                const user = get().currentUser;
                return user?.role === ROLES.OWNER.id;
            },

            isCashier: () => {
                const user = get().currentUser;
                return user?.role === ROLES.CASHIER.id;
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: STORAGE_KEYS.AUTH_USER,
            partialize: (state) => ({
                currentUser: state.currentUser,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
