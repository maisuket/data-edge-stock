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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const page_dto_1 = require("../common/dto/page.dto");
const page_meta_dto_1 = require("../common/dto/page-meta.dto");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createProductDto) {
        const { specifications, attachments, ...productData } = createProductDto;
        return this.prisma.product.create({
            data: {
                ...productData,
                specifications: {
                    create: specifications,
                },
                attachments: {
                    create: attachments,
                },
            },
            include: {
                specifications: true,
                attachments: true,
            },
        });
    }
    async findAll(pageOptionsDto) {
        const queryBuilder = this.prisma.product;
        const { q } = pageOptionsDto;
        const where = q
            ? {
                OR: [
                    { name: { contains: q } },
                    { internalCode: { contains: q } },
                    { barcode: { contains: q } },
                    { category: { contains: q } },
                ],
            }
            : {};
        const [products, itemCount] = await this.prisma.$transaction([
            queryBuilder.findMany({
                where,
                skip: pageOptionsDto.skip,
                take: pageOptionsDto.take,
                orderBy: {
                    name: pageOptionsDto.order,
                },
                include: {
                    attachments: true,
                    specifications: true,
                },
            }),
            queryBuilder.count({ where }),
        ]);
        const pageMetaDto = new page_meta_dto_1.PageMetaDto({ itemCount, pageOptionsDto });
        return new page_dto_1.PageDto(products, pageMetaDto);
    }
    async findOne(id) {
        return this.prisma.product.findUnique({
            where: { id },
            include: {
                specifications: true,
                attachments: true,
            },
        });
    }
    async update(id, updateProductDto) {
        const { specifications, attachments, ...productData } = updateProductDto;
        return this.prisma.product.update({
            where: { id },
            data: {
                ...productData,
                specifications: specifications
                    ? {
                        deleteMany: {},
                        create: specifications,
                    }
                    : undefined,
                attachments: attachments
                    ? {
                        deleteMany: {},
                        create: attachments,
                    }
                    : undefined,
            },
            include: {
                specifications: true,
                attachments: true,
            },
        });
    }
    async remove(id) {
        const movements = await this.prisma.stockMovement.findMany({
            where: { productId: id },
        });
        if (movements.length > 0) {
            throw new common_1.BadRequestException('Não é possível excluir um produto que possui movimentações.');
        }
        return this.prisma.product.delete({
            where: { id },
        });
    }
    async getDashboardStats() {
        const totalProducts = await this.prisma.product.count();
        const lowStockProducts = await this.prisma.product.count({
            where: {
                currentStock: {
                    lte: this.prisma.product.fields.minStock,
                },
            },
        });
        const result = await this.prisma.$queryRaw `
      SELECT SUM(current_stock * cost_price) as totalValue FROM products
    `;
        const totalValue = result[0]?.totalValue || 0;
        const criticalItems = await this.prisma.product.findMany({
            where: {
                currentStock: {
                    lte: this.prisma.product.fields.minStock,
                },
            },
            take: 5,
            orderBy: {
                currentStock: 'asc',
            },
            select: {
                id: true,
                name: true,
                currentStock: true,
                minStock: true,
            },
        });
        return {
            totalProducts,
            lowStockCount: lowStockProducts,
            stockValue: totalValue,
            criticalItems,
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map