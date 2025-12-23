import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return new PageDto(products, pageMetaDto);
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        specifications: true,
        attachments: true,
      },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { specifications, attachments, ...productData } = updateProductDto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        specifications: specifications
          ? {
              deleteMany: {}, // Apaga specs antigas
              create: specifications, // Cria as novas
            }
          : undefined,
        attachments: attachments
          ? {
              deleteMany: {}, // Apaga anexos antigos (CUIDADO: isso não deleta o arquivo do disco, apenas do banco)
              create: attachments,
            }
          : undefined,
      },
      include: {
        specifications: true,
        attachments: true,
      },
    });
  }

  async remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const movements = await this.prisma.stockMovement.findMany({
      where: { productId: id },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (movements.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir um produto que possui movimentações.',
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getDashboardStats() {
    // 1. Total de Produtos
    const totalProducts = await this.prisma.product.count();

    // 2. Produtos com Estoque Baixo (Estoque Atual <= Estoque Mínimo)
    const lowStockProducts = await this.prisma.product.count({
      where: {
        currentStock: {
          lte: this.prisma.product.fields.minStock,
        },
      },
    });

    // 3. Valor Total do Estoque (Soma de currentStock * costPrice)
    // O Prisma não faz "SUM(colA * colB)" nativamente fácil no SQLite sem raw query
    // Vamos fazer via Raw Query para ser performático
    const result: any[] = await this.prisma.$queryRaw`
      SELECT SUM(current_stock * cost_price) as totalValue FROM products
    `;

    const totalValue = result[0]?.totalValue || 0;

    // 4. Lista dos 5 produtos com menor estoque para exibir na tela
    const criticalItems = await this.prisma.product.findMany({
      where: {
        currentStock: {
          lte: this.prisma.product.fields.minStock,
        },
      },
      take: 5,
      orderBy: {
        currentStock: 'asc',
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true,
      },
    });

    return {
      totalProducts,
      lowStockCount: lowStockProducts,
      stockValue: totalValue,
      criticalItems,
    };
  }
}
