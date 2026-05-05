import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductionDto {
  @ApiProperty({
    example: 'uuid-do-produto',
    description: 'ID do produto a ser produzido (deve ter receita cadastrada)',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 20,
    description: 'Quantidade de unidades a produzir',
  })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Lote para evento do fim de semana',
    description: 'Observações sobre a produção',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
