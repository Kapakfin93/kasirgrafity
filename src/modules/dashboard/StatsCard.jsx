/**
 * StatsCard Component
 * Reusable card for displaying statistics
 */

import React from 'react';

export function StatsCard({ icon, title, value, subtitle, color = '#3b82f6' }) {
    return (
        <div className="stats-card" style={{ borderLeftColor: color }}>
            <div className="stats-card-icon" style={{ backgroundColor: color + '20', color }}>
                {icon}
            </div>
            <div className="stats-card-content">
                <div className="stats-card-title">{title}</div>
                <div className="stats-card-value">{value}</div>
                {subtitle && <div className="stats-card-subtitle">{subtitle}</div>}
            </div>
        </div>
    );
}
