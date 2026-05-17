import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class BuyLotDto {
  @ApiProperty({
    example: 10,
    description: 'Quantidade comprada (em unidade do insumo)',
  })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({
    example: 50,
    description:
      'Valor total da compra (R$). O custo unitário é calculado automaticamente.',
  })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiPropertyOptional({
    example: 'LOTE-2024-001',
    description: 'Número do lote. Gerado automaticamente se omitido.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lotNumber?: string;

  @ApiPropertyOptional({
    example: 'uuid-do-fornecedor',
    description: 'ID do fornecedor',
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Data de vencimento do lote (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: 'Nestlé',
    description: 'Marca do produto/insumo',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    example: 'uuid-do-usuario',
    description: 'ID do usuário que realizou a compra',
  })
  @IsString()
  userId: string;
}
