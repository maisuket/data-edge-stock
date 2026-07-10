import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  findPublic() {
    return this.productsService.findPublic();
  }
}
