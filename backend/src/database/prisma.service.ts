import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserEntity } from 'src/users/entities/user.entity';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
// IMPORTANTE: Ajuste o caminho abaixo se o seu PrismaService estiver em outro local
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from 'src/auth/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService, // <--- INJEÇÃO QUE FALTAVA
  ) {}

  // 1. Valida o usuário (verifica usuario e senha)
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);

    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 2. Gera o Token JWT
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string): Promise<UserEntity> {
    // Agora 'this.prisma' existe e funcionará
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return new UserEntity(user);
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserEntity> {
    const data: any = { ...updateDto };

    // Remove campos sensíveis ou proibidos de alteração via perfil
    delete data.role;

    // Se a senha foi enviada, criptografa antes de salvar
    if (updateDto.password) {
      data.password = await bcrypt.hash(updateDto.password, 10);
    } else {
      // Se a senha vier vazia ou undefined, remove do objeto para não apagar a senha atual
      delete data.password;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return new UserEntity(updatedUser);
  }
}
