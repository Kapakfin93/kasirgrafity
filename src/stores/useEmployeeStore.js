/**
 * Employee Store - Zustand
 * State management for employee data
 */

import { create } from 'zustand';
import db from '../data/db/schema';
import { Employee } from '../data/models/Employee';

export const useEmployeeStore = create((set, get) => ({
    // State
    employees: [],
    currentEmployee: null,
    loading: false,
    error: null,

    // Actions
    loadEmployees: async () => {
        set({ loading: true, error: null });
        try {
            const employees = await db.employees.toArray();
            set({ employees: employees.map(e => Employee.fromDB(e)), loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    addEmployee: async (employeeData) => {
        set({ loading: true, error: null });
        try {
            const employee = new Employee(employeeData);
            const validation = employee.validate();

            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const id = await db.employees.add(employee.toJSON());
            employee.id = id;

            set(state => ({
                employees: [...state.employees, employee],
                loading: false
            }));

            return employee;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateEmployee: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updatedData = { ...updates, updatedAt: new Date().toISOString() };
            await db.employees.update(id, updatedData);

            set(state => ({
                employees: state.employees.map(emp =>
                    emp.id === id ? Employee.fromDB({ ...emp.toJSON(), ...updatedData }) : emp
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteEmployee: async (id) => {
        set({ loading: true, error: null });
        try {
            // Soft delete - set status to INACTIVE
            await db.employees.update(id, { status: 'INACTIVE' });

            set(state => ({
                employees: state.employees.map(emp =>
                    emp.id === id ? Employee.fromDB({ ...emp.toJSON(), status: 'INACTIVE' }) : emp
                ),
                loading: false
            }));
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    getActiveEmployees: () => {
        return get().employees.filter(emp => emp.status === 'ACTIVE');
    },

    getEmployeeById: (id) => {
        return get().employees.find(emp => emp.id === id);
    },

    getEmployeesByRole: (role) => {
        return get().employees.filter(emp => emp.role === role && emp.status === 'ACTIVE');
    },

    setCurrentEmployee: (employee) => {
        set({ currentEmployee: employee });
    },

    clearError: () => {
        set({ error: null });
    },
}));
