import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Valor da configuração em formato de string' })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
