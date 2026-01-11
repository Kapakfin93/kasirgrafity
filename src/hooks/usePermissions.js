/**
 * usePermissions Hook
 * Role-based access control helper
 */

import { useAuthStore } from '../stores/useAuthStore';

export function usePermissions() {
    const { currentUser, hasPermission, isOwner, isCashier } = useAuthStore();

    const canAccessDashboard = () => {
        return isOwner();
    };

    const canManageEmployees = () => {
        return isOwner();
    };

    const canViewOrders = () => {
        return hasPermission('view_orders') || isOwner();
    };

    const canUpdateOrderStatus = () => {
        return hasPermission('update_status') || isOwner();
    };

    const canProcessTransaction = () => {
        return hasPermission('transaction') || isOwner();
    };

    const canManageAttendance = () => {
        return isOwner();
    };

    const canViewReports = () => {
        return isOwner();
    };

    return {
        currentUser,
        canAccessDashboard,
        canManageEmployees,
        canViewOrders,
        canUpdateOrderStatus,
        canProcessTransaction,
        canManageAttendance,
        canViewReports,
        isOwner: isOwner(),
        isCashier: isCashier(),
    };
}
