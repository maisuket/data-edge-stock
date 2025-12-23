"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SystemService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const archiver_1 = __importDefault(require("archiver"));
const schedule_1 = require("@nestjs/schedule");
let SystemService = SystemService_1 = class SystemService {
    logger = new common_1.Logger(SystemService_1.name);
    getDatabasePath() {
        let dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            this.logger.warn('DATABASE_URL não definida. Tentando caminho padrão de dev.');
            dbUrl = 'file:./prisma/dev.db';
        }
        let dbPath = dbUrl.replace('file:', '');
        if (!path.isAbsolute(dbPath)) {
            dbPath = path.resolve(process.cwd(), dbPath);
        }
        this.logger.log(`Tentando fazer backup do banco em: ${dbPath}`);
        return dbPath;
    }
    createBackupStream() {
        const dbPath = this.getDatabasePath();
        let finalPath = dbPath;
        if (!fs.existsSync(finalPath)) {
            const alternativePath = path.resolve(process.cwd(), '../backend/prisma/dev.db');
            if (fs.existsSync(alternativePath)) {
                finalPath = alternativePath;
            }
            else {
                this.logger.error(`Banco de dados não encontrado em: ${dbPath}`);
                throw new common_1.InternalServerErrorException('Arquivo de banco de dados não encontrado.');
            }
        }
        this.logger.log(`Gerando stream de backup do arquivo: ${finalPath}`);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 },
        });
        archive.file(finalPath, { name: 'estoque.db' });
        archive.finalize().catch((err) => {
            this.logger.error('Erro ao finalizar compressão', err);
        });
        return archive;
    }
    async createLocalBackup(prefix) {
        try {
            const dbPath = this.getDatabasePath();
            let finalPath = dbPath;
            if (!fs.existsSync(finalPath)) {
                if (fs.existsSync(path.resolve(process.cwd(), '../backend/prisma/dev.db'))) {
                    finalPath = path.resolve(process.cwd(), '../backend/prisma/dev.db');
                }
                else {
                    return;
                }
            }
            const backupDir = path.join(path.dirname(finalPath), 'backups');
            await fs.ensureDir(backupDir);
            const date = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const backupFileName = `${prefix}_backup_${date}.db`;
            const backupPath = path.join(backupDir, backupFileName);
            await fs.copy(finalPath, backupPath);
            this.logger.log(`✅ Backup automático (${prefix}) criado em: ${backupPath}`);
            void this.cleanOldBackups(backupDir, prefix);
        }
        catch (error) {
            this.logger.error(`❌ Falha no backup automático: ${error.message}`);
        }
    }
    onModuleInit() {
        setTimeout(() => {
            void this.createLocalBackup('startup');
        }, 5000);
    }
    handleDailyBackup() {
        void this.createLocalBackup('daily');
    }
    async cleanOldBackups(dir, prefix) {
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
                    this.logger.log(`🗑️ Backup antigo removido: ${file.name}`);
                }
            }
        }
        catch (e) {
        }
    }
};
exports.SystemService = SystemService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SystemService.prototype, "handleDailyBackup", null);
exports.SystemService = SystemService = SystemService_1 = __decorate([
    (0, common_1.Injectable)()
], SystemService);
//# sourceMappingURL=system.service.js.map