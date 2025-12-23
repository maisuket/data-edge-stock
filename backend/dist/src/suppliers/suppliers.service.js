"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const page_dto_1 = require("../common/dto/page.dto");
const page_meta_dto_1 = require("../common/dto/page-meta.dto");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createSupplierDto) {
        return this.prisma.supplier.create({ data: createSupplierDto });
    }
    async findAll(pageOptionsDto) {
        const { q } = pageOptionsDto;
        const where = q
            ? {
                OR: [{ name: { contains: q } }, { cnpj: { contains: q } }],
            }
            : {};
        const [suppliers, itemCount] = await this.prisma.$transaction([
            this.prisma.supplier.findMany({
                where,
                skip: pageOptionsDto.skip,
                take: pageOptionsDto.take,
                orderBy: { name: 'asc' },
            }),
            this.prisma.supplier.count({ where }),
        ]);
        const pageMetaDto = new page_meta_dto_1.PageMetaDto({ itemCount, pageOptionsDto });
        return new page_dto_1.PageDto(suppliers, pageMetaDto);
    }
    async findOne(id) {
        return this.prisma.supplier.findUnique({ where: { id } });
    }
    async update(id, updateDto) {
        return this.prisma.supplier.update({ where: { id }, data: updateDto });
    }
    async remove(id) {
        return this.prisma.supplier.delete({ where: { id } });
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map