import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar pedido (rota pública do cardápio)',
    description:
      'Valida estoque, debita automaticamente e gera um número de pedido. Não exige autenticação — usada pelo cardápio público.',
  })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Estoque insuficiente ou produto sem preço definido.',
  })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar pedidos (paginado, admin)' })
  findAll(@Query() queryDto: OrderQueryDto) {
    return this.ordersService.findAll(queryDto, queryDto.status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhar pedido com itens (admin)' })
  @ApiParam({ name: 'id', description: 'UUID do pedido' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Editar contato, entrega e/ou itens de um pedido (admin)',
    description:
      'Editar itens estorna o estoque antigo e debita o novo. Editar itens ou entrega invalida um link de pagamento já gerado. Não é permitido em pedidos cancelados ou concluídos.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar status do pedido (admin)',
    description:
      'Ao cancelar um pedido ainda não cancelado, o estoque dos itens é devolvido automaticamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Post(':id/payment-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gerar link de pagamento Mercado Pago para o pedido (admin)',
    description:
      'Cria uma preferência de Checkout Pro (Pix/débito/crédito) e retorna o link pronto para enviar ao cliente. Não confirma pagamento automaticamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido' })
  generatePaymentLink(@Param('id') id: string) {
    return this.ordersService.generatePaymentLink(id);
  }
}
