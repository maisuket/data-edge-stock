import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
export declare class PrismaHealthIndicator extends HealthIndicator {
    private readonly prismaService;
    constructor(prismaService: PrismaService);
    isHealthy(key: string): Promise<HealthIndicatorResult>;
}
