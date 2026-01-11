/**
 * ThemeToggle Component
 * Sun/Moon toggle for dark/light mode
 */

import React from 'react';
import { useThemeStore } from '../stores/useThemeStore';

export function ThemeToggle() {
    const { isDarkMode, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
                background: isDarkMode
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: isDarkMode
                    ? '2px solid #475569'
                    : '2px solid #fbbf24',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'all 0.3s ease',
                boxShadow: isDarkMode
                    ? '0 0 15px rgba(71, 85, 105, 0.3)'
                    : '0 0 15px rgba(251, 191, 36, 0.4)'
            }}
        >
            {isDarkMode ? '🌙' : '☀️'}
        </button>
    );
}
