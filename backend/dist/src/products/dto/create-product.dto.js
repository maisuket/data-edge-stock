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
exports.CreateProductDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const unit_enum_1 = require("../enums/unit.enum");
const class_transformer_1 = require("class-transformer");
class SpecificationDto {
    name;
    value;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SpecificationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Azul' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SpecificationDto.prototype, "value", void 0);
class AttachmentDto {
    fileName;
    filePath;
    fileType;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "filePath", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "fileType", void 0);
class CreateProductDto {
    name;
    category;
    internalCode;
    barcode;
    unit;
    costPrice;
    salePrice;
    currentStock;
    minStock;
    location;
    specifications;
    attachments;
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Parafusadeira 12V' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ferramentas' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PAR-001', description: 'Código único interno' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "internalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '7890000000000', description: 'EAN/GTIN' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "barcode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: unit_enum_1.Unit, example: unit_enum_1.Unit.UN }),
    (0, class_validator_1.IsEnum)(unit_enum_1.Unit),
    __metadata("design:type", String)
], CreateProductDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 150.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 299.9 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "salePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "currentStock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "minStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Corredor 3, Prateleira B' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [SpecificationDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SpecificationDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "specifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [AttachmentDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttachmentDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-product.dto.js.map