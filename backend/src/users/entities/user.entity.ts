export class User {}
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ example: 'uuid-1234-5678' })
  id: string;

  @ApiProperty({ example: 'john.doe' })
  username: string;

  @ApiProperty({ example: 'john.doe@email.com', required: false })
  email: string | null;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @Exclude() // <--- A Mágica: Isso instrui o Nest a NUNCA enviar este campo no JSON
  password: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Construtor auxiliar para facilitar a conversão
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
