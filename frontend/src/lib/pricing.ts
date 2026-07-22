/**
 * Espelha a mesma regra do backend (resolveUnitPrice em
 * backend/src/price-tiers/resolve-unit-price.ts): usa o preço da faixa de
 * maior quantidade mínima que a quantidade pedida atinge, ou o preço normal
 * se a promoção estiver desligada ou nenhuma faixa se aplicar. O backend
 * nunca confia nesse valor — é só para a prévia (cardápio e PDV) já
 * mostrar o valor correto antes de confirmar o pedido/venda.
 */
export function getUnitPriceForQuantity(
  product: {
    salePrice?: number | null;
    tieredPricingEnabled?: boolean;
    priceTiers?: { minQuantity: number; unitPrice: number }[];
  },
  quantity: number,
): number {
  const basePrice = product.salePrice ?? 0;
  if (
    !product.tieredPricingEnabled ||
    !product.priceTiers ||
    product.priceTiers.length === 0
  )
    return basePrice;

  const applicable = product.priceTiers
    .filter((t) => quantity >= t.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  return applicable ? applicable.unitPrice : basePrice;
}
