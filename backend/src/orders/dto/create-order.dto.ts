import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID do produto pedido' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantidade pedida do produto', example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto], description: 'Itens do pedido' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Nome do cliente', example: 'Maria' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({
    description:
      'Telefone/WhatsApp do cliente, apenas dígitos, com DDI (ex: 5592991433005)',
    example: '5592991433005',
  })
  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Telefone inválido. Envie apenas dígitos, com DDI.',
  })
  customerPhone: string;

  @ApiPropertyOptional({
    description: 'Observações do cliente sobre o pedido',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: DeliveryType, example: DeliveryType.PICKUP })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiPropertyOptional({
    description: 'Bairro para entrega — obrigatório quando deliveryType = DELIVERY',
    example: 'Centro',
  })
  @IsOptional()
  @IsString()
  deliveryNeighborhood?: string;
}
