import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrismaModule, // Importante importar para usar o PrismaService
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
