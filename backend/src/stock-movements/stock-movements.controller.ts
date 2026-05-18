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
import { IsOptional, IsString } from 'class-validator';

export class StockMovementQueryDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

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
    name: 'ingredientId',
    required: false,
    description: 'Filtrar por insumo',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrar por tipo de movimentação (ENTRY, EXIT, ADJUSTMENT)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data de início do filtro (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data final do filtro (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, type: PageDto })
  findAll(@Query() queryDto: StockMovementQueryDto) {
    return this.stockService.findAll(
      queryDto,
      queryDto.productId,
      queryDto.ingredientId,
      queryDto.type,
      queryDto.startDate,
      queryDto.endDate,
    );
  }
}
