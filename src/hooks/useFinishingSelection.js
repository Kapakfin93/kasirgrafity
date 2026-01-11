/**
 * useFinishingSelection Hook
 * Reusable logic for finishing selection across configurators
 */

import { useState, useCallback } from 'react';

export function useFinishingSelection(initialFinishings = []) {
    const [selectedFinishings, setSelectedFinishings] = useState(initialFinishings);

    const toggleFinishing = useCallback((finishing) => {
        setSelectedFinishings(current => {
            const exists = current.find(f => f.id === finishing.id);

            if (exists) {
                // Remove finishing
                return current.filter(f => f.id !== finishing.id);
            } else {
                // Add finishing
                return [...current, finishing];
            }
        });
    }, []);

    const clearFinishings = useCallback(() => {
        setSelectedFinishings([]);
    }, []);

    const getTotalCost = useCallback(() => {
        return selectedFinishings.reduce((sum, f) => sum + f.price, 0);
    }, [selectedFinishings]);

    const getSelectedIds = useCallback(() => {
        return selectedFinishings.map(f => f.id);
    }, [selectedFinishings]);

    const isSelected = useCallback((finishingId) => {
        return selectedFinishings.some(f => f.id === finishingId);
    }, [selectedFinishings]);

    return {
        selectedFinishings,
        toggleFinishing,
        clearFinishings,
        getTotalCost,
        getSelectedIds,
        isSelected,
        setSelectedFinishings,
    };
}
