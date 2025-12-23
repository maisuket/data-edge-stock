import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express'; // Importante para tipar o res
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { FastifyReply } from 'fastify';

@ApiTags('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('products/excel')
  @ApiOperation({ summary: 'Baixar relatório de produtos em Excel' })
  async downloadExcel(@Res() res: FastifyReply) {
    const buffer = await this.reportsService.getProductsExcel();

    // Configura headers para download
    res
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header('Content-Disposition', 'attachment; filename=estoque.xlsx')
      .header('Content-Length', buffer.byteLength);

    // Envia o arquivo
    res.send(Buffer.from(buffer));
  }

  @Get('products/pdf')
  @ApiOperation({ summary: 'Baixar relatório de produtos em PDF' })
  async downloadPdf(@Res() res: FastifyReply) {
    const buffer = await this.reportsService.getProductsPdf();

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'attachment; filename=estoque.pdf');
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Length', buffer.byteLength);

    res.send(buffer);
  }
}
