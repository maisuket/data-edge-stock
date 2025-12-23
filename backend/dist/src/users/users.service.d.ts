import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './entities/user.entity';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
export declare class UsersService {
    private readonly prisma;
    private readonly logger;
    findByEmail(username: string): void;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<UserEntity>;
    findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<UserEntity>>;
    findByUsername(username: string): Promise<{
        id: string;
        email: string;
        username: string;
        name: string;
        cargo: string | null;
        role: string;
        password: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findOne(id: number): string;
    update(id: string, updateUserDto: UpdateUserDto, currentUser: {
        id: string;
        role: string;
    }): Promise<UserEntity>;
    remove(id: string, currentUserId: string): Promise<{
        id: string;
        email: string;
        username: string;
        name: string;
        cargo: string | null;
        role: string;
        password: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
