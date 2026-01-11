/**
 * Date Helper Utilities
 * Centralized date/time operations using date-fns
 */

import {
    format,
    parse,
    differenceInHours,
    differenceInMinutes,
    addHours,
    isAfter,
    isBefore,
    startOfDay,
    endOfDay,
    isWithinInterval
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * Format date to Indonesian locale
 */
export const formatDate = (date, formatStr = 'dd MMMM yyyy') => {
    return format(new Date(date), formatStr, { locale: localeId });
};

/**
 * Format time
 */
export const formatTime = (date, formatStr = 'HH:mm') => {
    return format(new Date(date), formatStr);
};

/**
 * Format datetime
 */
export const formatDateTime = (date) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: localeId });
};

/**
 * Parse time string to Date object (today's date with specified time)
 */
export const parseTimeToday = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Calculate work hours between check-in and check-out
 */
export const calculateWorkHours = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;

    return {
        hours,
        minutes,
        total: hours + (minutes / 60),
        formatted: `${hours}j ${minutes}m`
    };
};

/**
 * Check if time is late based on shift start and grace period
 */
export const isLateCheckIn = (checkInTime, shiftStart, gracePeriodMinutes) => {
    const checkIn = new Date(checkInTime);
    const start = parseTimeToday(shiftStart);
    const graceEnd = addHours(start, gracePeriodMinutes / 60);

    return isAfter(checkIn, graceEnd);
};

/**
 * Get current shift based on time
 */
export const getCurrentShift = (time = new Date()) => {
    const currentTime = format(time, 'HH:mm');
    const hour = time.getHours();

    // 07:00 - 19:00 = PAGI
    // 19:00 - 07:00 = MALAM
    return (hour >= 7 && hour < 19) ? 'PAGI' : 'MALAM';
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
    const today = new Date();
    const check = new Date(date);
    return check.toDateString() === today.toDateString();
};

/**
 * Get date range for reports
 */
export const getDateRange = (period) => {
    const now = new Date();

    switch (period) {
        case 'today':
            return {
                start: startOfDay(now),
                end: endOfDay(now)
            };
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            return {
                start: startOfDay(weekStart),
                end: endOfDay(now)
            };
        case 'month':
            const monthStart = new Date(now);
            monthStart.setDate(1);
            return {
                start: startOfDay(monthStart),
                end: endOfDay(now)
            };
        default:
            return {
                start: startOfDay(now),
                end: endOfDay(now)
            };
    }
};

/**
 * Check if date is within range
 */
export const isDateInRange = (date, start, end) => {
    return isWithinInterval(new Date(date), {
        start: new Date(start),
        end: new Date(end)
    });
};
