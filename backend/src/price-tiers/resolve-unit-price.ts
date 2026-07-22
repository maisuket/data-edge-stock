import { Prisma } from '@prisma/client';

/**
 * Resolve o preço unitário efetivo para uma quantidade pedida, considerando
 * a promoção por quantidade (price tiers) do produto quando ligada.
 * Usado tanto em orders.service.ts (cardápio) quanto em sales.service.ts (PDV)
 * para garantir que os dois fluxos apliquem a mesma regra de preço.
 */
export function resolveUnitPrice(
  product: {
    salePrice: Prisma.Decimal | null;
    tieredPricingEnabled: boolean;
  },
  tiers: { minQuantity: Prisma.Decimal; unitPrice: Prisma.Decimal }[],
  quantity: Prisma.Decimal,
): Prisma.Decimal | null {
  if (product.tieredPricingEnabled && tiers.length > 0) {
    let best: { minQuantity: Prisma.Decimal; unitPrice: Prisma.Decimal } | null =
      null;

    for (const tier of tiers) {
      if (
        quantity.gte(tier.minQuantity) &&
        (!best || tier.minQuantity.gt(best.minQuantity))
      ) {
        best = tier;
      }
    }

    if (best) return best.unitPrice;
  }

  return product.salePrice;
}
