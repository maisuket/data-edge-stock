import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = new Prisma.Decimal(0);
      const saleItemsData: Array<{
        productId: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
      }> = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produto ${item.productId} não encontrado.`,
          );
        }

        // Seguindo o princípio "Nunca confie no frontend", forçamos o uso do
        // preço cadastrado no banco de dados.
        const unitPrice = product.salePrice;

        // No JavaScript, um Decimal com valor 0 (Prisma.Decimal(0)) é um objeto "truthy".
        // Precisamos validar com .lte(0) para garantir que o preço seja maior que zero.
        if (!unitPrice || unitPrice.lte(0)) {
          throw new BadRequestException(
            `O produto "${product.name}" está sem preço de venda definido (ou o valor é zero) no banco de dados. Atualize o cadastro antes de vender.`,
          );
        }

        const quantity = new Prisma.Decimal(item.quantity);

        // UPDATE atômico: decrementa apenas se o estoque for suficiente.
        // Previne race condition onde duas vendas simultâneas poderiam levar ao estoque negativo.
        const updated = await tx.$queryRaw<{ current_stock: number }[]>(
          Prisma.sql`
            UPDATE products
            SET current_stock = current_stock - ${quantity}
            WHERE id = ${product.id} AND current_stock >= ${quantity}
            RETURNING current_stock::float AS current_stock
          `,
        );

        if (updated.length === 0) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". ` +
              `Atual: ${product.currentStock.toNumber()}.`,
          );
        }

        const newStockNum = updated[0].current_stock;
        const stockBeforeNum = product.currentStock.toNumber();

        const unitCost = product.costPrice;
        const totalPrice = unitPrice.mul(quantity);

        totalAmount = totalAmount.add(totalPrice);

        saleItemsData.push({
          productId: product.id,
          quantity,
          unitPrice,
          unitCost,
          totalPrice,
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'EXIT',
            quantity: quantity,
            stockBefore: stockBeforeNum,
            stockAfter: newStockNum,
            unitValue: unitPrice,
            userId,
            description: 'Venda',
          },
        });
      }

      const discount = new Prisma.Decimal(dto.discount || 0);
      const finalAmount = totalAmount.sub(discount);

      if (finalAmount.lessThan(0)) {
        throw new BadRequestException(
          'O desconto não pode ser maior que o valor total da venda.',
        );
      }

      const sale = await tx.sale.create({
        data: {
          userId,
          totalAmount: finalAmount,
          discount,
          notes: dto.notes,
          items: {
            create: saleItemsData,
          },
        },
      });

      return sale;
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { skip, take, order } = pageOptionsDto;

    const [sales, itemCount] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        skip,
        take,
        orderBy: { createdAt: order ?? 'desc' },
        include: {
          user: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      this.prisma.sale.count(),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(sales, pageMetaDto);
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, unit: true, internalCode: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venda ${id} não encontrada.`);
    }

    return sale;
  }

  /** Retorna a soma total e a quantidade de vendas realizadas no dia atual. */
  async getTodayStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [count, totalResult] = await this.prisma.$transaction([
      this.prisma.sale.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(total_amount), 0)::FLOAT AS total
        FROM sales
        WHERE created_at >= ${todayStart}
      `,
    ]);

    return {
      count,
      total: totalResult[0]?.total ?? 0,
    };
  }
}
