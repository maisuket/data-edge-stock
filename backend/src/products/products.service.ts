import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private deleteFileSafe(filePath: string): void {
    try {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const resolved = path.resolve(process.cwd(), filePath);
      if (
        resolved.startsWith(uploadsDir + path.sep) &&
        fs.existsSync(resolved)
      ) {
        fs.unlinkSync(resolved);
      }
    } catch (err) {
      this.logger.warn(
        `Falha ao remover arquivo físico: ${filePath} — ${(err as Error).message}`,
      );
    }
  }

  async create(createProductDto: CreateProductDto) {
    let newInternalCode = createProductDto.internalCode;

    // Se o código interno não for enviado, geramos um sequencial automaticamente
    if (!newInternalCode) {
      // Pega as 3 primeiras letras da categoria em maiúsculo (ex: "Bolo" -> "BOL")
      // O padEnd garante que, se a categoria tiver menos de 3 letras (ex: "Pó"), vire "PÓX"
      const categoryPrefix = createProductDto.category
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, 'X');

      const lastProduct = await this.prisma.product.findFirst({
        where: { internalCode: { startsWith: `${categoryPrefix}-` } },
        orderBy: { internalCode: 'desc' }, // ordena pelo número para pegar o maior
        select: { internalCode: true },
      });

      let nextSequence = 1;
      if (
        lastProduct &&
        lastProduct.internalCode.startsWith(`${categoryPrefix}-`)
      ) {
        const lastNumber = parseInt(
          lastProduct.internalCode.replace(`${categoryPrefix}-`, ''),
          10,
        );
        if (!isNaN(lastNumber)) {
          nextSequence = lastNumber + 1;
        }
      }
      newInternalCode = `${categoryPrefix}-${nextSequence.toString().padStart(4, '0')}`;
    }

    const { specifications, attachments, ...productData } = createProductDto;

    return this.prisma.product.create({
      data: {
        ...productData,
        internalCode: newInternalCode,
        specifications: specifications ? { create: specifications } : undefined,
        attachments: attachments ? { create: attachments } : undefined,
      },
      include: {
        specifications: true,
        attachments: true,
      },
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const queryBuilder = this.prisma.product;
    const { q } = pageOptionsDto;

    // Monta a condição de busca (WHERE)
    const where: Prisma.ProductWhereInput = q
      ? {
          OR: [
            { name: { contains: q } }, // Busca no Nome
            { internalCode: { contains: q } }, // Busca no Código Interno
            { barcode: { contains: q } }, // Busca no Código de Barras
            { category: { contains: q } }, // Busca na Categoria
          ],
        }
      : {};

    const [products, itemCount] = await this.prisma.$transaction([
      queryBuilder.findMany({
        where, // Aplica o filtro aqui
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: {
          name: pageOptionsDto.order,
        },
        include: {
          attachments: true,
          specifications: true,
        },
      }),
      queryBuilder.count({ where }), // Conta apenas os filtrados para a paginação funcionar
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    const mappedProducts = products.map((p) => ({
      ...p,
      costPrice: p.costPrice.toNumber(),
      salePrice: p.salePrice ? p.salePrice.toNumber() : null,
      currentStock: p.currentStock.toNumber(),
      minStock: p.minStock.toNumber(),
    }));

    return new PageDto(mappedProducts, pageMetaDto);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        specifications: true,
        attachments: true,
      },
    });

    if (!product) throw new NotFoundException(`Produto ${id} não encontrado.`);

    return {
      ...product,
      costPrice: product.costPrice.toNumber(),
      salePrice: product.salePrice ? product.salePrice.toNumber() : null,
      currentStock: product.currentStock.toNumber(),
      minStock: product.minStock.toNumber(),
    };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId?: string,
  ) {
    // Extrai internalCode e category para garantir que nunca sejam alterados após a criação
    const {
      specifications,
      attachments,
      internalCode,
      category,
      ...productData
    } = updateProductDto;

    // Busca o produto atual para comparar preços
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      throw new NotFoundException(`Produto ${id} não encontrado.`);
    }

    const priceHistoryCreate: Array<{
      oldCostPrice: number;
      newCostPrice: number;
      oldSalePrice: number | null;
      newSalePrice: number | null;
      userId: string;
    }> = [];
    if (userId) {
      const oldCost = currentProduct.costPrice.toNumber();
      const newCost =
        productData.costPrice !== undefined
          ? Number(productData.costPrice)
          : oldCost;
      const oldSale = currentProduct.salePrice
        ? currentProduct.salePrice.toNumber()
        : null;
      const newSale =
        productData.salePrice !== undefined
          ? Number(productData.salePrice)
          : oldSale;

      // Se houver alteração em qualquer um dos preços, gera o registro de histórico
      if (oldCost !== newCost || oldSale !== newSale) {
        priceHistoryCreate.push({
          oldCostPrice: oldCost,
          newCostPrice: newCost,
          oldSalePrice: oldSale,
          newSalePrice: newSale,
          userId,
        });
      }
    }

    // Remove os arquivos físicos dos anexos antigos antes de deletar do banco
    if (attachments) {
      const existing = await this.prisma.attachment.findMany({
        where: { productId: id },
        select: { filePath: true },
      });
      existing.forEach((a) => this.deleteFileSafe(a.filePath));
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        specifications: specifications
          ? { deleteMany: {}, create: specifications }
          : undefined,
        attachments: attachments
          ? { deleteMany: {}, create: attachments }
          : undefined,
        priceHistories:
          priceHistoryCreate.length > 0
            ? { create: priceHistoryCreate }
            : undefined,
      },
      include: {
        specifications: true,
        attachments: true,
      },
    });
  }

  async remove(id: string) {
    // Usar findFirst é muito mais rápido do que findMany apenas para checar existência
    const movement = await this.prisma.stockMovement.findFirst({
      where: { productId: id },
    });

    if (movement) {
      throw new BadRequestException(
        'Não é possível excluir um produto que possui movimentações de estoque.',
      );
    }

    const production = await this.prisma.production.findFirst({
      where: { productId: id },
    });

    if (production) {
      throw new BadRequestException(
        'Não é possível excluir um produto que possui produções registradas.',
      );
    }

    // Remove arquivos físicos dos anexos antes de deletar o produto
    const attachments = await this.prisma.attachment.findMany({
      where: { productId: id },
      select: { filePath: true },
    });
    attachments.forEach((a) => this.deleteFileSafe(a.filePath));

    return this.prisma.product.delete({ where: { id } });
  }

  async getDashboardStats() {
    const productLowStockWhere = {
      currentStock: { lte: this.prisma.product.fields.minStock },
    };
    const ingredientLowStockWhere = {
      currentStock: { lte: this.prisma.ingredient.fields.minStock },
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const firstDayOfMonth = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      1,
    );

    const [
      totalProducts,
      lowStockCount,
      stockValueResult,
      criticalItems,
      totalIngredients,
      ingredientsLowStockCount,
      ingredientsValueResult,
      productionsTodayCount,
      productionsTodayCostResult,
      recentProductions,
      trendProductions,
      salesThisMonth,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: productLowStockWhere }),
      this.prisma.$queryRaw<{ totalValue: number }[]>`
        SELECT COALESCE(SUM(current_stock * cost_price), 0)::FLOAT as "totalValue" FROM products
      `,
      this.prisma.product.findMany({
        where: productLowStockWhere,
        take: 5,
        orderBy: { currentStock: 'asc' },
        select: { id: true, name: true, currentStock: true, minStock: true },
      }),
      this.prisma.ingredient.count(),
      this.prisma.ingredient.count({ where: ingredientLowStockWhere }),
      this.prisma.$queryRaw<{ totalValue: number }[]>`
        SELECT COALESCE(SUM(current_stock * average_cost), 0)::FLOAT as "totalValue" FROM ingredients
      `,
      this.prisma.production.count({
        where: { producedAt: { gte: todayStart } },
      }),
      this.prisma.$queryRaw<{ totalCost: number }[]>`
        SELECT COALESCE(SUM(total_cost), 0)::FLOAT as "totalCost"
        FROM productions
        WHERE produced_at >= ${todayStart}
      `,
      this.prisma.production.findMany({
        take: 5,
        orderBy: { producedAt: 'desc' },
        select: {
          id: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          producedAt: true,
          product: { select: { name: true } },
        },
      }),
      this.prisma.$queryRaw<{ day: string; total_cost: number }[]>`
        SELECT DATE(produced_at)::text AS day,
               COALESCE(SUM(total_cost), 0)::FLOAT AS total_cost
        FROM productions
        WHERE produced_at >= ${sevenDaysAgo}
        GROUP BY DATE(produced_at)
      `,
      this.prisma.sale.findMany({
        where: { createdAt: { gte: firstDayOfMonth } },
        include: { items: true },
      }),
    ]);

    // Prepara o array para o gráfico (últimos 7 dias agrupados)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const trendMap = new Map<string, { date: string; value: number }>();
    const daysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      trendMap.set(formatDate(d), { date: daysShort[d.getDay()], value: 0 });
    }
    for (const row of trendProductions) {
      if (trendMap.has(row.day)) {
        trendMap.get(row.day)!.value = row.total_cost;
      }
    }

    // Calcula Faturamento do Mês e Margem de Lucro
    let totalSales = 0;
    let totalSalesCost = 0;

    for (const sale of salesThisMonth) {
      totalSales += sale.totalAmount.toNumber();
      for (const item of sale.items) {
        totalSalesCost += item.unitCost.toNumber() * item.quantity.toNumber();
      }
    }

    const profitMargin =
      totalSales > 0 ? ((totalSales - totalSalesCost) / totalSales) * 100 : 0;

    return {
      // Vendas
      totalSales,
      profitMargin,
      // Produtos
      totalProducts,
      lowStockCount,
      stockValue: stockValueResult[0]?.totalValue ?? 0,
      criticalItems: criticalItems.map((i) => ({
        ...i,
        currentStock: i.currentStock.toNumber(),
        minStock: i.minStock.toNumber(),
      })),
      // Insumos
      totalIngredients,
      ingredientsLowStockCount,
      ingredientsValue: ingredientsValueResult[0]?.totalValue ?? 0,
      // Produções
      productionsTodayCount,
      productionsTodayCost: productionsTodayCostResult[0]?.totalCost ?? 0,
      recentProductions: recentProductions.map((p) => ({
        ...p,
        quantity: p.quantity.toNumber(),
        unitCost: p.unitCost.toNumber(),
        totalCost: p.totalCost.toNumber(),
      })),
      productionsTrend: Array.from(trendMap.values()),
    };
  }

  async findPublic() {
    const products = await this.prisma.product.findMany({
      where: {
        salePrice: { gt: 0 },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        salePrice: true,
        currentStock: true,
        imageUrl: true,
        specifications: { select: { name: true, value: true } },
      },
    });

    return products.map((p) => ({
      ...p,
      salePrice: p.salePrice ? p.salePrice.toNumber() : null,
      currentStock: p.currentStock.toNumber(),
    }));
  }

  // Busca o histórico de um produto para exibir no relatório
  async getPriceHistory(productId: string) {
    const history = await this.prisma.productPriceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    });

    return history.map((h) => ({
      ...h,
      userName: h.user.name,
    }));
  }
}
