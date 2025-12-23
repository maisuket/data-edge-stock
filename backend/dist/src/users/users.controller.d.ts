import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<UserEntity>;
    findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<UserEntity>>;
    findOne(id: string): string;
    update(id: string, updateUserDto: UpdateUserDto, req: any): Promise<UserEntity>;
    remove(id: string, req: any): Promise<{
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
