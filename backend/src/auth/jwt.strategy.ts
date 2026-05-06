import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // CORREÇÃO: Adicionado '?? ""' para garantir que seja string e satisfazer o TypeScript
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: any) {
    // Verifica no banco de dados se o usuário do token ainda existe
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token inválido: Usuário não encontrado ou foi removido do sistema.',
      );
    }

    // O que retornarmos aqui será injetado na requisição como `req.user`
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}
