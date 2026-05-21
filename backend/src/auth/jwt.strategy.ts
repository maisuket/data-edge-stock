import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

// Custom function to extract JWT from the 'access_token' cookie
const fromCookie = (req: {
  cookies?: Record<string, string | undefined>;
}): string | null => {
  return req.cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'CRÍTICO: Variável de ambiente JWT_SECRET não está definida na estratégia JWT.',
      );
    }

    super({
      jwtFromRequest: fromCookie,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: { sub: string; username: string; role: string }) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
