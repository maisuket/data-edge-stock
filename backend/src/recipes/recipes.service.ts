import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetRecipeDto } from './dto/set-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // Definir / substituir receita de um produto
  // ──────────────────────────────────────────

  /**
   * Define (ou substitui) a receita completa de um produto.
   * Após salvar, atualiza automaticamente o costPrice do produto
   * com base no custo médio atual dos insumos.
   */
  async setRecipe(productId: string, dto: SetRecipeDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Valida que o produto existe
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException(`Produto ${productId} não encontrado.`);
      }

      // 2. Valida que todos os ingredientes existem
      const ingredientIds = dto.items.map((i) => i.ingredientId);
      const ingredients = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds } },
      });

      if (ingredients.length !== ingredientIds.length) {
        const found = ingredients.map((i) => i.id);
        const missing = ingredientIds.filter((id) => !found.includes(id));
        throw new BadRequestException(
          `Insumos não encontrados: ${missing.join(', ')}`,
        );
      }

      // 3. Substitui a receita inteiramente (deleteMany + createMany)
      await tx.recipeItem.deleteMany({ where: { productId } });

      await tx.recipeItem.createMany({
        data: dto.items.map((item) => ({
          productId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        })),
      });

      // 4. Calcula e persiste o custo de produção no produto
      const productionCost = this.calculateCostFromIngredients(
        dto.items,
        ingredients,
      );

      await tx.product.update({
        where: { id: productId },
        data: {
          isManufactured: true,
          costPrice: productionCost,
        },
      });

      // 5. Retorna a receita montada com detalhes
      const recipeItems = await tx.recipeItem.findMany({
        where: { productId },
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, averageCost: true },
          },
        },
      });

      return {
        productId,
        productName: product.name,
        productionCostPerUnit: productionCost.toNumber(),
        items: recipeItems.map((item) => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.name,
          unit: item.ingredient.unit,
          quantity: item.quantity.toNumber(),
          unitCost: item.ingredient.averageCost.toNumber(),
          itemCost: item.quantity.mul(item.ingredient.averageCost).toNumber(),
        })),
      };
    });
  }

  // ──────────────────────────────────────────
  // Consultar receita de um produto
  // ──────────────────────────────────────────

  async getRecipe(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produto ${productId} não encontrado.`);
    }

    const items = await this.prisma.recipeItem.findMany({
      where: { productId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            averageCost: true,
            currentStock: true,
          },
        },
      },
    });

    const productionCostPerUnit = items.reduce(
      (sum, item) => sum.add(item.quantity.mul(item.ingredient.averageCost)),
      new Prisma.Decimal(0),
    );

    const profitMargin =
      product.salePrice && productionCostPerUnit.gt(0)
        ? product.salePrice
            .sub(productionCostPerUnit)
            .div(product.salePrice)
            .mul(100)
            .toDecimalPlaces(2)
        : null;

    return {
      productId,
      productName: product.name,
      isManufactured: product.isManufactured,
      productionCostPerUnit: productionCostPerUnit.toNumber(),
      salePrice: product.salePrice ? product.salePrice.toNumber() : null,
      profitMargin: profitMargin ? profitMargin.toNumber() : null,
      items: items.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        unit: item.ingredient.unit,
        quantity: item.quantity.toNumber(),
        currentStock: item.ingredient.currentStock.toNumber(),
        unitCost: item.ingredient.averageCost.toNumber(),
        itemCost: item.quantity.mul(item.ingredient.averageCost).toNumber(),
      })),
    };
  }

  // ──────────────────────────────────────────
  // Recalcular custo do produto (útil após nova compra de insumo)
  // ──────────────────────────────────────────

  /**
   * Recalcula e persiste o costPrice do produto baseado nos custos
   * médios atuais dos insumos da receita.
   */
  async refreshProductCost(productId: string) {
    const items = await this.prisma.recipeItem.findMany({
      where: { productId },
      include: { ingredient: { select: { averageCost: true } } },
    });

    if (items.length === 0) {
      throw new BadRequestException(
        `Produto ${productId} não possui receita cadastrada.`,
      );
    }

    const newCost = items.reduce(
      (sum, item) => sum.add(item.quantity.mul(item.ingredient.averageCost)),
      new Prisma.Decimal(0),
    );

    await this.prisma.product.update({
      where: { id: productId },
      data: { costPrice: newCost },
    });

    return { productId, newCostPrice: newCost.toNumber() };
  }

  // ──────────────────────────────────────────
  // Helper interno
  // ──────────────────────────────────────────

  private calculateCostFromIngredients(
    items: { ingredientId: string; quantity: number }[],
    ingredients: { id: string; averageCost: Prisma.Decimal }[],
  ): Prisma.Decimal {
    const costMap = new Map(ingredients.map((i) => [i.id, i.averageCost]));
    const total = items.reduce((sum, item) => {
      const cost = costMap.get(item.ingredientId) ?? new Prisma.Decimal(0);
      const qty = new Prisma.Decimal(item.quantity);
      return sum.add(qty.mul(cost));
    }, new Prisma.Decimal(0));
    return total;
  }
}
