import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

// Chaves de branding/contato usadas sem login (tela de login e cardápio
// público). Qualquer outra chave só pode ser lida por um usuário autenticado
// — evita que uma futura chave sensível vire leitura pública por acidente.
const PUBLIC_SETTING_KEYS = new Set([
  'LOGIN_IMAGE_URL',
  'SIDEBAR_LOGO_URL',
  'WHATSAPP_NUMBER',
  'STORE_NAME',
]);

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Rota pública (sem guard) — só serve as chaves do allowlist acima
  // (tela de login/cardápio). Qualquer outra chave retorna 404, como se
  // não existisse, para não vazar a existência de configurações internas.
  @Get(':key')
  @ApiOperation({ summary: 'Buscar uma configuração pela chave (pública)' })
  @ApiResponse({ status: 200, description: 'Configuração encontrada.' })
  findOne(@Param('key') key: string) {
    if (!PUBLIC_SETTING_KEYS.has(key)) {
      throw new NotFoundException(
        `Configuração com chave '${key}' não encontrada.`,
      );
    }
    return this.settingsService.findOne(key);
  }

  // PUT é protegido e restrito ao super admin (identidade/marca da instância)
  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar ou criar uma configuração (Upsert)' })
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.update(key, updateSettingDto);
  }
}
