"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const PdfPrinter = require('pdfmake');
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProductsExcel() {
        const products = await this.prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Produtos');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nome', key: 'name', width: 30 },
            { header: 'Categoria', key: 'category', width: 20 },
            { header: 'Cód. Interno', key: 'internalCode', width: 15 },
            { header: 'Estoque', key: 'currentStock', width: 10 },
            { header: 'Preço Custo', key: 'costPrice', width: 15 },
            { header: 'Valor Total', key: 'totalValue', width: 15 },
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        products.forEach((p) => {
            worksheet.addRow({
                id: p.id.substring(0, 8),
                name: p.name,
                category: p.category,
                internalCode: p.internalCode,
                currentStock: p.currentStock,
                costPrice: p.costPrice,
                totalValue: p.currentStock * p.costPrice,
            });
        });
        return await workbook.xlsx.writeBuffer();
    }
    async getProductsPdf() {
        const products = await this.prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique',
            },
        };
        const printer = new PdfPrinter(fonts);
        const docDefinition = {
            defaultStyle: { font: 'Helvetica' },
            content: [
                { text: 'Relatório de Posição de Estoque', style: 'header' },
                {
                    text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
                    style: 'subheader',
                },
                {
                    style: 'tableExample',
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Produto', style: 'tableHeader' },
                                { text: 'Categoria', style: 'tableHeader' },
                                { text: 'Qtd.', style: 'tableHeader' },
                                { text: 'Custo UN', style: 'tableHeader' },
                                { text: 'Total', style: 'tableHeader' },
                            ],
                            ...products.map((p) => [
                                p.name,
                                p.category,
                                p.currentStock.toString(),
                                `R$ ${p.costPrice.toFixed(2)}`,
                                `R$ ${(p.currentStock * p.costPrice).toFixed(2)}`,
                            ]),
                        ],
                    },
                    layout: 'lightHorizontalLines',
                },
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                subheader: { fontSize: 12, italics: true, margin: [0, 0, 0, 20] },
                tableHeader: { bold: true, fontSize: 12, color: 'black' },
                tableExample: { margin: [0, 5, 0, 15] },
            },
        };
        return new Promise((resolve, reject) => {
            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks = [];
            pdfDoc.on('data', (chunk) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.end();
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map