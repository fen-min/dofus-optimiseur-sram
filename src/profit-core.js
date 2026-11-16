// OMBRE — calculs de bénéfices DOFUS, indépendants du navigateur.
export const asPositive = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
export const asWhole = value => Math.floor(asPositive(value));
export const taxRatio = value => Math.min(100, asPositive(value)) / 100;

export function calculateCraft({quantity = 0, saleUnit = 0, taxPercent = 2, ingredients = []} = {}) {
  const count = asWhole(quantity);
  const price = asPositive(saleUnit);
  const tax = taxRatio(taxPercent);
  const rows = ingredients.slice(0, 8).map(item => {
    const qty = asPositive(item?.perCraft);
    const costUnit = asPositive(item?.costUnit);
    const resaleUnit = asPositive(item?.resaleUnit);
    return {name: String(item?.name || ""), perCraft: qty, costUnit, resaleUnit,
      costPerCraft: qty * costUnit, resalePerCraft: qty * resaleUnit};
  });
  const costPerCraft = rows.reduce((sum, item) => sum + item.costPerCraft, 0);
  const gross = price * count;
  const fees = gross * tax;
  const costs = costPerCraft * count;
  const netRevenue = gross - fees;
  const profit = netRevenue - costs;
  const rawSaleComplete = rows.filter(row => row.perCraft > 0).every((row, index) => {
    const original = ingredients[index];
    return original?.resaleUnit !== "" && original?.resaleUnit !== undefined && original?.resaleUnit !== null;
  });
  const rawSaleNet = rawSaleComplete
    ? rows.reduce((sum, row) => sum + row.resalePerCraft, 0) * count * (1 - tax)
    : null;
  const breakEven = tax < 1 ? costPerCraft / (1 - tax) : (costPerCraft === 0 ? 0 : null);
  return {count, price, costPerCraft, gross, fees, costs, netRevenue, profit,
    profitPerItem: count ? profit / count : 0, breakEven,
    rawSaleNet, differenceVsRawSale: rawSaleNet === null ? null : netRevenue - rawSaleNet, rows};
}

export function calculateListing(item = {}, taxPercent = 2) {
  const lotSize = [1, 10, 100, 1000].includes(Number(item.lotSize)) ? Number(item.lotSize) : 1;
  const lotPrice = asPositive(item.lotPrice);
  const units = asWhole(item.units);
  const costUnit = asPositive(item.costUnit);
  const saleUnit = lotPrice / lotSize;
  const gross = saleUnit * units;
  const fees = gross * taxRatio(taxPercent);
  const costs = costUnit * units;
  return {name: String(item.name || ""), lotSize, lotPrice, units, costUnit,
    saleUnit, gross, fees, costs, netRevenue: gross - fees, profit: gross - fees - costs,
    profitUnit: saleUnit * (1 - taxRatio(taxPercent)) - costUnit};
}

export function calculateListings(items = [], taxPercent = 2) {
  const rows = items.slice(0, 8).map(item => calculateListing(item, taxPercent));
  return {rows, units: rows.reduce((sum, row) => sum + row.units, 0),
    gross: rows.reduce((sum, row) => sum + row.gross, 0),
    fees: rows.reduce((sum, row) => sum + row.fees, 0),
    costs: rows.reduce((sum, row) => sum + row.costs, 0),
    profit: rows.reduce((sum, row) => sum + row.profit, 0)};
}
