export const formatRupiah = (amount) => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

export const formatDimensions = (length, width) => {
  if (length && width) return `${length}m x ${width}m`;
  if (length) return `${length}m`;
  return "-";
};

// Smart currency formatter
export const formatCurrencyInput = (value) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(digits, 10));
};

export const parseCurrencyInput = (formattedValue) => {
  return parseInt(formattedValue.replace(/\D/g, ""), 10) || 0;
};
