import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator, // Verifica uso de memória RAM
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verificar status da API' })
  check() {
    return this.health.check([
      // 1. Verifica se o banco de dados responde
      () => this.prismaHealth.isHealthy('database'),

      // 2. Verifica se a memória heap não passou de 150MB (ajuste conforme necessário)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
