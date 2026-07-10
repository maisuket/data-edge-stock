import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar clientes (paginado, ordenado por nº de pedidos)',
    description:
      'Cadastro agregado por telefone, atualizado automaticamente a cada pedido do cardápio. Somente leitura.',
  })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.customersService.findAll(pageOptionsDto);
  }
}
