import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
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

      let newStock = product.currentStock;
      let newCostPrice = product.costPrice;

      switch (type) {
        case MovementType.ENTRY: {
          if (quantity <= 0) {
            throw new BadRequestException('Quantidade de entrada deve ser positiva.');
          }
          // Custo médio ponderado: ((EstoqueAtual * CustoAtual) + (QtdEntrada * CustoEntrada)) / (EstoqueAtual + QtdEntrada)
          if (entryPrice !== undefined && entryPrice !== null) {
            const currentTotalValue = product.currentStock * product.costPrice;
            const entryTotalValue = quantity * entryPrice;
            const totalQuantity = product.currentStock + quantity;
            newCostPrice =
              totalQuantity > 0
                ? (currentTotalValue + entryTotalValue) / totalQuantity
                : entryPrice;
          }
          newStock += quantity;
          break;
        }

        case MovementType.EXIT: {
          if (quantity <= 0) {
            throw new BadRequestException('Quantidade de saída deve ser positiva.');
          }
          // Na saída, o custo médio NÃO muda (princípio contábil)
          if (product.currentStock < quantity) {
            throw new BadRequestException('Estoque insuficiente.');
          }
          newStock -= quantity;
          break;
        }

        case MovementType.ADJUSTMENT: {
          // Ajuste pode ser positivo (acréscimo) ou negativo (redução de inventário)
          const resultingStock = product.currentStock + quantity;
          if (resultingStock < 0) {
            throw new BadRequestException(
              `Ajuste resultaria em estoque negativo (${resultingStock}).`,
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

      return await tx.stockMovement.create({
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
          unitValue: entryPrice ?? product.costPrice,
          supplierId: type === MovementType.ENTRY ? (supplierId ?? null) : null,
        },
      });
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto, productId?: string) {
    const where = productId ? { productId } : {};

    const [movements, itemCount] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, internalCode: true } },
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
