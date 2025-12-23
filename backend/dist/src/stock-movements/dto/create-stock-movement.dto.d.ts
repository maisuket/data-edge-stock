import { MovementType } from '../enums/movement-type.enum';
export declare class CreateStockMovementDto {
    productId: string;
    type: MovementType;
    quantity: number;
    description?: string;
    entryPrice?: number;
    batch?: string;
    expiryDate?: string;
    supplierId?: string;
}
