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
exports.CreateStockMovementDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const movement_type_enum_1 = require("../enums/movement-type.enum");
class CreateStockMovementDto {
    productId;
    type;
    quantity;
    description;
    entryPrice;
    batch;
    expiryDate;
    supplierId;
}
exports.CreateStockMovementDto = CreateStockMovementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID do Produto' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: movement_type_enum_1.MovementType, example: movement_type_enum_1.MovementType.ENTRY }),
    (0, class_validator_1.IsEnum)(movement_type_enum_1.MovementType),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 10,
        description: 'Quantidade a movimentar (sempre positivo)',
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], CreateStockMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Nota Fiscal 123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Preço unitário de entrada (para cálculo de custo médio)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateStockMovementDto.prototype, "entryPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Número do Lote' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "batch", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Data de Validade (ISO 8601)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID do Fornecedor (Apenas Entradas)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "supplierId", void 0);
//# sourceMappingURL=create-stock-movement.dto.js.map