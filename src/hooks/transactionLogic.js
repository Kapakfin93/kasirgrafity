import {
  calculateAreaPrice,
  calculateLinearPrice,
  calculateUnitSheetPrice,
  calculateUnitPrice,
} from "../core/calculators";

/**
 * calculateFinishingCost - Helper to sum up finishing prices
 * @param {Array} finishings - Array of finishing objects
 * @param {number} multiplier - Multiplier for linear/area based finishings (default 1)
 */
export const calculateFinishingCost = (finishings, multiplier = 1) => {
  if (!finishings || finishings.length === 0) return 0;
  return finishings.reduce(
    (total, f) => total + (f.price || 0) * multiplier,
    0,
  );
};

/**
 * getTieredPrice - Helper for wholesale rules lookup
 */
export const getTieredPrice = (quantity, product) => {
  if (!product?.calc_engine || product.calc_engine !== "TIERED") return null;
  if (!product?.advanced_features?.wholesale_rules) return null;

  const tier = product.advanced_features.wholesale_rules.find(
    (rule) => quantity >= rule.min && quantity <= rule.max,
  );

  return tier?.price || product.base_price || product.price || 0;
};

/**
 * calculatePriceByLogic - UNIFIED PRICING ENGINE
 * Consolidates all pricing logic from buildCartItem and calculateItemPrice
 *
 * @param {Object} params
 * @param {string} params.mode - Pricing mode (AREA, LINEAR, MATRIX, etc.)
 * @param {Object} params.product - Product object
 * @param {number} params.qty - Quantity
 * @param {Object} params.dimensions - Dimensions object (length, width, sizeKey, etc.)
 * @param {Array} params.finishings - Selected finishings
 * @param {number} params.manualPrice - Manual input price
 * @returns {Object} { subtotal, unitPrice, breakdown }
 */
