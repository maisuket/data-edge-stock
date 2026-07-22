import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetPriceTiersDto } from './dto/set-price-tiers.dto';

@Injectable()
export class PriceTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPriceTiers(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Produto ${productId} não encontrado.`);
    }

    const tiers = await this.prisma.priceTier.findMany({
      where: { productId },
      orderBy: { minQuantity: 'asc' },
    });

    return {
      productId,
      enabled: product.tieredPricingEnabled,
      salePrice: product.salePrice ? product.salePrice.toNumber() : null,
      tiers: tiers.map((t) => ({
        id: t.id,
        minQuantity: t.minQuantity.toNumber(),
        unitPrice: t.unitPrice.toNumber(),
      })),
    };
  }

  /** Substitui inteiramente as faixas de um produto e liga/desliga a promoção. */
  async setPriceTiers(productId: string, dto: SetPriceTiersDto) {
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(`Produto ${productId} não encontrado.`);
      }

      const minQuantities = dto.tiers.map((t) => t.minQuantity);
      if (new Set(minQuantities).size !== minQuantities.length) {
        throw new BadRequestException(
          'Não é possível repetir a mesma quantidade mínima em duas faixas.',
        );
      }

      if (dto.enabled && dto.tiers.length === 0) {
        throw new BadRequestException(
          'Cadastre ao menos uma faixa de quantidade para ativar a promoção.',
        );
      }

      await tx.priceTier.deleteMany({ where: { productId } });

      if (dto.tiers.length > 0) {
        await tx.priceTier.createMany({
          data: dto.tiers.map((t) => ({
            productId,
            minQuantity: t.minQuantity,
            unitPrice: t.unitPrice,
          })),
        });
      }

      await tx.product.update({
        where: { id: productId },
        data: { tieredPricingEnabled: dto.enabled },
      });
    });

    return this.getPriceTiers(productId);
  }
}
