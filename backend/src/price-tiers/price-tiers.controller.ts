import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { SetPriceTiersDto } from './dto/set-price-tiers.dto';
import { PriceTiersService } from './price-tiers.service';

@ApiTags('price-tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('price-tiers')
export class PriceTiersController {
  constructor(private readonly priceTiersService: PriceTiersService) {}

  @Get(':productId')
  @ApiOperation({
    summary: 'Consultar a promoção por quantidade de um produto',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  getPriceTiers(@Param('productId') productId: string) {
    return this.priceTiersService.getPriceTiers(productId);
  }

  @Post(':productId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Definir (substituir) a promoção por quantidade de um produto',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  setPriceTiers(
    @Param('productId') productId: string,
    @Body() dto: SetPriceTiersDto,
  ) {
    return this.priceTiersService.setPriceTiers(productId, dto);
  }
}
