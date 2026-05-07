import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('stock-movements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockService: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar entrada/saída de estoque' })
  @ApiResponse({
    status: 201,
    description: 'Movimentação registrada e saldo atualizado.',
  })
  create(@Body() createDto: CreateStockMovementDto, @Request() req) {
    // Pega o ID do usuário logado do token
    return this.stockService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar histórico de movimentações' })
  @ApiQuery({
    name: 'productId',
    required: false,
    description: 'Filtrar por produto',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrar por tipo de movimentação (ENTRY, EXIT, ADJUSTMENT)',
  })
  @ApiResponse({ status: 200, type: PageDto })
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    return this.stockService.findAll(pageOptionsDto, productId, type);
  }
}
