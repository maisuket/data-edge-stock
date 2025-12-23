import { Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: createSupplierDto });
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { q } = pageOptionsDto;
    const where: any = q
      ? {
          OR: [{ name: { contains: q } }, { cnpj: { contains: q } }],
        }
      : {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [suppliers, itemCount] = await this.prisma.$transaction([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.prisma.supplier.findMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: { name: 'asc' },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      this.prisma.supplier.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(suppliers, pageMetaDto);
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  async update(id: string, updateDto: UpdateSupplierDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.supplier.update({ where: { id }, data: updateDto });
  }

  async remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.supplier.delete({ where: { id } });
  }
}
