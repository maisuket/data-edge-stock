import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { ProductionsService } from './productions.service';

@ApiTags('productions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar lote de produção',
    description:
      'Valida estoque dos insumos, deduz automaticamente, calcula custo real e incrementa o produto. Tudo em transação.',
  })
  @ApiResponse({ status: 201, description: 'Produção registrada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Estoque insuficiente ou receita não cadastrada.',
  })
  create(
    @Body() dto: CreateProductionDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.productionsService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produções (paginado)' })
  @ApiQuery({
    name: 'productId',
    required: false,
    description: 'Filtrar por produto',
  })
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('productId') productId?: string,
  ) {
    return this.productionsService.findAll(pageOptionsDto, productId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhar produção (com consumos e margem de lucro)',
  })
  @ApiParam({ name: 'id', description: 'UUID da produção' })
  findOne(@Param('id') id: string) {
    return this.productionsService.findOne(id);
  }
}
