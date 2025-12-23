import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto): Promise<{
        specifications: {
            id: string;
            name: string;
            value: string;
            productId: string;
        }[];
        attachments: {
            id: string;
            createdAt: Date;
            fileName: string;
            filePath: string;
            fileType: string;
            productId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        internalCode: string;
        barcode: string;
        unit: string;
        costPrice: number;
        salePrice: number | null;
        currentStock: number;
        minStock: number;
        location: string | null;
    }>;
    findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<{
        specifications: {
            id: string;
            name: string;
            value: string;
            productId: string;
        }[];
        attachments: {
            id: string;
            createdAt: Date;
            fileName: string;
            filePath: string;
            fileType: string;
            productId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        internalCode: string;
        barcode: string;
        unit: string;
        costPrice: number;
        salePrice: number | null;
        currentStock: number;
        minStock: number;
        location: string | null;
    }>>;
    findOne(id: string): Promise<({
        specifications: {
            id: string;
            name: string;
            value: string;
            productId: string;
        }[];
        attachments: {
            id: string;
            createdAt: Date;
            fileName: string;
            filePath: string;
            fileType: string;
            productId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        internalCode: string;
        barcode: string;
        unit: string;
        costPrice: number;
        salePrice: number | null;
        currentStock: number;
        minStock: number;
        location: string | null;
    }) | null>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        specifications: {
            id: string;
            name: string;
            value: string;
            productId: string;
        }[];
        attachments: {
            id: string;
            createdAt: Date;
            fileName: string;
            filePath: string;
            fileType: string;
            productId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        internalCode: string;
        barcode: string;
        unit: string;
        costPrice: number;
        salePrice: number | null;
        currentStock: number;
        minStock: number;
        location: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        internalCode: string;
        barcode: string;
        unit: string;
        costPrice: number;
        salePrice: number | null;
        currentStock: number;
        minStock: number;
        location: string | null;
    }>;
    getDashboardStats(): Promise<{
        totalProducts: number;
        lowStockCount: number;
        stockValue: any;
        criticalItems: {
            id: string;
            name: string;
            currentStock: number;
            minStock: number;
        }[];
    }>;
}
