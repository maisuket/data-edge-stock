import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs-extra';
import archiver from 'archiver';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);

  getDatabasePath(): string {
    // 1. Tenta pegar da variável de ambiente (definida no electron/main.ts ou .env)
    let dbUrl = process.env.DATABASE_URL;

    // Se não tiver, tenta um fallback padrão de desenvolvimento
    if (!dbUrl) {
      this.logger.warn(
        'DATABASE_URL não definida. Tentando caminho padrão de dev.',
      );
      dbUrl = 'file:./prisma/dev.db';
    }

    // Remove o prefixo "file:"
    let dbPath = dbUrl.replace('file:', '');

    // 2. Resolve o caminho absoluto
    if (!path.isAbsolute(dbPath)) {
      // Se estamos rodando dentro do Electron (produção), o diretório atual pode variar.
      // Em desenvolvimento (npm start), process.cwd() é a pasta raiz do backend.
      dbPath = path.resolve(process.cwd(), dbPath);
    }

    this.logger.log(`Tentando fazer backup do banco em: ${dbPath}`);
    return dbPath;
  }

  createBackupStream() {
    const dbPath = this.getDatabasePath();

    // Verifica se existe no caminho principal ou alternativo
    let finalPath = dbPath;
    if (!fs.existsSync(finalPath)) {
      const alternativePath = path.resolve(
        process.cwd(),
        '../backend/prisma/dev.db',
      );
      if (fs.existsSync(alternativePath)) {
        finalPath = alternativePath;
      } else {
        this.logger.error(`Banco de dados não encontrado em: ${dbPath}`);
        throw new InternalServerErrorException(
          'Arquivo de banco de dados não encontrado.',
        );
      }
    }

    this.logger.log(`Gerando stream de backup do arquivo: ${finalPath}`);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    // Adiciona o arquivo
    archive.file(finalPath, { name: 'estoque.db' });

    // IMPORTANTE: Finaliza o arquivo, mas NÃO await aqui para não travar o stream se não tiver ninguém lendo ainda.
    // O catch evita que o node quebre se der erro na compressão.
    archive.finalize().catch((err) => {
      this.logger.error('Erro ao finalizar compressão', err);
    });

    return archive;
  }

  async createLocalBackup(prefix: string) {
    try {
      const dbPath = this.getDatabasePath();
      // Em dev, pode falhar se o caminho não for exato, então tentamos achar o arquivo real
      let finalPath = dbPath;
      if (!fs.existsSync(finalPath)) {
        // Tenta resolver caminho relativo comum em monorepo
        if (
          fs.existsSync(path.resolve(process.cwd(), '../backend/prisma/dev.db'))
        ) {
          finalPath = path.resolve(process.cwd(), '../backend/prisma/dev.db');
        } else {
          return; // Silenciosamente falha em dev se não achar, para não poluir log
        }
      }

      const backupDir = path.join(path.dirname(finalPath), 'backups');
      await fs.ensureDir(backupDir);

      const date = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupFileName = `${prefix}_backup_${date}.db`;
      const backupPath = path.join(backupDir, backupFileName);

      await fs.copy(finalPath, backupPath);
      this.logger.log(
        `✅ Backup automático (${prefix}) criado em: ${backupPath}`,
      );

      void this.cleanOldBackups(backupDir, prefix);
    } catch (error) {
      this.logger.error(`❌ Falha no backup automático: ${error.message}`);
    }
  }

  onModuleInit() {
    // Aguarda 5 segundos após o boot para não pesar na inicialização
    setTimeout(() => {
      void this.createLocalBackup('startup');
    }, 5000);
  }

  // CRON JOB: Roda todos os dias à meia-noite (se o app estiver aberto)
  // Ou use CronExpression.EVERY_HOUR para rodar de hora em hora
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyBackup() {
    void this.createLocalBackup('daily');
  }

  private async cleanOldBackups(dir: string, prefix: string) {
    try {
      const files = await fs.readdir(dir);
      const backups = files
        .filter((f) => f.startsWith(prefix) && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(dir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > 5) {
        const toDelete = backups.slice(5);
        for (const file of toDelete) {
          await fs.remove(path.join(dir, file.name));
          this.logger.log(`Backup antigo removido: ${file.name}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Falha na rotina de limpeza de backups (${prefix}): ${(e as Error).message}`);
    }
  }
}
