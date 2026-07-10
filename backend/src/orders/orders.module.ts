import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, MercadoPagoModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
