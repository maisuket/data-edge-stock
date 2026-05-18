import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

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
        username: user.username,
      },
    };
  }

  async getProfile(userId: string): Promise<UserEntity> {
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
    // role e username não podem ser alterados pelo próprio usuário via perfil.
    const { role, username, password, ...rest } = updateDto;
    const updateData: Omit<Partial<UpdateUserDto>, 'role' | 'username'> = {
      ...rest,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    } else {
      // Garante que uma senha vazia ou indefinida não apague a senha existente.
      delete updateData.password;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData, // `role` e `username` foram omitidos e não serão atualizados
    });

    return new UserEntity(updatedUser);
  }
}