export const calculatePriceByLogic = ({
  mode,
  product,
  qty,
  dimensions = {},
  finishings = [],
  manualPrice = 0,
}) => {
  const safeQty = Number.parseInt(qty) || 1;
  let subtotal = 0;
  let unitPrice = 0;
  let breakdown = "";

  // Common Finishing Cost (Base)
  const baseFinishingCost = calculateFinishingCost(finishings);

  try {
    switch (mode) {
      case "AREA": {
        const areaPrice = Number.parseFloat(product?.price) || 0;
        const areaLen = Number.parseFloat(dimensions.length) || 0;
        const areaWid = Number.parseFloat(dimensions.width) || 0;

        if (areaLen > 0 && areaWid > 0) {
          const areaResult = calculateAreaPrice(
            areaLen,
            areaWid,
            areaPrice,
            safeQty,
          );

          if (!areaResult || Number.isNaN(areaResult.subtotal)) {
            throw new Error("Hasil perhitungan AREA invalid");
          }

          subtotal = areaResult.subtotal + baseFinishingCost * safeQty;
          unitPrice = subtotal / safeQty;
          breakdown = areaResult.breakdown;
        }
        break;
      }

      case "LINEAR": {
        const linPrice = Number.parseFloat(product?.price) || 0;
        const linLen = Number.parseFloat(dimensions.length) || 0;

        // GEN 2: Variant-based Linear (Stiker Meteran)
        if (product?.calc_engine === "ROLLS" && dimensions.selectedVariant) {
          const variantPrice = dimensions.selectedVariant.price_per_meter || 0;
          if (linLen > 0) {
            const basePrice = linLen * variantPrice;
            const linearFinishingCost = calculateFinishingCost(
              finishings,
              linLen,
            ); // Fin cost per meter? Or total?
            // Note: Logic in original was calculateFinishingCost(finishings, lengthVal).

            subtotal = (basePrice + linearFinishingCost) * safeQty;
            unitPrice = subtotal / safeQty;
          }
        }
        // Legacy Linear
        else if (linLen > 0) {
          const linResult = calculateLinearPrice(linLen, linPrice, safeQty);
          if (!linResult || Number.isNaN(linResult.subtotal))
            throw new Error("Hasil perhitungan LINEAR invalid");

          subtotal = linResult.subtotal + baseFinishingCost * safeQty;
          unitPrice = subtotal / safeQty;
        }
        break;
      }

      case "MATRIX": {
        const sizeKey = dimensions.sizeKey;
        const material = dimensions.material;
        let priceForSize = 0;

        // 1. NEW Format (variants[].price_list)
        if (product?.variants?.length > 0) {
          const selectedVariant = product.variants.find((v) =>
            v.label.includes(sizeKey),
          );
          if (selectedVariant?.price_list && material) {
            priceForSize = selectedVariant.price_list[material];
          }
        }

        // 2. Legacy Format (product.prices)
        if (!priceForSize && product?.prices && sizeKey) {
          priceForSize = product.prices[sizeKey];
        }

        if (priceForSize > 0) {
          // Use core calculator if possible, or direct math
          // Core calculator `calculateMatrixPrice` takes (sizeKey, priceList, qty) - messy for New Format.
          // Simplified math:
          subtotal = priceForSize * safeQty + baseFinishingCost * safeQty;
          unitPrice = priceForSize + baseFinishingCost;
        }
        break;
      }

      case "BOOKLET": {
        const { variantLabel, printModeId, sheetsPerBook } = dimensions;
        if (sheetsPerBook > 0) {
          let paperPrice = 0;
          // Paper Price from Variant
          if (product?.variants) {
            const v = product.variants.find((v) => v.label === variantLabel);
            if (v?.price) paperPrice = Number.parseFloat(v.price) || 0;
          }
          if (paperPrice === 0)
            paperPrice = Number.parseFloat(product.base_price) || 0;

          let printPrice = 0;
          // Print Price from print_modes
          if (product?.print_modes && printModeId) {
            const m = product.print_modes.find((m) => m.id === printModeId);
            if (m) printPrice = Number.parseFloat(m.price) || 0;
          }

          const contentCost = (paperPrice + printPrice) * sheetsPerBook;

          // Booklet Specific Finishing (PER_JOB vs PER_UNIT handled in loop)
          let finishingPerBook = 0;
          finishings.forEach((f) => {
            if (f.price_mode === "PER_JOB") finishingPerBook += f.price || 0;
            else finishingPerBook += (f.price || 0) * sheetsPerBook;
          });

          const totalPerBook = contentCost + finishingPerBook;
          subtotal = totalPerBook * safeQty;
          unitPrice = totalPerBook;
        }
        break;
      }

      case "UNIT":
      case "TIERED": {
        // TIERED CHECK
        if (product?.calc_engine === "TIERED") {
          const tierPrice = getTieredPrice(safeQty, product);
          if (tierPrice) {
            subtotal = tierPrice * safeQty + baseFinishingCost * safeQty;
            unitPrice = tierPrice + baseFinishingCost;
            break;
          }
        }

        // Plain UNIT
        const uPrice = Number.parseFloat(product?.price) || 0;
        const unitResult = calculateUnitPrice(
          uPrice,
          baseFinishingCost,
          safeQty,
        );
        subtotal = unitResult.subtotal;
        unitPrice = unitResult.subtotal / safeQty;
        break;
      }

      case "UNIT_SHEET": {
        const uPrice = Number.parseFloat(product?.price) || 0;
        const cuttingCost = dimensions?.cuttingCost || 0;

        const sheetResult = calculateUnitSheetPrice(
          uPrice,
          cuttingCost,
          baseFinishingCost,
          safeQty,
        );
        subtotal = sheetResult.subtotal;
        unitPrice = sheetResult.subtotal / safeQty;
        break;
      }

      case "MANUAL": {
        const manPrice = Number.parseFloat(manualPrice) || 0;
        if (manPrice > 0) {
          // Manual usually includes everything, OR we add finishing?
          // Existing logic: subtotal = manPrice * qty + finishingCost * qty
          subtotal = manPrice * safeQty + baseFinishingCost * safeQty;
          unitPrice = manPrice; // + finishing? Logic in buildCartItem says unitPrice = inputManualPrice
        }
        break;
      }

      case "ADVANCED": {
        const advancedTotal = dimensions.total_price;
        const advancedUnitPrice = dimensions.unit_price_final;

        if (advancedTotal > 0) {
          subtotal = advancedTotal;
          unitPrice = advancedUnitPrice;
        }
        break;
      }

      default:
        console.warn("Unknown pricing mode:", mode);
    }
  } catch (err) {
    console.error(`Error calculating price for ${mode}:`, err);
    throw err;
  }

  // Final Safety Checks
  if (Number.isNaN(subtotal)) subtotal = 0;
  if (Number.isNaN(unitPrice)) unitPrice = 0;

  return { subtotal, unitPrice, breakdown };
};
