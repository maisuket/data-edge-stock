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
exports.StockMovementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const movement_type_enum_1 = require("./enums/movement-type.enum");
const page_dto_1 = require("../common/dto/page.dto");
const page_meta_dto_1 = require("../common/dto/page-meta.dto");
let StockMovementsService = class StockMovementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createDto, userId) {
        const { productId, type, quantity, description, entryPrice, batch, expiryDate, supplierId, } = createDto;
        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product)
                throw new common_1.NotFoundException('Produto não encontrado.');
            let newStock = product.currentStock;
            let newCostPrice = product.costPrice;
            switch (type) {
                case movement_type_enum_1.MovementType.ENTRY:
                    if (entryPrice !== undefined && entryPrice !== null) {
                        const currentTotalValue = product.currentStock * product.costPrice;
                        const entryTotalValue = quantity * entryPrice;
                        const totalQuantity = product.currentStock + quantity;
                        if (totalQuantity > 0) {
                            newCostPrice =
                                (currentTotalValue + entryTotalValue) / totalQuantity;
                        }
                        else {
                            newCostPrice = entryPrice;
                        }
                    }
                    newStock += quantity;
                    break;
                case movement_type_enum_1.MovementType.EXIT:
                    if (product.currentStock < quantity) {
                        throw new common_1.BadRequestException('Estoque insuficiente.');
                    }
                    newStock -= quantity;
                    break;
                case movement_type_enum_1.MovementType.ADJUSTMENT:
                    newStock += quantity;
                    break;
            }
            await tx.product.update({
                where: { id: productId },
                data: {
                    currentStock: newStock,
                    costPrice: newCostPrice,
                },
            });
            return await tx.stockMovement.create({
                data: {
                    type,
                    quantity,
                    stockBefore: product.currentStock,
                    stockAfter: newStock,
                    description,
                    productId,
                    userId,
                    batch,
                    expiryDate: expiryDate ? new Date(expiryDate) : null,
                    unitValue: entryPrice || product.costPrice,
                    supplierId: type === movement_type_enum_1.MovementType.ENTRY ? supplierId : null,
                },
            });
        });
    }
    async findAll(pageOptionsDto, productId) {
        const where = {};
        if (productId)
            where.productId = productId;
        const [movements, itemCount] = await this.prisma.$transaction([
            this.prisma.stockMovement.findMany({
                where,
                skip: pageOptionsDto.skip,
                take: pageOptionsDto.take,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { name: true, internalCode: true } },
                    user: { select: { name: true } },
                    supplier: { select: { name: true } },
                },
            }),
            this.prisma.stockMovement.count({ where }),
        ]);
        const pageMetaDto = new page_meta_dto_1.PageMetaDto({ itemCount, pageOptionsDto });
        return new page_dto_1.PageDto(movements, pageMetaDto);
    }
};
exports.StockMovementsService = StockMovementsService;
exports.StockMovementsService = StockMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockMovementsService);
//# sourceMappingURL=stock-movements.service.js.map