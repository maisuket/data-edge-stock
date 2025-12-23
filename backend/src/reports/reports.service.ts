import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
// CORREÇÃO: Substituímos o import do ES6 por require para evitar o erro de falta de tipos (.d.ts)
// Isso resolve o erro TS2307/TS7016 sem precisar instalar o pacote @types/pdfmake
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

// --- SOLUÇÃO CORPORATIVA ---
// Definimos a interface localmente para evitar o erro:
// "Cannot find module 'pdfmake/interfaces'"
// Isso elimina a necessidade de instalar pacotes bloqueados na rede.
interface TDocumentDefinitions {
  content: any[];
  styles?: { [key: string]: any };
  defaultStyle?: { [key: string]: any };
  [key: string]: any;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- EXPORTAÇÃO EXCEL ---
  async getProductsExcel() {
    const products = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produtos');

    // Cabeçalho estilizado
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Cód. Interno', key: 'internalCode', width: 15 },
      { header: 'Estoque', key: 'currentStock', width: 10 },
      { header: 'Preço Custo', key: 'costPrice', width: 15 },
      { header: 'Valor Total', key: 'totalValue', width: 15 },
    ];

    // Estilo da primeira linha (Header)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Adiciona linhas
    products.forEach((p) => {
      worksheet.addRow({
        id: p.id.substring(0, 8), // ID curto
        name: p.name,
        category: p.category,
        internalCode: p.internalCode,
        currentStock: p.currentStock,
        costPrice: p.costPrice,
        totalValue: p.currentStock * p.costPrice,
      });
    });

    // Gera o buffer
    return await workbook.xlsx.writeBuffer();
  }

  // --- EXPORTAÇÃO PDF ---
  async getProductsPdf() {
    const products = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    // Definição das fontes (Padrão do PDFMake)
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const printer = new PdfPrinter(fonts);

    // Layout do Relatório
    const docDefinition: TDocumentDefinitions = {
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
              // Cabeçalho da Tabela
              [
                { text: 'Produto', style: 'tableHeader' },
                { text: 'Categoria', style: 'tableHeader' },
                { text: 'Qtd.', style: 'tableHeader' },
                { text: 'Custo UN', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' },
              ],
              // Linhas de Dados (Mapeamento)
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

    // Gera o PDF em memória e retorna o Buffer
    return new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: any[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }
}