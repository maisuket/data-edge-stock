import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class PriceTierItemDto {
  @ApiProperty({
    example: 5,
    description: 'A partir de quantas unidades esse preço passa a valer',
  })
  @IsNumber()
  @Min(0.001)
  minQuantity: number;

  @ApiProperty({ example: 10, description: 'Preço por unidade nessa faixa' })
  @IsNumber()
  @Min(0.01)
  unitPrice: number;
}

export class SetPriceTiersDto {
  @ApiProperty({
    example: true,
    description: 'Liga ou desliga a promoção sem apagar a configuração',
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [PriceTierItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceTierItemDto)
  tiers: PriceTierItemDto[];
}
