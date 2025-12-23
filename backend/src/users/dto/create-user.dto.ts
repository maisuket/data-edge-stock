import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@email.com',
    description: 'Email único do usuário',
  })
  @IsEmail({}, { message: 'O email fornecido é inválido' })
  email: string;

  @ApiProperty({ example: 'john.doe', description: 'Nome de usuário único.' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'John Doe', description: 'Nome completo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '123456',
    description: 'Senha (mínimo 6 caracteres)',
  })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsString()
  @IsOptional()
  role?: string;
}
