/**
 * Storage Utility
 * Wrapper for localStorage with error handling
 */

/**
 * Get item from localStorage
 */
export const getItem = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage: ${key}`, error);
        return defaultValue;
    }
};

/**
 * Set item in localStorage
 */
export const setItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error writing to localStorage: ${key}`, error);
        return false;
    }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing from localStorage: ${key}`, error);
        return false;
    }
};

/**
 * Clear all localStorage
 */
export const clear = () => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage', error);
        return false;
    }
};

/**
 * Get all keys from localStorage
 */
export const getAllKeys = () => {
    try {
        return Object.keys(localStorage);
    } catch (error) {
        console.error('Error getting localStorage keys', error);
        return [];
    }
};

/**
 * Check if key exists
 */
export const hasKey = (key) => {
    try {
        return localStorage.getItem(key) !== null;
    } catch (error) {
        console.error(`Error checking localStorage key: ${key}`, error);
        return false;
    }
};
