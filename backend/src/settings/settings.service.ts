import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new NotFoundException(
        `Configuração com chave '${key}' não encontrada.`,
      );
    }
    return setting;
  }

  async update(key: string, updateSettingDto: UpdateSettingDto) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value: updateSettingDto.value },
      create: { key, value: updateSettingDto.value },
    });
  }
}
