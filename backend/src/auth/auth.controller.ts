import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from '../users/dto/update-user.dto';

// Interface mínima para operações de cookie (evita TS1272 com emitDecoratorMetadata)
interface CookieReply {
  setCookie(name: string, value: string, opts: Record<string, unknown>): void;
  clearCookie(name: string, opts: Record<string, unknown>): void;
}

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 86400; // 1 dia em segundos

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: CookieReply,
  ) {
    const { access_token, user } = await this.authService.login(loginDto);

    // Define o cookie HttpOnly — não acessível via JavaScript no browser
    res.setCookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realizar logout e invalidar cookie de sessão' })
  logout(@Res({ passthrough: true }) res: CookieReply) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logout realizado com sucesso.' };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.authService.getProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Atualizar perfil do usuário logado' })
  updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.authService.updateProfile(req.user.userId, updateDto);
  }
}
