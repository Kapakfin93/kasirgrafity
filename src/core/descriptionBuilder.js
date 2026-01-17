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
export const buildItemDescription = ({
  productName,
  pricingType,
  specs = {},
  finishingNames = [],
}) => {
  // STRICT VALIDATION: Product name is mandatory
  if (!productName || productName.trim() === "") {
    throw new Error("CRITICAL: Product name is required for description");
  }

  let variantPart = "";

  // Build variant/specs part based on pricing type
  switch (pricingType) {
    case "AREA": {
      // Format: "Flexi 280gr (2m x 3m)" or "CETAK SPANDUK - Flexi 280gr (2m x 3m)"
      let areaPart = "";
      if (specs.length && specs.width) {
        areaPart = `(${specs.length}m x ${specs.width}m)`;
      }
      // Include variant label if available
      if (specs.variantLabel) {
        variantPart = `${specs.variantLabel} ${areaPart}`;
      } else {
        variantPart = areaPart;
      }
      break;
    }

    case "LINEAR": {
      // Format: "Kain Lokal 90cm (5m)" or "Vinyl White 100cm (3m)"
      let linearPart = "";
      if (specs.length) {
        linearPart = `(${specs.length}m)`;
      }
      // Include variant label if available
      if (specs.variantLabel) {
        variantPart = `${specs.variantLabel} ${linearPart}`;
      } else {
        variantPart = linearPart;
      }
      break;
    }

    case "MATRIX": {
      // Format: "CETAK POSTER (UV Print) - A2 - Albatros (Matte)"
      // Format fallback: "CETAK POSTER (UV Print) (A2)" if no material
      if (specs.sizeKey && specs.material) {
        // Extract size from sizeKey (e.g., "A2 (42 x 60 cm)" → "A2")
        const sizeOnly = specs.sizeKey.split(" ")[0]; // Get first word
        variantPart = `${sizeOnly} - ${specs.material}`;
      } else if (specs.sizeKey) {
        variantPart = `(${specs.sizeKey})`;
      }
      break;
    }

    case "UNIT":
    case "UNIT_SHEET":
      // Format: "Mug Keramik Custom" or "DISPLAY SYSTEM - X-Banner"
      // Include variant label if available (for products with specific variants)
      if (specs.variantLabel) {
        variantPart = specs.variantLabel;
      } else {
        variantPart = "";
      }
      break;

    case "MANUAL":
      // Format: "Biaya Desain" (simple, no variant)
      variantPart = "";
      break;

    default:
      // Unknown pricing type - still allow but log warning
      console.warn(`Unknown pricing type: ${pricingType}`);
      variantPart = "";
  }

  // Build base description
  let description = productName;
  if (variantPart) {
    description += ` ${variantPart}`;
  }

  // Append finishings if present
  if (finishingNames && finishingNames.length > 0) {
    const finishingText = finishingNames.join(", ");
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
    .map((f) => {
      if (typeof f === "string") return f;
      if (f && f.name) return f.name;
      return null;
    })
    .filter(Boolean);
};
