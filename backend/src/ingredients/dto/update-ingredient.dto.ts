import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateIngredientDto {
  @ApiPropertyOptional({ example: 'Leite Desnatado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}
