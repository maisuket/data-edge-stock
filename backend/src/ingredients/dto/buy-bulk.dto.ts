import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BuyBulkItemDto {
  @ApiProperty({ example: 'uuid-do-insumo', description: 'ID do insumo' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 10, description: 'Quantidade comprada' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 150.5, description: 'Custo total deste insumo' })
  @IsNumber()
  @Min(0.01)
  totalCost: number;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Data de validade do insumo' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Nestlé', description: 'Marca do insumo' })
  @IsOptional()
  @IsString()
  brand?: string;
}

export class BuyBulkDto {
  @ApiProperty({
    type: [BuyBulkItemDto],
    description: 'Lista de insumos comprados',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuyBulkItemDto)
  items: BuyBulkItemDto[];

  @ApiPropertyOptional({
    example: 'Fornecedor XYZ',
    description: 'Nome do fornecedor',
  })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({
    example: 'Nota fiscal nº 12345',
    description: 'Observações',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
