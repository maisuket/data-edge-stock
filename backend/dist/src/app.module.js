"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const users_module_1 = require("./users/users.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const nestjs_pino_1 = require("nestjs-pino");
const health_module_1 = require("./health/health.module");
const products_module_1 = require("./products/products.module");
const stock_movements_module_1 = require("./stock-movements/stock-movements.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const reports_module_1 = require("./reports/reports.module");
const system_module_1 = require("./system/system.module");
const schedule_1 = require("@nestjs/schedule");
const files_module_1 = require("./files/files.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    transport: process.env.NODE_ENV !== 'production'
                        ? { target: 'pino-pretty' }
                        : undefined,
                    redact: ['req.headers.authorization'],
                },
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            users_module_1.UsersModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            products_module_1.ProductsModule,
            stock_movements_module_1.StockMovementsModule,
            suppliers_module_1.SuppliersModule,
            reports_module_1.ReportsModule,
            system_module_1.SystemModule,
            files_module_1.FilesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map