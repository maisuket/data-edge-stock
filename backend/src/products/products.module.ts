import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MenuController } from './menu.controller';

@Module({
  controllers: [ProductsController, MenuController],
  providers: [ProductsService],
})
export class ProductsModule {}
