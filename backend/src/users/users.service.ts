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

  findByEmail(username: string) {
    throw new Error('Method not implemented.');
  }
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

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: { id: string; role: string },
  ) {
    // 1. Regra de Segurança:
    // Pode atualizar se for o próprio usuário OU se for Admin
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (id !== currentUser.id && currentUser.role !== Role.Admin) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar dados de outro usuário.',
      );
    }

    const data: any = { ...updateUserDto };

    // 2. Se a senha foi informada, criptografa
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.password) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      data.password = await bcrypt.hash(data.password, 10);
    }

    // 3. Proteção de Role: Apenas Admin pode alterar a role de alguém
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-member-access
    if (data.role && currentUser.role !== Role.Admin) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete data.role; // Remove silenciosamente ou lança erro
    }

    const user = await this.prisma.user.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
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
