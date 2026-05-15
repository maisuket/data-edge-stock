import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Tenta rodar uma query simples apenas para testar a conexão
      await this.prismaService.$queryRaw`SELECT 1`;

      return this.getStatus(key, true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.getStatus(key, false, { message: errorMessage });
    }
  }
}
