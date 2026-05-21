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
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
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
    // Delega ao UsersService a responsabilidade de buscar no banco de dados.
    const user = await this.usersService.findOne(userId);

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return user instanceof UserEntity ? user : new UserEntity(user);
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserEntity> {
    // Remove campos sensíveis para evitar elevação de privilégios.
    const { role, username, ...safeUpdateDto } = updateDto;

    // Delega ao UsersService a responsabilidade de aplicar hash e salvar no banco.
    // Passamos um ator simulando que o próprio usuário está efetuando a ação.
    const updatedUser = await this.usersService.update(
      userId,
      safeUpdateDto as UpdateUserDto,
      {
        id: userId,
        role: Role.USER,
      },
    );

    return updatedUser instanceof UserEntity
      ? updatedUser
      : new UserEntity(updatedUser);
  }
}
