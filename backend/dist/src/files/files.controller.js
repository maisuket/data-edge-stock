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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const stream_1 = require("stream");
const path_1 = require("path");
const pump = util.promisify(stream_1.pipeline);
let FilesController = class FilesController {
    async uploadFile(req) {
        if (!req.isMultipart()) {
            throw new common_1.BadRequestException('A requisição não é multipart/form-data');
        }
        try {
            const data = await req.file();
            if (!data) {
                throw new common_1.BadRequestException('Nenhum arquivo enviado');
            }
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = data.filename.split('.').pop();
            const fileName = `upload-${uniqueSuffix}.${ext}`;
            const uploadDir = './uploads';
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = (0, path_1.join)(uploadDir, fileName);
            const writeStream = fs.createWriteStream(filePath);
            await pump(data.file, writeStream);
            if (data.file.truncated) {
                fs.unlinkSync(filePath);
                throw new common_1.BadRequestException('Arquivo muito grande. Limite excedido.');
            }
            return {
                fileName: data.filename,
                filePath: filePath,
                fileType: data.mimetype,
            };
        }
        catch (error) {
            console.error('Erro no upload:', error);
            throw new common_1.InternalServerErrorException('Falha ao processar upload: ' + error.message);
        }
    }
    deleteFile(filePath) {
        if (!filePath)
            throw new common_1.BadRequestException('Caminho do arquivo não informado');
        const normalizedPath = (0, path_1.join)(process.cwd(), filePath);
        const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads');
        if (!normalizedPath.startsWith(uploadsDir)) {
        }
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return { message: 'Arquivo apagado com sucesso' };
            }
            else {
                throw new common_1.NotFoundException('Arquivo não encontrado no disco');
            }
        }
        catch (error) {
            console.error('Erro ao apagar arquivo:', error);
            throw new common_1.InternalServerErrorException('Não foi possível apagar o arquivo');
        }
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Fazer upload de um arquivo (Fastify)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Delete)('delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Apagar arquivo do disco' }),
    (0, swagger_1.ApiBody)({
        schema: { type: 'object', properties: { filePath: { type: 'string' } } },
    }),
    __param(0, (0, common_1.Body)('filePath')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "deleteFile", null);
exports.FilesController = FilesController = __decorate([
    (0, swagger_1.ApiTags)('files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('files')
], FilesController);
//# sourceMappingURL=files.controller.js.map