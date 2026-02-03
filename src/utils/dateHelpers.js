import {
  format,
  isValid,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  differenceInHours,
  isAfter,
  addMinutes,
} from "date-fns";
import { id } from "date-fns/locale";

// ==========================================
// 1. ROBUST FORMATTERS (Anti-Crash)
// ==========================================

export const formatDateTime = (
  dateString,
  formatStr = "dd MMM yyyy, HH:mm",
) => {
  if (!dateString) return "-";
  try {
    const date =
      typeof dateString === "string"
        ? parseISO(dateString)
        : new Date(dateString);
    if (!isValid(date)) return "-";
    return format(date, formatStr, { locale: id });
  } catch (error) {
    return "Error Date";
  }
};

export const formatDate = (dateString, formatStr = "dd MMMM yyyy") => {
  return formatDateTime(dateString, formatStr);
};

export const formatTime = (dateString) => {
  return formatDateTime(dateString, "HH:mm");
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date =
      typeof dateString === "string"
        ? parseISO(dateString)
        : new Date(dateString);
    if (!isValid(date)) return "-";

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Baru saja";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    return format(date, "dd MMM yyyy", { locale: id });
  } catch (e) {
    return "-";
  }
};

// ==========================================
// 2. ATTENDANCE HELPERS (Absensi)
// ==========================================

export const calculateWorkHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return { total: 0, formatted: "0 jam" };
  try {
    const start =
      typeof checkInTime === "string"
        ? parseISO(checkInTime)
        : new Date(checkInTime);
    const end =
      typeof checkOutTime === "string"
        ? parseISO(checkOutTime)
        : new Date(checkOutTime);
    if (!isValid(start) || !isValid(end))
      return { total: 0, formatted: "0 jam" };

    // Calculate diff in hours
    let diff = (end - start) / (1000 * 60 * 60);

    // FIX: Handle night shift (day crossing)
    // If check-out is "before" check-in, assume next day
    if (diff < 0) {
      diff += 24; // Add 24 hours (e.g., 20:00 to 04:00 = -16 hours + 24 = 8 hours)
    }

    const totalHours = diff > 0 ? Number(diff.toFixed(1)) : 0;
    const formatted = `${Math.floor(totalHours)} jam ${Math.round((totalHours % 1) * 60)} menit`;

    return {
      total: totalHours,
      formatted,
    };
  } catch (error) {
    return { total: 0, formatted: "0 jam" };
  }
};

export const getCurrentShift = () => {
  const hour = new Date().getHours();
  // Shift Pagi: 07:00 - 19:00 (Example)
  return hour >= 7 && hour < 19 ? "PAGI" : "MALAM";
};

export const isLateCheckIn = (
  checkInTime,
  shiftStartStr = "08:00",
  gracePeriodMins = 15,
) => {
  if (!checkInTime) return false;
  try {
    const checkIn =
      typeof checkInTime === "string"
        ? parseISO(checkInTime)
        : new Date(checkInTime);
    const [sh, sm] = shiftStartStr.split(":").map(Number);

    // Create shift start date object for today
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(sh, sm, 0, 0);

    const lateLimit = addMinutes(shiftStart, gracePeriodMins);
    return isAfter(checkIn, lateLimit);
  } catch (e) {
    return false;
  }
};

// ==========================================
// 3. DASHBOARD HELPERS (Owner)
// ==========================================

export const getDateRange = (rangeKey) => {
  const now = new Date();
  switch (rangeKey) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday":
      const yest = subDays(now, 1);
      return { start: startOfDay(yest), end: endOfDay(yest) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfDay(now),
      }; // Monday start
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};
