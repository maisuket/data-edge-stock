import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryType, OrderStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { CreateOrderDto } from './dto/create-order.dto';

const SYSTEM_USERNAME = 'cardapio-publico';
const ORDER_NUMBER_PREFIX = 'PED';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  // ──────────────────────────────────────────
  // Criar pedido (rota pública do cardápio)
  // ──────────────────────────────────────────

  /**
   * Cria um pedido a partir do carrinho do cardápio público:
   *  1. Nunca confia no preço enviado pelo cliente — usa product.salePrice.
   *  2. Debita o estoque de forma atômica (evita corrida entre pedidos simultâneos).
   *  3. Registra um StockMovement por item, atribuído a um usuário de sistema
   *     (não existe usuário logado nesse fluxo).
   *  4. Gera um número de pedido legível (PED-0001).
   *  Tudo dentro de uma única transação.
   */
  async create(dto: CreateOrderDto) {
    const systemUserId = await this.getOrCreateSystemUserId();

    return this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);

      let totalAmount = new Prisma.Decimal(0);
      const orderItemsData: Array<{
        productId: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
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

        const unitPrice = product.salePrice;
        if (!unitPrice || unitPrice.lte(0)) {
          throw new BadRequestException(
            `O produto "${product.name}" está sem preço de venda definido.`,
          );
        }

        const quantity = new Prisma.Decimal(item.quantity);

        // UPDATE atômico: decrementa apenas se o estoque for suficiente.
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
            `Estoque insuficiente para "${product.name}". ` +
              `Disponível: ${product.currentStock.toNumber()}.`,
          );
        }

        const newStockNum = updated[0].current_stock;
        const stockBeforeNum = product.currentStock.toNumber();
        const totalPrice = unitPrice.mul(quantity);
        totalAmount = totalAmount.add(totalPrice);

        orderItemsData.push({
          productId: product.id,
          quantity,
          unitPrice,
          totalPrice,
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'EXIT',
            quantity,
            stockBefore: stockBeforeNum,
            stockAfter: newStockNum,
            unitValue: unitPrice,
            userId: systemUserId,
            description: `Pedido Online #${orderNumber}`,
          },
        });
      }

      // ── Taxa de entrega ────────────────────
      let deliveryFee = new Prisma.Decimal(0);
      let deliveryNeighborhood: string | null = null;

      if (dto.deliveryType === DeliveryType.DELIVERY) {
        if (!dto.deliveryNeighborhood) {
          throw new BadRequestException(
            'Informe o bairro para calcular a taxa de entrega.',
          );
        }

        const zone = await tx.deliveryZone.findFirst({
          where: { neighborhood: dto.deliveryNeighborhood, active: true },
        });

        if (!zone) {
          throw new BadRequestException(
            `Bairro "${dto.deliveryNeighborhood}" não encontrado ou indisponível para entrega.`,
          );
        }

        deliveryFee = zone.fee;
        deliveryNeighborhood = zone.neighborhood;
        totalAmount = totalAmount.add(deliveryFee);
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          notes: dto.notes,
          totalAmount,
          deliveryType: dto.deliveryType,
          deliveryNeighborhood,
          deliveryFee,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
        },
      });

      // ── Cadastro agregado de cliente por telefone ──
      await tx.customer.upsert({
        where: { phone: dto.customerPhone },
        create: {
          phone: dto.customerPhone,
          name: dto.customerName,
          orderCount: 1,
        },
        update: {
          orderCount: { increment: 1 },
          ...(dto.customerName ? { name: dto.customerName } : {}),
        },
      });

      return order;
    });
  }

  // ──────────────────────────────────────────
  // Listagem / detalhe (admin)
  // ──────────────────────────────────────────

  async findAll(pageOptionsDto: PageOptionsDto, status?: OrderStatus) {
    const where = status ? { status } : {};

    const [orders, itemCount] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount.toNumber(),
        deliveryFee: o.deliveryFee.toNumber(),
      })),
      pageMetaDto,
    );
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${id} não encontrado.`);
    }

    return {
      ...order,
      totalAmount: order.totalAmount.toNumber(),
      deliveryFee: order.deliveryFee.toNumber(),
      items: order.items.map((i) => ({
        ...i,
        quantity: i.quantity.toNumber(),
        unitPrice: i.unitPrice.toNumber(),
        totalPrice: i.totalPrice.toNumber(),
      })),
    };
  }

  // ──────────────────────────────────────────
  // Link de pagamento (admin)
  // ──────────────────────────────────────────

  /**
   * Gera (ou regenera) um link de pagamento Mercado Pago para o pedido e
   * persiste a URL/ID da preferência. Não altera o status do pedido —
   * a confirmação de pagamento continua manual (ver updateStatus).
   */
  async generatePaymentLink(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${id} não encontrado.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Não é possível gerar link de pagamento para um pedido cancelado.',
      );
    }

    const preferenceItems = order.items.map((item) => ({
      title: item.product.name,
      quantity: item.quantity.toNumber(),
      unitPrice: item.unitPrice.toNumber(),
    }));

    if (order.deliveryFee.gt(0)) {
      preferenceItems.push({
        title: `Taxa de entrega — ${order.deliveryNeighborhood}`,
        quantity: 1,
        unitPrice: order.deliveryFee.toNumber(),
      });
    }

    const { preferenceId, paymentLink } =
      await this.mercadoPagoService.createPreference(
        order.orderNumber,
        preferenceItems,
      );

    const updated = await this.prisma.order.update({
      where: { id },
      data: { paymentLinkUrl: paymentLink, paymentPreferenceId: preferenceId },
    });

    return {
      ...updated,
      totalAmount: updated.totalAmount.toNumber(),
      deliveryFee: updated.deliveryFee.toNumber(),
    };
  }

  // ──────────────────────────────────────────
  // Atualizar status (admin)
  // ──────────────────────────────────────────

  /**
   * Atualiza o status de um pedido. Ao transicionar para CANCELLED,
   * devolve o estoque de cada item e registra um StockMovement de entrada.
   */
  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Pedido ${id} não encontrado.`);
      }

      const isNewlyCancelled =
        status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED;

      if (isNewlyCancelled) {
        const systemUserId = await this.getOrCreateSystemUserId(tx);

        for (const item of order.items) {
          const updated = await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
            select: { currentStock: true },
          });

          const stockAfterNum = updated.currentStock.toNumber();
          const stockBeforeNum = stockAfterNum - item.quantity.toNumber();

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ENTRY',
              quantity: item.quantity,
              stockBefore: stockBeforeNum,
              stockAfter: stockAfterNum,
              userId: systemUserId,
              description: `Cancelamento Pedido #${order.orderNumber}`,
            },
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
      });

      return {
        ...updatedOrder,
        totalAmount: updatedOrder.totalAmount.toNumber(),
        deliveryFee: updatedOrder.deliveryFee.toNumber(),
      };
    });
  }

  // ──────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────

  /**
   * Pedidos públicos não têm usuário logado, mas StockMovement.userId é
   * obrigatório. Busca (ou cria uma única vez) um usuário de sistema
   * dedicado para atribuir esses movimentos de forma rastreável.
   */
  private async getOrCreateSystemUserId(
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const existing = await tx.user.findFirst({
      where: { username: SYSTEM_USERNAME },
      select: { id: true },
    });
    if (existing) return existing.id;

    const randomPassword = await bcrypt.hash(randomUUID(), 10);
    const created = await tx.user.create({
      data: {
        username: SYSTEM_USERNAME,
        email: 'cardapio-publico@sistema.local',
        name: 'Pedidos Online (Cardápio)',
        password: randomPassword,
        role: 'USER',
      },
      select: { id: true },
    });
    return created.id;
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const lastOrder = await tx.order.findFirst({
      where: { orderNumber: { startsWith: `${ORDER_NUMBER_PREFIX}-` } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    let nextSequence = 1;
    if (lastOrder) {
      const lastNumber = parseInt(
        lastOrder.orderNumber.replace(`${ORDER_NUMBER_PREFIX}-`, ''),
        10,
      );
      if (!isNaN(lastNumber)) nextSequence = lastNumber + 1;
    }

    return `${ORDER_NUMBER_PREFIX}-${nextSequence.toString().padStart(4, '0')}`;
  }
}
