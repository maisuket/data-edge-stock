import { ReportsService } from './reports.service';
import type { FastifyReply } from 'fastify';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    downloadExcel(res: FastifyReply): Promise<void>;
    downloadPdf(res: FastifyReply): Promise<void>;
}
