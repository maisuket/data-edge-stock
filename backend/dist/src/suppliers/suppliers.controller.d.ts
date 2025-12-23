import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(createDto: CreateSupplierDto): Promise<{
        id: string;
        email: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
    }>;
    findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<{
        id: string;
        email: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
    }>>;
    findOne(id: string): Promise<{
        id: string;
        email: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
    } | null>;
    update(id: string, updateDto: UpdateSupplierDto): Promise<{
        id: string;
        email: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
    }>;
}
