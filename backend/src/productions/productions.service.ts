import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { CreateProductionDto } from './dto/create-production.dto';

@Injectable()
export class ProductionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // Registrar produção
  // ──────────────────────────────────────────

  /**
   * Registra um lote de produção com as seguintes garantias:
   *  1. O produto deve possuir receita cadastrada.
   *  2. Todos os insumos devem ter estoque suficiente.
   *  3. O custo de produção é calculado automaticamente (custo médio).
   *  4. O estoque de cada insumo é deduzido.
   *  5. O estoque do produto acabado é incrementado.
   *  Tudo ocorre dentro de uma única transação — nada é persistido
   *  parcialmente em caso de erro.
   */
  async create(dto: CreateProductionDto, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // ── 1. Carrega o produto ────────────────
        const product = await tx.product.findUnique({
          where: { id: dto.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produto ${dto.productId} não encontrado.`,
          );
        }

        // ── 1.5. Valida se o usuário existe ─────
        const userExists = await tx.user.findUnique({ where: { id: userId } });
        if (!userExists) {
          throw new UnauthorizedException(
            'Usuário logado inválido ou não encontrado no banco de dados.',
          );
        }

        // ── 2. Carrega a receita ────────────────
        const recipeItems = await tx.recipeItem.findMany({
          where: { productId: dto.productId },
          orderBy: { ingredientId: 'asc' },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentStock: true,
                averageCost: true,
              },
            },
          },
        });

        if (recipeItems.length === 0) {
          throw new BadRequestException(
            `Produto "${product.name}" não possui receita cadastrada. ` +
              'Cadastre a receita antes de registrar uma produção.',
          );
        }

        // ── 3. Valida estoque de cada insumo ───
        const insufficientIngredients: string[] = [];
        const batchesDecimal = new Prisma.Decimal(dto.batches);
        const producedUnits = batchesDecimal.mul(product.yieldQuantity);

        for (const item of recipeItems) {
          const required = item.quantity.mul(batchesDecimal);
          if (item.ingredient.currentStock.lt(required)) {
            insufficientIngredients.push(
              `"${item.ingredient.name}": necessário ${required.toNumber()} ${item.ingredient.unit}, ` +
                `disponível ${item.ingredient.currentStock.toNumber()} ${item.ingredient.unit}`,
            );
          }
        }

        if (insufficientIngredients.length > 0) {
          throw new BadRequestException(
            'Estoque insuficiente para os seguintes insumos:\n' +
              insufficientIngredients.join('\n'),
          );
        }

        // ── 4. Calcula custo total da produção ─
        let totalProductionCost = new Prisma.Decimal(0);
        const consumptions: {
          ingredientId: string;
          quantityUsed: Prisma.Decimal;
          unitCost: Prisma.Decimal;
          totalCost: Prisma.Decimal;
        }[] = [];

        for (const item of recipeItems) {
          const quantityUsed = item.quantity.mul(batchesDecimal);
          const itemTotalCost = quantityUsed.mul(item.ingredient.averageCost);
          totalProductionCost = totalProductionCost.add(itemTotalCost);

          consumptions.push({
            ingredientId: item.ingredientId,
            quantityUsed,
            unitCost: item.ingredient.averageCost,
            totalCost: itemTotalCost,
          });
        }

        const unitCost = producedUnits.gt(0)
          ? totalProductionCost.div(producedUnits)
          : new Prisma.Decimal(0);

        // ── 5. Deduz estoque dos insumos ───────
        // Usamos o valor retornado pelo UPDATE para calcular stockBefore/stockAfter
        // com precisão, mesmo em cenários de produções concorrentes.
        for (const item of recipeItems) {
          const consumed = item.quantity.mul(batchesDecimal);

          const updatedIngredient = await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { currentStock: { decrement: consumed } },
            select: { currentStock: true },
          });

          const stockAfterNum = updatedIngredient.currentStock.toNumber();
          const stockBeforeNum = stockAfterNum + consumed.toNumber();

          await tx.stockMovement.create({
            data: {
              ingredientId: item.ingredientId,
              type: 'EXIT',
              quantity: consumed.toNumber(),
              stockBefore: stockBeforeNum,
              stockAfter: stockAfterNum,
              userId,
              description: `Consumo na produção do item: ${product.name}`,
            },
          });
        }

        // ── 6. Incrementa estoque do produto ───
        const producedUnitsNum = producedUnits.toNumber();
        const updatedProduct = await tx.product.update({
          where: { id: dto.productId },
          data: { currentStock: { increment: producedUnitsNum } },
          select: { currentStock: true },
        });

        const productStockAfterNum = updatedProduct.currentStock.toNumber();
        const productStockBeforeNum = productStockAfterNum - producedUnitsNum;

        // ── 6.5. Registra o histórico da movimentação (ENTRY) ──
        await tx.stockMovement.create({
          data: {
            productId: dto.productId,
            type: 'ENTRY',
            quantity: producedUnitsNum,
            stockBefore: productStockBeforeNum,
            stockAfter: productStockAfterNum,
            userId,
            description: 'Produção Interna',
          },
        });

        // ── 7. Cria o registro de produção ─────
        const production = await tx.production.create({
          data: {
            productId: dto.productId,
            batches: batchesDecimal,
            quantity: producedUnits,
            unitCost,
            totalCost: totalProductionCost,
            notes: dto.notes,
            userId,
            consumptions: {
              create: consumptions,
            },
          },
          include: {
            product: { select: { name: true, unit: true } },
            user: { select: { name: true } },
            consumptions: {
              include: {
                ingredient: { select: { name: true, unit: true } },
              },
            },
          },
        });

        return {
          id: production.id,
          product: production.product,
          batches: production.batches.toNumber(),
          quantity: production.quantity.toNumber(),
          unitCost: unitCost.toNumber(),
          totalCost: totalProductionCost.toNumber(),
          notes: production.notes,
          producedBy: production.user.name,
          producedAt: production.producedAt,
          consumptions: production.consumptions.map((c) => ({
            ingredient: c.ingredient.name,
            unit: c.ingredient.unit,
            quantityUsed: c.quantityUsed.toNumber(),
            unitCost: c.unitCost.toNumber(),
            totalCost: c.totalCost.toNumber(),
          })),
        };
      },
      // Timeout maior que o padrão (5s): Render/Neon podem estar "acordando"
      // de hibernação por inatividade, e essa transação faz várias idas
      // sequenciais ao banco (uma por insumo da receita).
      { maxWait: 10000, timeout: 20000 },
    );
  }

  // ──────────────────────────────────────────
  // Listagem
  // ──────────────────────────────────────────

  async findAll(pageOptionsDto: PageOptionsDto, productId?: string) {
    const where = productId ? { productId } : {};

    const [productions, itemCount] = await this.prisma.$transaction([
      this.prisma.production.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { producedAt: 'desc' },
        include: {
          product: { select: { name: true, unit: true } },
          user: { select: { name: true } },
        },
      }),
      this.prisma.production.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      productions.map((p) => ({
        ...p,
        producedBy: p.user.name,
        batches: p.batches.toNumber(),
        quantity: p.quantity.toNumber(),
        unitCost: p.unitCost.toNumber(),
        totalCost: p.totalCost.toNumber(),
      })),
      pageMetaDto,
    );
  }

  async findOne(id: string) {
    const production = await this.prisma.production.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, unit: true, salePrice: true } },
        user: { select: { name: true } },
        consumptions: {
          include: {
            ingredient: { select: { name: true, unit: true } },
          },
        },
      },
    });

    if (!production) {
      throw new NotFoundException(`Produção ${id} não encontrada.`);
    }

    // Adiciona margem de lucro se o produto tiver preço de venda
    const profitMarginPercent =
      production.product.salePrice && production.unitCost.gt(0)
        ? production.product.salePrice
            .sub(production.unitCost)
            .div(production.product.salePrice)
            .mul(100)
            .toDecimalPlaces(2)
        : null;

    return {
      ...production,
      batches: production.batches.toNumber(),
      quantity: production.quantity.toNumber(),
      unitCost: production.unitCost.toNumber(),
      totalCost: production.totalCost.toNumber(),
      consumptions: production.consumptions.map((c) => ({
        ...c,
        ingredient: c.ingredient.name,
        unit: c.ingredient.unit,
        quantityUsed: c.quantityUsed.toNumber(),
        unitCost: c.unitCost.toNumber(),
        totalCost: c.totalCost.toNumber(),
      })),
      profitMarginPercent: profitMarginPercent
        ? profitMarginPercent.toNumber()
        : null,
    };
  }
}
