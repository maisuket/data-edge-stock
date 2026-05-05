import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MovementType } from '../enums/movement-type.enum';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'ID do Produto' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ enum: MovementType, example: MovementType.ENTRY })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({
    example: 10,
    description:
      'Quantidade a movimentar. Positivo para ENTRADA/SAÍDA. ' +
      'Para AJUSTE pode ser negativo (redução de inventário) ou positivo (acréscimo).',
  })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Nota Fiscal 123' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Preço unitário de entrada (para cálculo de custo médio)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  entryPrice?: number;

  @ApiPropertyOptional({ description: 'Número do Lote' })
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional({ description: 'Data de Validade (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'ID do Fornecedor (Apenas Entradas)' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
