import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { BuyLotDto } from './dto/buy-lot.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const where = q
      ? { name: { contains: q } }
      : {};

    const [ingredients, itemCount] = await this.prisma.$transaction([
      this.prisma.ingredient.findMany({
        where,
        skip,
        take,
        orderBy: { name: order },
      }),
      this.prisma.ingredient.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(ingredients, pageMetaDto);
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

    return ingredient;
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
  async buyLot(ingredientId: string, dto: BuyLotDto) {
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        throw new NotFoundException(`Insumo ${ingredientId} não encontrado.`);
      }

      // 1. Custo unitário do lote
      const unitCost = dto.totalCost / dto.quantity;

      // 2. Custo médio ponderado
      //    CMP = (EstoqueAtual * CustoMédioAtual + QtdEntrada * CustoUnitárioLote)
      //          / (EstoqueAtual + QtdEntrada)
      const currentTotalValue = ingredient.currentStock * ingredient.averageCost;
      const incomingTotalValue = dto.quantity * unitCost;
      const newTotalStock = ingredient.currentStock + dto.quantity;

      const newAverageCost =
        newTotalStock > 0
          ? (currentTotalValue + incomingTotalValue) / newTotalStock
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

      return {
        lot,
        ingredient: {
          id: ingredientId,
          newStock: newTotalStock,
          newAverageCost: Math.round(newAverageCost * 10000) / 10000,
        },
      };
    });
  }

  // ──────────────────────────────────────────
  // Alertas de estoque baixo
  // ──────────────────────────────────────────

  async getLowStockIngredients() {
    return this.prisma.$queryRaw<
      { id: string; name: string; unit: string; currentStock: number; minStock: number }[]
    >`
      SELECT id, name, unit, current_stock as "currentStock", min_stock as "minStock"
      FROM ingredients
      WHERE current_stock <= min_stock
      ORDER BY current_stock ASC
    `;
  }
}
