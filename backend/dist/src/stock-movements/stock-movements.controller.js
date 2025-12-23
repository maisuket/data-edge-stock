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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMovementsController = void 0;
const common_1 = require("@nestjs/common");
const stock_movements_service_1 = require("./stock-movements.service");
const create_stock_movement_dto_1 = require("./dto/create-stock-movement.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const page_options_dto_1 = require("../common/dto/page-options.dto");
const page_dto_1 = require("../common/dto/page.dto");
let StockMovementsController = class StockMovementsController {
    stockService;
    constructor(stockService) {
        this.stockService = stockService;
    }
    create(createDto, req) {
        return this.stockService.create(createDto, req.user.userId);
    }
    findAll(pageOptionsDto, productId) {
        return this.stockService.findAll(pageOptionsDto, productId);
    }
};
exports.StockMovementsController = StockMovementsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar entrada/saída de estoque' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Movimentação registrada e saldo atualizado.',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_stock_movement_dto_1.CreateStockMovementDto, Object]),
    __metadata("design:returntype", void 0)
], StockMovementsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar histórico de movimentações' }),
    (0, swagger_1.ApiQuery)({
        name: 'productId',
        required: false,
        description: 'Filtrar por produto',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: page_dto_1.PageDto }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [page_options_dto_1.PageOptionsDto, String]),
    __metadata("design:returntype", void 0)
], StockMovementsController.prototype, "findAll", null);
exports.StockMovementsController = StockMovementsController = __decorate([
    (0, swagger_1.ApiTags)('stock-movements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('stock-movements'),
    __metadata("design:paramtypes", [stock_movements_service_1.StockMovementsService])
], StockMovementsController);
//# sourceMappingURL=stock-movements.controller.js.map