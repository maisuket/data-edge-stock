import { Unit } from '../enums/unit.enum';
declare class SpecificationDto {
    name: string;
    value: string;
}
declare class AttachmentDto {
    fileName: string;
    filePath: string;
    fileType: string;
}
export declare class CreateProductDto {
    name: string;
    category: string;
    internalCode: string;
    barcode: string;
    unit: Unit;
    costPrice: number;
    salePrice?: number;
    currentStock: number;
    minStock: number;
    location?: string;
    specifications?: SpecificationDto[];
    attachments?: AttachmentDto[];
}
export {};
