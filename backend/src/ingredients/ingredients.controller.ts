import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { BuyLotDto } from './dto/buy-lot.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientsService } from './ingredients.service';

@ApiTags('ingredients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  // ── CRUD ──────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo insumo' })
  @ApiResponse({ status: 201, description: 'Insumo criado.' })
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar insumos (paginado)' })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.ingredientsService.findAll(pageOptionsDto);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Listar insumos com estoque abaixo do mínimo' })
  getLowStock() {
    return this.ingredientsService.getLowStockIngredients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar insumo por ID (com lotes)' })
  @ApiParam({ name: 'id', description: 'UUID do insumo' })
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar insumo (nome, estoque mínimo)' })
  update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.ingredientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover insumo (apenas se não usado em receitas)' })
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }

  // ── Lotes (Compras) ────────────────────────

  @Post(':id/buy')
  @ApiOperation({
    summary: 'Registrar compra de lote',
    description:
      'Calcula automaticamente o custo unitário e atualiza o custo médio ponderado do insumo.',
  })
  @ApiParam({ name: 'id', description: 'UUID do insumo' })
  @ApiResponse({
    status: 201,
    description: 'Lote registrado e estoque atualizado.',
  })
  buyLot(@Param('id') id: string, @Body() dto: BuyLotDto) {
    return this.ingredientsService.buyLot(id, dto);
  }
}
