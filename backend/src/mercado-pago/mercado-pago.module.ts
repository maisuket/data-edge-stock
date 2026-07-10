import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  imports: [HttpModule],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
