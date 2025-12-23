import type { FastifyRequest } from 'fastify';
import { SavedMultipartFile } from '@fastify/multipart';
interface FastifyMultipartRequest extends FastifyRequest {
    file: () => Promise<SavedMultipartFile | undefined>;
}
export declare class FilesController {
    uploadFile(req: FastifyMultipartRequest): Promise<{
        fileName: string;
        filePath: string;
        fileType: string;
    }>;
    deleteFile(filePath: string): {
        message: string;
    };
}
export {};
