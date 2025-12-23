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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const page_dto_1 = require("../common/dto/page.dto");
const page_meta_dto_1 = require("../common/dto/page-meta.dto");
const role_enum_1 = require("../auth/enums/role.enum");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    findByEmail(username) {
        throw new Error('Method not implemented.');
    }
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createUserDto) {
        const userExists = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: createUserDto.email },
                    { username: createUserDto.username },
                ],
            },
        });
        if (userExists) {
            this.logger.warn(`Tentativa de cadastro duplicado: ${createUserDto.email}`);
            throw new common_1.ConflictException('Email ou Username já cadastrados.');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                ...createUserDto,
                password: hashedPassword,
            },
        });
        return new user_entity_1.UserEntity(user);
    }
    async findAll(pageOptionsDto) {
        const queryBuilder = this.prisma.user;
        const [users, itemCount] = await this.prisma.$transaction([
            queryBuilder.findMany({
                skip: pageOptionsDto.skip,
                take: pageOptionsDto.take,
                orderBy: {
                    createdAt: pageOptionsDto.order,
                },
            }),
            queryBuilder.count(),
        ]);
        const pageMetaDto = new page_meta_dto_1.PageMetaDto({ itemCount, pageOptionsDto });
        const entities = users.map((user) => new user_entity_1.UserEntity(user));
        return new page_dto_1.PageDto(entities, pageMetaDto);
    }
    async findByUsername(username) {
        return this.prisma.user.findUnique({ where: { username } });
    }
    findOne(id) {
        return `This action returns a #${id} user`;
    }
    async update(id, updateUserDto, currentUser) {
        if (id !== currentUser.id && currentUser.role !== role_enum_1.Role.Admin) {
            throw new common_1.ForbiddenException('Você não tem permissão para alterar dados de outro usuário.');
        }
        const data = { ...updateUserDto };
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        if (data.role && currentUser.role !== role_enum_1.Role.Admin) {
            delete data.role;
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
        });
        return new user_entity_1.UserEntity(user);
    }
    async remove(id, currentUserId) {
        if (id === currentUserId) {
            throw new common_1.ForbiddenException('Você não pode excluir sua própria conta.');
        }
        return this.prisma.user.delete({ where: { id } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map