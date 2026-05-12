import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar uma nova venda (Frente de Caixa)' })
  create(
    @Body() createSaleDto: CreateSaleDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.salesService.create(createSaleDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vendas realizadas (Paginado)' })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.salesService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma venda pelo ID' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
