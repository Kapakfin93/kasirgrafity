export function buildWAMessage(draftOrCart) {
  // Normalize Inputs (Flexible for Draft Object or Cart State)
  const items = draftOrCart.items_json?.items || draftOrCart.items || [];

  // Name Priority: Draft.customer_name > Cart.customerSnapshot.name > 'Pelanggan'
  const name =
    draftOrCart.customer_name || draftOrCart.customer?.name || "Pelanggan";

  // Total Priority: Draft.total_amount > Cart.totalAmount > 0
  // Handle nested total object structure locally if passed raw
  let totalRaw = draftOrCart.total_amount || draftOrCart.total || 0;
  if (typeof totalRaw === "object" && totalRaw !== null) {
    totalRaw = totalRaw.finalAmount || 0;
  }
  const total = Number(totalRaw);

  const formatRupiahHelper = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  let msg = `*ESTIMASI BIAYA - JOGLO PRINTING*\n\n`;
  msg += `Kepada: ${name}\n`;
  msg += `--------------------------------\n`;
  items.forEach((item) => {
    // Handle Item Price (Draft uses totalPrice, Cart uses totalPrice - assuming consistency)
    const price = item.totalPrice || 0;
    const productName = item.productName || item.name || "Produk";
    msg += `- ${productName} (${item.qty}x) : ${formatRupiahHelper(price)}\n`;

    // Detail spesifikasi (Minimal: variantLabel > specs.summary)
    const spec = item.variantLabel || item.specs?.summary || null;
    if (spec) msg += `  📐 ${spec}\n`;
  });
  msg += `--------------------------------\n`;
  msg += `*TOTAL ESTIMASI: ${formatRupiahHelper(total)}*\n\n`;
  msg += `_Note: Harga dapat berubah sewaktu-waktu._`;

  return msg;
}
