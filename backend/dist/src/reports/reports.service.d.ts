import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProductsExcel(): Promise<ExcelJS.Buffer>;
    getProductsPdf(): Promise<Buffer<ArrayBufferLike>>;
}
