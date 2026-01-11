/**
 * StatsCard Component
 * WALL STREET EDITION - Clickable, Full Numbers, Ticker Style
 */

import React from 'react';

// Color mapping for glow effects
const colorVariants = {
    '#22c55e': { // Emerald/Green - Total Penjualan
        gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '#22c55e',
        glow: '0 0 40px rgba(34, 197, 94, 0.25), 0 4px 20px rgba(0,0,0,0.3)',
        textClass: 'glow-emerald'
    },
    '#3b82f6': { // Blue - Uang Terkumpul
        gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)',
        border: '#3b82f6',
        glow: '0 0 40px rgba(59, 130, 246, 0.25), 0 4px 20px rgba(0,0,0,0.3)',
        textClass: 'glow-blue'
    },
    '#f59e0b': { // Amber - Pending
        gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
        border: '#f59e0b',
        glow: '0 0 40px rgba(245, 158, 11, 0.25), 0 4px 20px rgba(0,0,0,0.3)',
        textClass: 'glow-amber'
    },
    '#8b5cf6': { // Purple - Ready
        gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '#8b5cf6',
        glow: '0 0 40px rgba(139, 92, 246, 0.25), 0 4px 20px rgba(0,0,0,0.3)',
        textClass: 'glow-purple'
    },
    '#f43f5e': { // Rose - Pengeluaran
        gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(225, 29, 72, 0.08) 100%)',
        border: '#f43f5e',
        glow: '0 0 40px rgba(244, 63, 94, 0.25), 0 4px 20px rgba(0,0,0,0.3)',
        textClass: 'glow-rose'
    },
    '#eab308': { // Gold/Yellow - Laba Bersih
        gradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.18) 0%, rgba(202, 138, 4, 0.10) 100%)',
        border: '#eab308',
        glow: '0 0 50px rgba(234, 179, 8, 0.30), 0 4px 25px rgba(0,0,0,0.3)',
        textClass: 'glow-gold'
    }
};

export function StatsCard({ icon, title, value, subtitle, color = '#3b82f6', onClick, isClickable }) {
    const variant = colorVariants[color] || colorVariants['#3b82f6'];

    return (
        <div
            className={`stats-card-wallstreet ${isClickable ? 'stats-card-clickable' : ''}`}
            style={{
                background: variant.gradient,
                borderLeft: `5px solid ${variant.border}`,
                boxShadow: variant.glow,
                cursor: isClickable ? 'pointer' : 'default'
            }}
            onClick={onClick}
        >
            {/* Animated shimmer overlay */}
            <div className="shimmer-overlay" />

            {/* Clickable indicator */}
            {isClickable && <div className="click-indicator">+ KLIK</div>}

            <div
                className="stats-icon-wallstreet"
                style={{
                    backgroundColor: color + '20',
                    color: color,
                    boxShadow: `0 0 25px ${color}40`
                }}
            >
                {icon}
            </div>
            <div className="stats-content-wallstreet">
                <div className="stats-title-wallstreet">{title}</div>
                <div
                    className={`stats-value-wallstreet ${variant.textClass}`}
                    style={{ color }}
                >
                    {value}
                </div>
                {subtitle && (
                    <div className="stats-subtitle-wallstreet">{subtitle}</div>
                )}
            </div>
        </div>
    );
}
