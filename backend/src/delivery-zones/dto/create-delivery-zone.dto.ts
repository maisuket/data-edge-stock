import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 5, description: 'Taxa de entrega para o bairro' })
  @IsNumber()
  @Min(0)
  fee: number;
}
