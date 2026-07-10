import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bairros disponíveis para o cardápio público escolher. */
  async findPublic() {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { active: true },
      orderBy: { neighborhood: 'asc' },
    });
    return zones.map((z) => ({ ...z, fee: z.fee.toNumber() }));
  }

  /** Todos os bairros (ativos e inativos), para a tela de gerenciamento. */
  async findAll() {
    const zones = await this.prisma.deliveryZone.findMany({
      orderBy: { neighborhood: 'asc' },
    });
    return zones.map((z) => ({ ...z, fee: z.fee.toNumber() }));
  }

  async create(dto: CreateDeliveryZoneDto) {
    const zone = await this.prisma.deliveryZone.create({ data: dto });
    return { ...zone, fee: zone.fee.toNumber() };
  }

  async update(id: string, dto: UpdateDeliveryZoneDto) {
    const existing = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Bairro ${id} não encontrado.`);
    }

    const zone = await this.prisma.deliveryZone.update({
      where: { id },
      data: dto,
    });
    return { ...zone, fee: zone.fee.toNumber() };
  }

  async remove(id: string) {
    const existing = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Bairro ${id} não encontrado.`);
    }

    await this.prisma.deliveryZone.delete({ where: { id } });
    return { success: true };
  }
}
