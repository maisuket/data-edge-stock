import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MovementType } from './enums/movement-type.enum';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateStockMovementDto, userId: string) {
    const {
      productId,
      type,
      quantity,
      description,
      entryPrice,
      batch,
      expiryDate,
      supplierId,
    } = createDto;

    return await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Produto não encontrado.');

      let newStock = new Prisma.Decimal(product.currentStock);
      let newCostPrice = new Prisma.Decimal(product.costPrice);
      const qtyDecimal = new Prisma.Decimal(quantity);

      switch (type) {
        case MovementType.ENTRY: {
          if (qtyDecimal.lte(0)) {
            throw new BadRequestException(
              'Quantidade de entrada deve ser positiva.',
            );
          }
          // Custo médio ponderado: ((EstoqueAtual * CustoAtual) + (QtdEntrada * CustoEntrada)) / (EstoqueAtual + QtdEntrada)
          if (entryPrice !== undefined && entryPrice !== null) {
            const entryPriceDecimal = new Prisma.Decimal(entryPrice);
            const currentTotalValue = newStock.mul(newCostPrice);
            const entryTotalValue = qtyDecimal.mul(entryPriceDecimal);
            const totalQuantity = newStock.add(qtyDecimal);

            newCostPrice = totalQuantity.gt(0)
              ? currentTotalValue.add(entryTotalValue).div(totalQuantity)
              : entryPriceDecimal;
          }
          newStock = newStock.add(qtyDecimal);
          break;
        }

        case MovementType.EXIT: {
          if (qtyDecimal.lte(0)) {
            throw new BadRequestException(
              'Quantidade de saída deve ser positiva.',
            );
          }
          // Na saída, o custo médio NÃO muda (princípio contábil)
          if (newStock.lt(qtyDecimal)) {
            throw new BadRequestException(
              `Estoque insuficiente para o produto "${product.name}". Tentativa de saída: ${quantity}. Atual: ${product.currentStock}.`,
            );
          }
          newStock = newStock.sub(qtyDecimal);
          break;
        }

        case MovementType.ADJUSTMENT: {
          // Ajuste pode ser positivo (acréscimo) ou negativo (redução de inventário)
          const resultingStock = newStock.add(qtyDecimal);
          if (resultingStock.lt(0)) {
            throw new BadRequestException(
              `Ajuste resultaria em estoque negativo (${resultingStock.toNumber()}).`,
            );
          }
          newStock = resultingStock;
          break;
        }
      }

      // Atualiza Produto (Novo Estoque + Novo Custo Médio)
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
          costPrice: newCostPrice,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type,
          quantity,
          stockBefore: product.currentStock,
          stockAfter: newStock,
          description,
          productId,
          userId,
          batch,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          unitValue:
            entryPrice !== undefined && entryPrice !== null
              ? new Prisma.Decimal(entryPrice)
              : product.costPrice,
          supplierId: type === MovementType.ENTRY ? (supplierId ?? null) : null,
        },
      });

      return movement;
    });
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
    productId?: string,
    type?: string,
  ) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [movements, itemCount] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, internalCode: true } },
          ingredient: { select: { name: true, unit: true } },
          user: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(movements, pageMetaDto);
  }
}
