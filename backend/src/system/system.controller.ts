import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import type { FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('backup')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Baixar backup do banco de dados (ZIP)' })
  downloadBackup(@Res() res: FastifyReply) {
    const stream = this.systemService.createBackupStream();
    const filename = `backup_estoque_${new Date().toISOString().split('T')[0]}.zip`;

    res.header('Content-Type', 'application/zip');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);

    // Envia o stream para o Fastify lidar
    return res.send(stream);
  }
}
