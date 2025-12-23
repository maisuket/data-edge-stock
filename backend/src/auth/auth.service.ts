import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Valida o usuário (verifica email e senha)
  async validateUser(username: string, pass: string): Promise<any> {
    // Busca usuário no banco (precisamos criar um método findOneByEmail no UsersService depois)
    // Por enquanto, vamos usar o prisma service injetado no UsersService se ele expuser,
    // ou melhor: vamos adicionar um método helper no UsersService.
    const user = await this.usersService.findByUsername(username);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 2. Gera o Token JWT
  async login(loginDto: LoginDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
}
