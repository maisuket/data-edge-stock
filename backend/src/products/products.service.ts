import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import * as fs from 'fs';
import * as path from 'path';

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
    const { specifications, attachments, ...productData } = createProductDto;

    return this.prisma.product.create({
      data: {
        ...productData,
        // Cria as relações automaticamente
        specifications: {
          create: specifications,
        },
        attachments: {
          create: attachments,
        },
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
    const where: any = q
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

    if (!product) return null;

    return {
      ...product,
      costPrice: product.costPrice.toNumber(),
      salePrice: product.salePrice ? product.salePrice.toNumber() : null,
      currentStock: product.currentStock.toNumber(),
      minStock: product.minStock.toNumber(),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { specifications, attachments, ...productData } = updateProductDto;

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
      },
      include: {
        specifications: true,
        attachments: true,
      },
    });
  }

  async remove(id: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: { productId: id },
    });

    if (movements.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir um produto que possui movimentações.',
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
    ]);

    return {
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
    };
  }
}
