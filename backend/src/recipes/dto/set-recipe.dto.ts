import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
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
    description: 'Quantidade do insumo necessária para produzir 1 unidade do produto',
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
}
