/**
 * Theme Store - Zustand
 * Manages dark/light mode with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
    persist(
        (set, get) => ({
            // Default to dark mode (Professional choice)
            isDarkMode: true,

            // Toggle theme
            toggleTheme: () => {
                const newValue = !get().isDarkMode;
                set({ isDarkMode: newValue });

                // Apply to document
                document.documentElement.setAttribute('data-theme', newValue ? 'dark' : 'light');
            },

            // Set specific theme
            setDarkMode: (value) => {
                set({ isDarkMode: value });
                document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
            },

            // Initialize theme on app load
            initTheme: () => {
                const isDark = get().isDarkMode;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            }
        }),
        {
            name: 'joglo-pos-theme', // localStorage key
        }
    )
);
