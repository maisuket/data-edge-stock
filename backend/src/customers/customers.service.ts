import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Clientes mais frequentes primeiro — útil pra futura segmentação/promoções. */
  async findAll(pageOptionsDto: PageOptionsDto) {
    const [customers, itemCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { orderCount: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(customers, pageMetaDto);
  }
}
