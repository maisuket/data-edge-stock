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

export class CreateSaleItemDto {
  @ApiProperty({ description: 'ID do produto vendido' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantidade vendida do produto', example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({ type: [CreateSaleItemDto], description: 'Itens da venda' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiPropertyOptional({
    description: 'Desconto financeiro aplicado na venda',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Observações internas da venda' })
  @IsOptional()
  @IsString()
  notes?: string;
}
