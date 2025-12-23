import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
export declare class HealthController {
    private health;
    private prismaHealth;
    private memory;
    constructor(health: HealthCheckService, prismaHealth: PrismaHealthIndicator, memory: MemoryHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
