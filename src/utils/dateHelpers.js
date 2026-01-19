import { format, isValid, parseISO } from "date-fns";
import { id } from "date-fns/locale"; // Ensure Indonesian locale is used

export const formatDateTime = (
  dateString,
  formatStr = "dd MMM yyyy, HH:mm",
) => {
  // 1. Guard Clause: Handle null/undefined
  if (!dateString) return "-";

  try {
    // 2. Normalize Input: Force string parsing or Date object
    const date =
      typeof dateString === "string"
        ? parseISO(dateString)
        : new Date(dateString);

    // 3. Check Validity: Is it a real date?
    if (!isValid(date)) {
      console.warn("Invalid date detected:", dateString);
      return "-"; // Return Safe Fallback instead of Crashing
    }

    // 4. Format Safely
    return format(date, formatStr, { locale: id });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Error Date";
  }
};

export const formatDate = (dateString, formatStr = "dd MMMM yyyy") => {
  return formatDateTime(dateString, formatStr);
};

export const formatTime = (dateString) => {
  return formatDateTime(dateString, "HH:mm");
};

// Helper relative time (e.g., "2 jam yang lalu")
export const formatRelativeTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date =
      typeof dateString === "string"
        ? parseISO(dateString)
        : new Date(dateString);
    if (!isValid(date)) return "-";

    // Simple manual implementation or use formatDistanceToNow
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
