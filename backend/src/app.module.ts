import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core'; // <--- Importante
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // <--- Importe aqui
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ReportsModule } from './reports/reports.module';
import { SystemModule } from './system/system.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FilesModule } from './files/files.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipesModule } from './recipes/recipes.module';
import { ProductionsModule } from './productions/productions.module';
import { SettingsModule } from './settings/settings.module';
import { SalesModule } from './sales/sales.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { CustomersModule } from './customers/customers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PriceTiersModule } from './price-tiers/price-tiers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    // 1. Configuração do Throttler
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Tempo de vida em milissegundos (60 segundos)
        limit: 100, // Limite de requisições dentro desse tempo
      },
    ]),
    UsersModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    ProductsModule,
    StockMovementsModule,
    SuppliersModule,
    ReportsModule,
    SystemModule,
    FilesModule,
    SalesModule,
    // ── Módulos de produção (Pudim Gourmet) ──
    IngredientsModule,
    RecipesModule,
    ProductionsModule,
    SettingsModule,
    OrdersModule,
    DeliveryZonesModule,
    CustomersModule,
    PurchasesModule,
    PriceTiersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 2. Ativa o Guard Globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
