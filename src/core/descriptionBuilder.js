// src/core/descriptionBuilder.js
export const extractFinishingNames = (finishings) => {
  if (!finishings || finishings.length === 0) return [];
  return finishings.map((f) => f.name).filter(Boolean);
};

export const buildItemDescription = ({
  productName,
  pricingType,
  specs,
  finishingNames,
}) => {
  let parts = [];
  if (specs) {
    if (specs.length && specs.width)
      parts.push(`${specs.length}x${specs.width}m`);
    else if (specs.length) parts.push(`${specs.length}m`);
    if (specs.sizeKey) parts.push(specs.sizeKey);
    if (specs.variantLabel) parts.push(specs.variantLabel);
  }
  if (finishingNames?.length) parts.push(`Fin: ${finishingNames.join(", ")}`);
  return parts.length ? `${productName} (${parts.join(" | ")})` : productName;
};
