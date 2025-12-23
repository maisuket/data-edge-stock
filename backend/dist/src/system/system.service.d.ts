import { OnModuleInit } from '@nestjs/common';
import archiver from 'archiver';
export declare class SystemService implements OnModuleInit {
    private readonly logger;
    getDatabasePath(): string;
    createBackupStream(): archiver.Archiver;
    createLocalBackup(prefix: string): Promise<void>;
    onModuleInit(): void;
    handleDailyBackup(): void;
    private cleanOldBackups;
}
