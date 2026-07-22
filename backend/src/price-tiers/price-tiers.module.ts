import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceTiersController } from './price-tiers.controller';
import { PriceTiersService } from './price-tiers.service';

@Module({
  imports: [PrismaModule],
  controllers: [PriceTiersController],
  providers: [PriceTiersService],
})
export class PriceTiersModule {}
