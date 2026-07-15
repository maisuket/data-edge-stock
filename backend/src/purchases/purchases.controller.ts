import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('stats/today')
  @ApiOperation({ summary: 'Estatísticas de compras do dia atual' })
  getTodayStats() {
    return this.purchasesService.getTodayStats();
  }

  @Get()
  @ApiOperation({ summary: 'Listar compras registradas (Paginado)' })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.purchasesService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma compra pelo ID' })
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }
}
