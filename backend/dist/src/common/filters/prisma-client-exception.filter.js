"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClientExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const library_1 = require("@prisma/client/runtime/library");
let PrismaClientExceptionFilter = class PrismaClientExceptionFilter extends core_1.BaseExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        switch (exception.code) {
            case 'P2002': {
                const status = common_1.HttpStatus.CONFLICT;
                const target = exception.meta?.target;
                response.status(status).send({
                    statusCode: status,
                    message: `Dados duplicados: O campo ${target} já está em uso.`,
                    error: 'Conflict',
                });
                break;
            }
            case 'P2025': {
                const status = common_1.HttpStatus.NOT_FOUND;
                response.status(status).send({
                    statusCode: status,
                    message: 'Registro não encontrado para realizar a operação.',
                    error: 'Not Found',
                });
                break;
            }
            default:
                super.catch(exception, host);
                break;
        }
    }
};
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter;
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter = __decorate([
    (0, common_1.Catch)(library_1.PrismaClientKnownRequestError)
], PrismaClientExceptionFilter);
//# sourceMappingURL=prisma-client-exception.filter.js.map