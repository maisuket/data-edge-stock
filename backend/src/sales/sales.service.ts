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

        if (!product.salePrice) {
          throw new BadRequestException(
            `Produto "${product.name}" não possui preço de venda definido.`,
          );
        }

        const quantity = new Prisma.Decimal(item.quantity);

        // Trava de estoque: Impede vender mais do que tem (Remova se quiser permitir estoque negativo)
        if (product.currentStock.lessThan(quantity)) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". Atual: ${product.currentStock}.`,
          );
        }

        const unitPrice = product.salePrice;
        const unitCost = product.costPrice; // Snapshot crucial para CMVs antigos
        const totalPrice = unitPrice.mul(quantity);

        totalAmount = totalAmount.add(totalPrice);

        saleItemsData.push({
          productId: product.id,
          quantity,
          unitPrice,
          unitCost,
          totalPrice,
        });

        // Atualiza saldo do estoque
        const newStock = product.currentStock.sub(quantity);
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Registra Histórico (Movimentação)
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'EXIT',
            quantity: quantity,
            stockBefore: product.currentStock,
            stockAfter: newStock,
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

      // Cria a venda principal amarrando tudo
      return tx.sale.create({
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
    });
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { skip, take, order } = pageOptionsDto;

    const [sales, itemCount] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        skip,
        take,
        orderBy: { createdAt: order === 'asc' ? 'asc' : 'desc' },
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
}
