import { SystemService } from './system.service';
import type { FastifyReply } from 'fastify';
export declare class SystemController {
    private readonly systemService;
    constructor(systemService: SystemService);
    downloadBackup(res: FastifyReply): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
}
