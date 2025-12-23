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
exports.SystemController = void 0;
const common_1 = require("@nestjs/common");
const system_service_1 = require("./system.service");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
let SystemController = class SystemController {
    systemService;
    constructor(systemService) {
        this.systemService = systemService;
    }
    downloadBackup(res) {
        const stream = this.systemService.createBackupStream();
        const filename = `backup_estoque_${new Date().toISOString().split('T')[0]}.zip`;
        res.header('Content-Type', 'application/zip');
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(stream);
    }
};
exports.SystemController = SystemController;
__decorate([
    (0, common_1.Get)('backup'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin),
    (0, swagger_1.ApiOperation)({ summary: 'Baixar backup do banco de dados (ZIP)' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SystemController.prototype, "downloadBackup", null);
exports.SystemController = SystemController = __decorate([
    (0, swagger_1.ApiTags)('system'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('system'),
    __metadata("design:paramtypes", [system_service_1.SystemService])
], SystemController);
//# sourceMappingURL=system.controller.js.map