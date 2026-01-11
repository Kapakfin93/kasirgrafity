/**
 * Description Builder for Transaction Items
 * SINGLE SOURCE OF TRUTH for all cart item descriptions
 * 
 * Rules:
 * 1. NO fallbacks like 'Satuan' or 'Unknown'
 * 2. Product name is MANDATORY - reject if missing
 * 3. Format: [Product Name] ([Variant/Specs]) + [Finishings]
 * 4. Output must be human-readable AND Supabase JSONB compatible
 */

/**
 * Build complete item description
 * @param {Object} params - Description parameters
 * @param {string} params.productName - REQUIRED product name
 * @param {string} params.pricingType - AREA, LINEAR, MATRIX, UNIT, UNIT_SHEET, MANUAL
 * @param {Object} params.specs - Variant specifications (dimensions, size, etc)
 * @param {Array<string>} params.finishingNames - Array of finishing names
 * @returns {string} Complete human-readable description
 * @throws {Error} If productName is missing
 */
export const buildItemDescription = ({ productName, pricingType, specs = {}, finishingNames = [] }) => {
    // STRICT VALIDATION: Product name is mandatory
    if (!productName || productName.trim() === '') {
        throw new Error('CRITICAL: Product name is required for description');
    }

    let variantPart = '';

    // Build variant/specs part based on pricing type
    switch (pricingType) {
        case 'AREA':
            // Format: "Flexi 280gr (2m x 3m)"
            if (specs.length && specs.width) {
                variantPart = `(${specs.length}m x ${specs.width}m)`;
            }
            break;

        case 'LINEAR':
            // Format: "Kain Lokal 90cm (5m)"
            if (specs.length) {
                variantPart = `(${specs.length}m)`;
            }
            break;

        case 'MATRIX':
            // Format: "Poster UV Albatros (A2 - 42x59cm)"
            if (specs.sizeKey && specs.dimensions) {
                variantPart = `(${specs.sizeKey} - ${specs.dimensions})`;
            } else if (specs.sizeKey) {
                variantPart = `(${specs.sizeKey})`;
            }
            break;

        case 'UNIT':
        case 'UNIT_SHEET':
            // Format: "Mug Keramik Custom" (no variant needed, name is descriptive)
            // Or: "HVS A3+ 100gr" (name already includes variant)
            variantPart = '';
            break;

        case 'MANUAL':
            // Format: "Biaya Desain" (simple, no variant)
            variantPart = '';
            break;

        default:
            // Unknown pricing type - still allow but log warning
            console.warn(`Unknown pricing type: ${pricingType}`);
            variantPart = '';
    }

    // Build base description
    let description = productName;
    if (variantPart) {
        description += ` ${variantPart}`;
    }

    // Append finishings if present
    if (finishingNames && finishingNames.length > 0) {
        const finishingText = finishingNames.join(', ');
        description += ` + ${finishingText}`;
    }

    return description;
};

/**
 * Validate and extract finishing names from finishings array
 * @param {Array} finishings - Array of finishing objects or strings
 * @returns {Array<string>} Array of finishing names
 */
export const extractFinishingNames = (finishings) => {
    if (!finishings || !Array.isArray(finishings)) {
        return [];
    }

    return finishings
        .map(f => {
            if (typeof f === 'string') return f;
            if (f && f.name) return f.name;
            return null;
        })
        .filter(Boolean);
};
