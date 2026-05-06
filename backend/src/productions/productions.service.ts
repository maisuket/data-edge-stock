import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
    return this.prisma.$transaction(async (tx) => {
      // ── 1. Carrega o produto ────────────────
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Produto ${dto.productId} não encontrado.`);
      }

      // ── 2. Carrega a receita ────────────────
      const recipeItems = await tx.recipeItem.findMany({
        where: { productId: dto.productId },
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
      const qtyDecimal = new Prisma.Decimal(dto.quantity);

      for (const item of recipeItems) {
        const required = item.quantity.mul(qtyDecimal);
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
        const quantityUsed = item.quantity.mul(qtyDecimal);
        const itemTotalCost = quantityUsed.mul(item.ingredient.averageCost);
        totalProductionCost = totalProductionCost.add(itemTotalCost);

        consumptions.push({
          ingredientId: item.ingredientId,
          quantityUsed,
          unitCost: item.ingredient.averageCost,
          totalCost: itemTotalCost,
        });
      }

      const unitCost = qtyDecimal.gt(0)
        ? totalProductionCost.div(qtyDecimal)
        : new Prisma.Decimal(0);

      // ── 5. Deduz estoque dos insumos ───────
      await Promise.all(
        recipeItems.map((item) => {
          const consumed = item.quantity.mul(qtyDecimal);
          return tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { currentStock: { decrement: consumed } },
          });
        }),
      );

      // ── 6. Incrementa estoque do produto ───
      await tx.product.update({
        where: { id: dto.productId },
        data: { currentStock: { increment: dto.quantity } },
      });

      // ── 7. Cria o registro de produção ─────
      const production = await tx.production.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
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
        quantity: production.quantity,
        unitCost,
        totalCost: totalProductionCost,
        notes: production.notes,
        producedBy: production.user.name,
        producedAt: production.producedAt,
        consumptions: production.consumptions.map((c) => ({
          ingredient: c.ingredient.name,
          unit: c.ingredient.unit,
          quantityUsed: c.quantityUsed,
          unitCost: c.unitCost,
          totalCost: c.totalCost,
        })),
      };
    });
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
      productions.map((p) => ({ ...p, producedBy: p.user.name })),
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
      profitMarginPercent,
    };
  }
}
