/**
 * Attendance Store - Zustand
 * State management for attendance tracking
 */

import { create } from 'zustand';
import db from '../data/db/schema';
import { Attendance } from '../data/models/Attendance';
import { calculateWorkHours, isLateCheckIn, getCurrentShift } from '../utils/dateHelpers';
import { SHIFT_CONFIG } from '../core/constants';

export const useAttendanceStore = create((set, get) => ({
    // State
    attendances: [],
    todayAttendances: [],
    loading: false,
    error: null,

    // Actions
    loadTodayAttendances: async () => {
        set({ loading: true, error: null });
        try {
            const today = new Date().toISOString().split('T')[0];
            const attendances = await db.attendance
                .where('date')
                .equals(today)
                .toArray();

            set({
                todayAttendances: attendances.map(a => Attendance.fromDB(a)),
                loading: false
            });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    loadAttendancesByDateRange: async (startDate, endDate) => {
        set({ loading: true, error: null });
        try {
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];

            const attendances = await db.attendance
                .where('date')
                .between(start, end, true, true)
                .toArray();

            set({
                attendances: attendances.map(a => Attendance.fromDB(a)),
                loading: false
            });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    checkIn: async (employeeId, employeeName, shift = null) => {
        set({ loading: true, error: null });
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentShift = shift || getCurrentShift(now);

            // Check if already checked in today
            const existing = await db.attendance
                .where(['employeeId', 'date'])
                .equals([employeeId, today])
                .first();

            if (existing) {
                throw new Error('Sudah melakukan check-in hari ini');
            }

            // Determine if late
            const shiftConfig = SHIFT_CONFIG[currentShift];
            const isLate = isLateCheckIn(now, shiftConfig.start, shiftConfig.gracePeriod);

            const attendance = new Attendance({
                employeeId,
                employeeName,
                date: today,
                shift: currentShift,
                status: isLate ? 'LATE' : 'PRESENT',
                checkInTime: now.toISOString(),
            });

            const id = await db.attendance.add(attendance.toJSON());
            attendance.id = id;

            set(state => ({
                todayAttendances: [...state.todayAttendances, attendance],
                loading: false
            }));

            return attendance;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    checkOut: async (attendanceId) => {
        set({ loading: true, error: null });
        try {
            const attendance = await db.attendance.get(attendanceId);
            if (!attendance) {
                throw new Error('Attendance record not found');
            }

            if (attendance.checkOutTime) {
                throw new Error('Sudah melakukan check-out');
            }

            const now = new Date();
            const workHours = calculateWorkHours(attendance.checkInTime, now);

            await db.attendance.update(attendanceId, {
                checkOutTime: now.toISOString(),
                totalHours: workHours.total
            });

            set(state => ({
                todayAttendances: state.todayAttendances.map(att =>
                    att.id === attendanceId
                        ? Attendance.fromDB({
                            ...att.toJSON(),
                            checkOutTime: now.toISOString(),
                            totalHours: workHours.total
                        })
                        : att
                ),
                loading: false
            }));

            return workHours;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    getAttendanceByEmployee: async (employeeId, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return await db.attendance
            .where(['employeeId', 'date'])
            .equals([employeeId, dateStr])
            .first();
    },

    getTodayAttendanceByEmployee: (employeeId) => {
        return get().todayAttendances.find(att => att.employeeId === employeeId);
    },

    clearError: () => {
        set({ error: null });
    },
}));
