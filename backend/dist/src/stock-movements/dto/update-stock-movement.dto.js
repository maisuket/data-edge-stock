"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStockMovementDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_stock_movement_dto_1 = require("./create-stock-movement.dto");
class UpdateStockMovementDto extends (0, swagger_1.PartialType)(create_stock_movement_dto_1.CreateStockMovementDto) {
}
exports.UpdateStockMovementDto = UpdateStockMovementDto;
//# sourceMappingURL=update-stock-movement.dto.js.map