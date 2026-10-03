export function formatBRL(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function computeDiscount(oldPrice: number | null | undefined, currentPrice: number | null | undefined) {
  if (!oldPrice || !currentPrice || oldPrice <= currentPrice || oldPrice <= 0) return null;
  return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
}
