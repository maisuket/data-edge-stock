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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Produto não encontrado.');

      let newStock = product.currentStock;
      let newCostPrice = product.costPrice; // Começa com o preço atual

      switch (type) {
        case MovementType.ENTRY:
          // === LÓGICA DE CUSTO MÉDIO PONDERADO ===
          // Fórmula: ((EstoqueAtual * CustoAtual) + (QtdEntrada * CustoEntrada)) / (EstoqueAtual + QtdEntrada)
          if (entryPrice !== undefined && entryPrice !== null) {
            const currentTotalValue = product.currentStock * product.costPrice;
            const entryTotalValue = quantity * entryPrice;
            const totalQuantity = product.currentStock + quantity;

            if (totalQuantity > 0) {
              newCostPrice =
                (currentTotalValue + entryTotalValue) / totalQuantity;
            } else {
              // Se o estoque era negativo ou zero e a soma continua zero (raro), assume o preço novo
              newCostPrice = entryPrice;
            }
          }
          newStock += quantity;
          break;

        case MovementType.EXIT:
          // Na saída, o custo médio NÃO muda (princípio contábil), apenas o estoque baixa.
          if (product.currentStock < quantity) {
            throw new BadRequestException('Estoque insuficiente.');
          }
          newStock -= quantity;
          break;

        case MovementType.ADJUSTMENT:
          // Ajuste soma ou subtrai (quantity pode ser negativo na lógica, mas aqui assumimos quantity absoluto positivo e o tipo define a operação?
          // No nosso modelo anterior definimos que Adjustment SOMA.
          // Para "Correção de Inventário", geralmente calculamos a diferença no frontend e mandamos Entry ou Exit, ou mandamos Adjustment.
          // Vamos manter a lógica simples: Adjustment SOMA. Se quiser reduzir, mande um quantity negativo?
          // Não, o DTO valida min(0).
          // Vamos assumir que AJUSTE é uma entrada de correção. Para saída de correção, usamos SAIDA com motivo "Ajuste".
          // Ou melhor: Vamos permitir que AJUSTE recalcule o saldo direto? Não, isso quebra o histórico.
          // Vamos manter: AJUSTE soma.
          newStock += quantity;
          break;
      }

      // Atualiza Produto (Novo Estoque + Novo Custo Médio)
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
          costPrice: newCostPrice,
        },
      });

      // Cria Histórico com Lote/Validade
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await tx.stockMovement.create({
        data: {
          type,
          quantity,
          stockBefore: product.currentStock,
          stockAfter: newStock,
          description,
          productId,
          userId,
          // Novos Campos
          batch,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          unitValue: entryPrice || product.costPrice, // Salva o valor usado na operação
          supplierId: type === MovementType.ENTRY ? supplierId : null,
        },
        // ... include
      });
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto, productId?: string) {
    const where: any = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (productId) where.productId = productId;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [movements, itemCount] = await this.prisma.$transaction([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.prisma.stockMovement.findMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
        include: {
          product: { select: { name: true, internalCode: true } },
          user: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      this.prisma.stockMovement.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(movements, pageMetaDto);
  }
}
