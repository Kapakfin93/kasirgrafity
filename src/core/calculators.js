/**
 * Calculators for Joglo POS V2.1
 * Pure functions for price calculation.
 * Returns { subtotal, breakdown }
 */

// 1. AREA LOGIC
export const calculateAreaPrice = (length, width, price, qty) => {
    // Rule: Min 1m²
    // Round up dimensions? The prompt said "Round up dims, Min 1m²".
    // Usually implies ceil(area) or ceil(L*W). 
    // Step 91 text: "Math.max(1, Math.ceil(L * W))"
    const rawArea = length * width;
    const billableArea = Math.max(1, Math.ceil(rawArea));
    const subtotal = billableArea * price * qty;

    return {
        subtotal,
        breakdown: `${length}x${width}m = ${rawArea.toFixed(2)}m² (Billable: ${billableArea}m²)`
    };
};

// 2. LINEAR LOGIC
export const calculateLinearPrice = (length, price, qty) => {
    // Pure linear: L * Price * Qty
    const subtotal = length * price * qty;

    return {
        subtotal,
        breakdown: `${length}m x Rp ${price.toLocaleString('id-ID')}`
    };
};

// 3. MATRIX LOGIC (Poster)
export const calculateMatrixPrice = (sizeKey, productPriceMatrix, qty) => {
    if (!productPriceMatrix || !productPriceMatrix[sizeKey]) {
        return { subtotal: 0, breakdown: 'Invalid Size' };
    }

    const unitPrice = productPriceMatrix[sizeKey];
    const subtotal = unitPrice * qty;

    return {
        subtotal,
        breakdown: `Size ${sizeKey} @ Rp ${unitPrice.toLocaleString('id-ID')}`
    };
};

// 4. UNIT_SHEET LOGIC (A3+)
// "base + cutting + finishing"
export const calculateUnitSheetPrice = (basePrice, cuttingCost, finishingCost, qty) => {
    const unitTotal = basePrice + cuttingCost + finishingCost;
    const subtotal = unitTotal * qty;

    return {
        subtotal,
        breakdown: `(Print ${basePrice} + Cut ${cuttingCost} + Fin ${finishingCost})`
    };
};

// 5. UNIT LOGIC (Merch/Office)
// "base + finishing"
export const calculateUnitPrice = (basePrice, finishingCost, qty) => {
    const unitTotal = basePrice + finishingCost;
    const subtotal = unitTotal * qty;

    return {
        subtotal,
        breakdown: `(Base ${basePrice} + Fin ${finishingCost})`
    };
};

// 6. MANUAL LOGIC
export const calculateManualPrice = (manualPrice, qty) => {
    const subtotal = manualPrice * qty;
    return {
        subtotal,
        breakdown: `Manual Price`
    };
};
