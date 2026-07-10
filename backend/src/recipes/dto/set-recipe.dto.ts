import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeItemDto {
  @ApiProperty({
    example: 'uuid-do-insumo',
    description: 'ID do insumo (Ingredient)',
  })
  @IsUUID()
  ingredientId: string;

  @ApiProperty({
    example: 0.5,
    description:
      'Quantidade do insumo necessária por lote (rendimento) da receita',
  })
  @IsNumber()
  @Min(0.001)
  quantity: number;
}

export class SetRecipeDto {
  @ApiProperty({
    type: [RecipeItemDto],
    description:
      'Lista completa de ingredientes da receita. Substitui a receita anterior integralmente.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];

  @ApiPropertyOptional({
    example: 2,
    description:
      'Quantas unidades do produto uma execução da receita produz (rendimento). Padrão: 1.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  yieldQuantity?: number;

  @ApiPropertyOptional({
    example: 15.5,
    description:
      'Preço de venda do produto. Se enviado, atualiza o cadastro principal.',
  })
  @IsOptional()
  @IsNumber()
  salePrice?: number | null;
}
