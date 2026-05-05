import {
  Injectable,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { Role } from 'src/auth/enums/role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (userExists) {
      this.logger.warn(
        `Tentativa de cadastro duplicado: ${createUserDto.email}`,
      ); // LOG WARN
      throw new ConflictException('Email ou Username já cadastrados.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // Agora retornamos a Entidade. O Interceptor vai remover a senha sozinho!
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new UserEntity(user);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<UserEntity>> {
    const queryBuilder = this.prisma.user;

    // Transaction para buscar os itens e a contagem total ao mesmo tempo
    const [users, itemCount] = await this.prisma.$transaction([
      queryBuilder.findMany({
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: {
          createdAt: pageOptionsDto.order,
        },
      }),
      queryBuilder.count(),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = users.map((user) => new UserEntity(user));

    return new PageDto(entities, pageMetaDto);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: { id: string; role: string },
  ) {
    if (id !== currentUser.id && currentUser.role !== Role.Admin) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar dados de outro usuário.',
      );
    }

    const { role, password, ...rest } = updateUserDto;

    const updateData: {
      name?: string;
      email?: string;
      username?: string;
      cargo?: string;
      role?: string;
      password?: string;
    } = { ...rest };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Apenas admins podem alterar role
    if (role && currentUser.role === Role.Admin) {
      updateData.role = role;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return new UserEntity(user);
  }

  async remove(id: string, currentUserId: string) {
    // Verifica se o usuário está tentando se excluir
    if (id === currentUserId) {
      throw new ForbiddenException('Você não pode excluir sua própria conta.');
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
