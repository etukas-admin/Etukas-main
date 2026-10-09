export function lineTotals(priceMinor: number, quantity: number, taxRateBps: number, discountMinor = 0) {
  const subtotalMinor = priceMinor * quantity;
  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = Math.round((taxableMinor * taxRateBps) / 10000);
  return {
    subtotalMinor,
    taxMinor,
    discountMinor,
    totalMinor: taxableMinor + taxMinor
  };
}

export function formatMinor(amountMinor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amountMinor / 100);
}
