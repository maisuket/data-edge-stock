import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
export declare class StockMovementsController {
    private readonly stockService;
    constructor(stockService: StockMovementsService);
    create(createDto: CreateStockMovementDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        description: string | null;
        productId: string;
        batch: string | null;
        quantity: number;
        expiryDate: Date | null;
        unitValue: number | null;
        stockBefore: number;
        stockAfter: number;
        userId: string;
        supplierId: string | null;
    }>;
    findAll(pageOptionsDto: PageOptionsDto, productId?: string): Promise<PageDto<{
        user: {
            name: string;
        };
        supplier: {
            name: string;
        } | null;
        product: {
            name: string;
            internalCode: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: string;
        description: string | null;
        productId: string;
        batch: string | null;
        quantity: number;
        expiryDate: Date | null;
        unitValue: number | null;
        stockBefore: number;
        stockAfter: number;
        userId: string;
        supplierId: string | null;
    }>>;
}
