import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IngredientUnit } from '../enums/ingredient-unit.enum';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Leite Integral', description: 'Nome do insumo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: IngredientUnit,
    example: IngredientUnit.LITER,
    description: 'Unidade de medida',
  })
  @IsEnum(IngredientUnit)
  unit: IngredientUnit;

  @ApiPropertyOptional({
    example: 5,
    description: 'Estoque mínimo antes de alertar',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}
