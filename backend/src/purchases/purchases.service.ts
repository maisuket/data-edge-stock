import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

const PURCHASE_INCLUDE = {
  supplier: { select: { name: true } },
  user: { select: { name: true } },
  lots: {
    include: {
      ingredient: { select: { name: true, unit: true } },
    },
  },
} as const;

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { skip, take, order } = pageOptionsDto;

    const [purchases, itemCount] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        skip,
        take,
        orderBy: { createdAt: order ?? 'desc' },
        include: PURCHASE_INCLUDE,
      }),
      this.prisma.purchase.count(),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(purchases, pageMetaDto);
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: PURCHASE_INCLUDE,
    });

    if (!purchase) {
      throw new NotFoundException(`Compra ${id} não encontrada.`);
    }

    return purchase;
  }

  /** Retorna a soma total e a quantidade de compras registradas no dia atual. */
  async getTodayStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [count, totalResult] = await this.prisma.$transaction([
      this.prisma.purchase.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(total_cost), 0)::FLOAT AS total
        FROM purchases
        WHERE created_at >= ${todayStart}
      `,
    ]);

    return {
      count,
      total: totalResult[0]?.total ?? 0,
    };
  }
}
