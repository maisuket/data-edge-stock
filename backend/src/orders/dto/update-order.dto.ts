import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Nome do cliente', example: 'Maria' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    description:
      'Telefone/WhatsApp do cliente, apenas dígitos, com DDI (ex: 5592991433005)',
    example: '5592991433005',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Telefone inválido. Envie apenas dígitos, com DDI.',
  })
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Observações do pedido' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: DeliveryType })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({
    description: 'Bairro para entrega — obrigatório se deliveryType = DELIVERY',
    example: 'Centro',
  })
  @IsOptional()
  @IsString()
  deliveryNeighborhood?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    type: [CreateOrderItemDto],
    description:
      'Lista completa de itens do pedido. Se enviada, substitui os itens atuais (estorna estoque antigo, debita o novo).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
