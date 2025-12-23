import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@ApiTags('products')
@UseGuards(JwtAuthGuard, RolesGuard) // Protege TODAS as rotas de produtos
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar produto' })
  @ApiResponse({ status: 201, description: 'Produto criado.' })
  @ApiResponse({
    status: 409,
    description: 'Código ou Código de Barras já existe.',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos paginados' })
  @ApiResponse({ status: 200, type: PageDto })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.productsService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Remover produto' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Estatísticas do Dashboard' })
  getDashboardStats() {
    return this.productsService.getDashboardStats();
  }
}
