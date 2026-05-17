import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesService } from '../recipes/recipes.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { BuyLotDto } from './dto/buy-lot.dto';
import { BuyBulkDto } from './dto/buy-bulk.dto';

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipesService: RecipesService,
  ) {}

  // ──────────────────────────────────────────
  // CRUD básico
  // ──────────────────────────────────────────

  async create(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        minStock: dto.minStock ?? 0,
      },
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { q, skip, take, order } = pageOptionsDto;

    const where = q ? { name: { contains: q } } : {};

    const [ingredients, itemCount] = await this.prisma.$transaction([
      this.prisma.ingredient.findMany({
        where,
        skip,
        take,
        orderBy: { name: order },
      }),
      this.prisma.ingredient.count({ where }),
    ]);

    const mappedIngredients = ingredients.map((i) => ({
      ...i,
      currentStock: i.currentStock.toNumber(),
      averageCost: i.averageCost.toNumber(),
      minStock: i.minStock.toNumber(),
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(mappedIngredients, pageMetaDto);
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        lots: {
          orderBy: { purchasedAt: 'asc' },
          include: { supplier: { select: { name: true } } },
        },
      },
    });

    if (!ingredient) {
      throw new NotFoundException(`Insumo ${id} não encontrado.`);
    }

    return {
      ...ingredient,
      currentStock: ingredient.currentStock.toNumber(),
      averageCost: ingredient.averageCost.toNumber(),
      minStock: ingredient.minStock.toNumber(),
      lots: ingredient.lots.map((lot) => ({
        ...lot,
        quantity: lot.quantity.toNumber(),
        totalCost: lot.totalCost.toNumber(),
        unitCost: lot.unitCost.toNumber(),
        remainingQty: lot.remainingQty.toNumber(),
      })),
    };
  }

  async update(id: string, dto: UpdateIngredientDto) {
    await this.findOne(id);
    return this.prisma.ingredient.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const usedInRecipe = await this.prisma.recipeItem.findFirst({
      where: { ingredientId: id },
    });

    if (usedInRecipe) {
      throw new BadRequestException(
        'Não é possível excluir um insumo que faz parte de uma receita.',
      );
    }

    return this.prisma.ingredient.delete({ where: { id } });
  }

  // ──────────────────────────────────────────
  // Compra de lote (entrada de estoque)
  // ──────────────────────────────────────────

  /**
   * Registra a compra de um lote de insumo e atualiza automaticamente:
   *  - custo unitário do lote (totalCost / quantity)
   *  - custo médio ponderado do insumo
   *  - estoque atual do insumo
   */
  async buyLot(ingredientId: string, dto: BuyLotDto, userId: string) {
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException(
        'A data de vencimento deve ser uma data futura.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        throw new NotFoundException(`Insumo ${ingredientId} não encontrado.`);
      }

      // 1. Custo unitário do lote
      const qtyDecimal = new Prisma.Decimal(dto.quantity);
      const totalCostDecimal = new Prisma.Decimal(dto.totalCost);
      const unitCost = totalCostDecimal.div(qtyDecimal);

      // 2. Custo médio ponderado
      //    CMP = (EstoqueAtual * CustoMédioAtual + QtdEntrada * CustoUnitárioLote)
      //          / (EstoqueAtual + QtdEntrada)
      const currentTotalValue = ingredient.currentStock.mul(
        ingredient.averageCost,
      );
      const incomingTotalValue = qtyDecimal.mul(unitCost);
      const newTotalStock = ingredient.currentStock.add(qtyDecimal);

      const newAverageCost = newTotalStock.gt(0)
        ? currentTotalValue.add(incomingTotalValue).div(newTotalStock)
        : unitCost;

      // 3. Número do lote — gerado automaticamente se não fornecido
      const lotNumber =
        dto.lotNumber ??
        `LOT-${ingredientId.slice(0, 8).toUpperCase()}-${Date.now()}`;

      // 4. Cria o lote
      const lot = await tx.ingredientLot.create({
        data: {
          lotNumber,
          ingredientId,
          quantity: dto.quantity,
          totalCost: dto.totalCost,
          unitCost,
          remainingQty: dto.quantity, // inicia cheio (base para FIFO)
          purchasedAt: new Date(),
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          supplierId: dto.supplierId ?? null,
          brand: dto.brand ?? null,
        },
        include: {
          ingredient: { select: { name: true, unit: true } },
          supplier: { select: { name: true } },
        },
      });

      // 5. Atualiza o insumo
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          currentStock: newTotalStock,
          averageCost: newAverageCost,
        },
      });

      // 6. Registra a Entrada (ENTRY) do insumo no histórico
      await tx.stockMovement.create({
        data: {
          ingredientId,
          type: 'ENTRY',
          quantity: dto.quantity,
          stockBefore: ingredient.currentStock.toNumber(),
          stockAfter: newTotalStock.toNumber(),
          unitValue: unitCost.toNumber(),
          supplierId: dto.supplierId ?? null,
          userId,
          description: 'Entrada avulsa (Compra)',
        },
      });

      return {
        lot: {
          ...lot,
          quantity: lot.quantity.toNumber(),
          totalCost: lot.totalCost.toNumber(),
          unitCost: lot.unitCost.toNumber(),
          remainingQty: lot.remainingQty.toNumber(),
        },
        ingredient: {
          id: ingredientId,
          newStock: newTotalStock.toNumber(),
          newAverageCost: newAverageCost.toNumber(),
        },
      };
    });

    // Recalcula o custo dos produtos fabricados que usam este insumo.
    // Feito fora da transação para não bloquear o commit; falhas aqui são não-críticas.
    await this.refreshAffectedProductCosts(ingredientId);

    return result;
  }

  /**
   * Registra a compra em lote de múltiplos insumos em uma única transação,
   * atualizando o estoque e gerando um lote para cada item comprado.
   */
  async buyBulk(dto: BuyBulkDto, userId: string) {
    const now = new Date();
    const invalidExpiry = dto.items.find(
      (item) => item.expiresAt && new Date(item.expiresAt) <= now,
    );
    if (invalidExpiry) {
      throw new BadRequestException(
        `A data de vencimento do insumo ${invalidExpiry.ingredientId} deve ser uma data futura.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const processedItems: any[] = [];

      for (const item of dto.items) {
        const ingredient = await tx.ingredient.findUnique({
          where: { id: item.ingredientId },
        });

        if (!ingredient) {
          throw new NotFoundException(
            `Insumo ${item.ingredientId} não encontrado.`,
          );
        }

        // 1. Custo unitário do lote
        const qtyDecimal = new Prisma.Decimal(item.quantity);
        const totalCostDecimal = new Prisma.Decimal(item.totalCost);
        const unitCost = totalCostDecimal.div(qtyDecimal);

        // 2. Custo médio ponderado
        const currentTotalValue = ingredient.currentStock.mul(
          ingredient.averageCost,
        );
        const incomingTotalValue = qtyDecimal.mul(unitCost);
        const newTotalStock = ingredient.currentStock.add(qtyDecimal);

        const newAverageCost = newTotalStock.gt(0)
          ? currentTotalValue.add(incomingTotalValue).div(newTotalStock)
          : unitCost;

        // 3. Número do lote
        const lotNumber = `LOT-${item.ingredientId.slice(0, 8).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 4. Cria o lote
        const lot = await tx.ingredientLot.create({
          data: {
            lotNumber,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            totalCost: item.totalCost,
            unitCost,
            remainingQty: item.quantity,
            purchasedAt: new Date(),
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            brand: item.brand ?? null,
            supplierId: item.supplierId ?? null,
          },
        });

        // 5. Atualiza o insumo
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: {
            currentStock: newTotalStock,
            averageCost: newAverageCost,
          },
        });

        // 6. Registra a Entrada (ENTRY) do insumo no histórico
        await tx.stockMovement.create({
          data: {
            ingredientId: item.ingredientId,
            type: 'ENTRY',
            quantity: item.quantity,
            stockBefore: ingredient.currentStock.toNumber(),
            stockAfter: newTotalStock.toNumber(),
            description: 'Entrada em lote (Compra)',
            userId,
          },
        });

        processedItems.push({
          lot: {
            ...lot,
            quantity: lot.quantity.toNumber(),
            totalCost: lot.totalCost.toNumber(),
            unitCost: lot.unitCost.toNumber(),
            remainingQty: lot.remainingQty.toNumber(),
          },
          ingredient: {
            id: item.ingredientId,
            newStock: newTotalStock.toNumber(),
            newAverageCost: newAverageCost.toNumber(),
          },
        });
      }

      return processedItems;
    });

    // Recalcula o custo dos produtos fabricados que usam estes insumos.
    const affectedIngredientIds = [
      ...new Set(dto.items.map((i) => i.ingredientId)),
    ];
    await Promise.allSettled(
      affectedIngredientIds.map((id) => this.refreshAffectedProductCosts(id)),
    );

    return result;
  }

  private async refreshAffectedProductCosts(
    ingredientId: string,
  ): Promise<void> {
    const recipeItems = await this.prisma.recipeItem.findMany({
      where: { ingredientId },
      select: { productId: true },
      distinct: ['productId'],
    });

    await Promise.allSettled(
      recipeItems.map(({ productId }) =>
        this.recipesService
          .refreshProductCost(productId)
          .catch((err: Error) => {
            this.logger.warn(
              `Falha ao recalcular custo do produto ${productId} após compra de lote: ${err.message}`,
            );
          }),
      ),
    );
  }

  // ──────────────────────────────────────────
  // Alertas de estoque baixo
  // ──────────────────────────────────────────

  async getLowStockIngredients() {
    return this.prisma.ingredient
      .findMany({
        where: {
          currentStock: { lte: this.prisma.ingredient.fields.minStock },
        },
        orderBy: { currentStock: 'asc' },
        select: {
          id: true,
          name: true,
          unit: true,
          currentStock: true,
          minStock: true,
        },
      })
      .then((items) =>
        items.map((i) => ({
          ...i,
          currentStock: i.currentStock.toNumber(),
          minStock: i.minStock.toNumber(),
        })),
      );
  }

  async getExpiringLots(days = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return this.prisma.ingredientLot
      .findMany({
        where: {
          remainingQty: { gt: 0 },
          expiresAt: {
            lte: targetDate,
            not: null,
          },
        },
        include: {
          ingredient: { select: { name: true, unit: true } },
        },
        orderBy: { expiresAt: 'asc' },
      })
      .then((lots) =>
        lots.map((lot) => ({
          ...lot,
          quantity: lot.quantity.toNumber(),
          totalCost: lot.totalCost.toNumber(),
          unitCost: lot.unitCost.toNumber(),
          remainingQty: lot.remainingQty.toNumber(),
        })),
      );
  }
}
