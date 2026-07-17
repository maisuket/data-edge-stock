import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { SetRecipeDto } from './dto/set-recipe.dto';
import { RecipesService } from './recipes.service';

@ApiTags('recipes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post(':productId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Definir receita de um produto',
    description:
      'Substitui a receita inteiramente e recalcula automaticamente o custo de produção.',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  @ApiResponse({
    status: 201,
    description: 'Receita salva e custo atualizado.',
  })
  setRecipe(@Param('productId') productId: string, @Body() dto: SetRecipeDto) {
    return this.recipesService.setRecipe(productId, dto);
  }

  @Get(':productId')
  @ApiOperation({
    summary: 'Consultar receita e custo de produção de um produto',
    description:
      'Retorna ingredientes, quantidades, custo por item, custo total e margem de lucro.',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  getRecipe(@Param('productId') productId: string) {
    return this.recipesService.getRecipe(productId);
  }

  @Post(':productId/refresh-cost')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Recalcular custo do produto',
    description:
      'Atualiza o costPrice do produto com base nos custos médios atuais dos insumos. Útil após novas compras.',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  refreshCost(@Param('productId') productId: string) {
    return this.recipesService.refreshProductCost(productId);
  }
}
