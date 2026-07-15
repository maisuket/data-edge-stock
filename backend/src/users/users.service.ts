import {
  Injectable,
  ConflictException,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, actingRole: Role) {
    // ADMIN só pode criar contas de funcionário (USER) — só SUPER_ADMIN
    // pode criar outra conta ADMIN ou SUPER_ADMIN.
    if (
      actingRole === Role.ADMIN &&
      createUserDto.role &&
      createUserDto.role !== Role.USER
    ) {
      throw new ForbiddenException(
        'Você só pode criar contas de funcionário (USER).',
      );
    }

    // Cuidado: um branch `{ email: undefined }` dentro do OR vira `{}` pro
    // Prisma, que combina com qualquer registro — só inclui a checagem de
    // email quando ele foi de fato informado.
    const duplicateConditions: Array<{ email?: string; username?: string }> =
      [{ username: createUserDto.username }];
    if (createUserDto.email) {
      duplicateConditions.push({ email: createUserDto.email });
    }

    const userExists = await this.prisma.user.findFirst({
      where: { OR: duplicateConditions },
    });

    if (userExists) {
      this.logger.warn(
        `Tentativa de cadastro duplicado: ${createUserDto.username}`,
      ); // LOG WARN
      throw new ConflictException('Email ou Username já cadastrados.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const { role, ...rest } = createUserDto;

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        role: role as Role,
        password: hashedPassword,
      },
    });

    // Agora retornamos a Entidade. O Interceptor vai remover a senha sozinho!
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new UserEntity(user);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
    actingRole: Role,
  ): Promise<PageDto<UserEntity>> {
    const queryBuilder = this.prisma.user;

    // ADMIN não enxerga contas SUPER_ADMIN na listagem — nem a existência delas.
    const where =
      actingRole === Role.ADMIN ? { role: { not: Role.SUPER_ADMIN } } : {};

    // Transaction para buscar os itens e a contagem total ao mesmo tempo
    const [users, itemCount] = await this.prisma.$transaction([
      queryBuilder.findMany({
        where,
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.take,
        orderBy: {
          createdAt: pageOptionsDto.order,
        },
      }),
      queryBuilder.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = users.map((user) => new UserEntity(user));

    return new PageDto(entities, pageMetaDto);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return new UserEntity(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: { id: string; role: Role },
  ) {
    const isSelf = id === currentUser.id;

    if (!isSelf) {
      if (currentUser.role === Role.USER) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar dados de outro usuário.',
        );
      }

      // ADMIN só pode editar contas de funcionário (USER) — não pode mexer
      // em outra conta ADMIN ou na SUPER_ADMIN.
      if (currentUser.role === Role.ADMIN) {
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) throw new NotFoundException('Usuário não encontrado.');
        if (target.role !== Role.USER) {
          throw new ForbiddenException(
            'Você só pode alterar contas de funcionário (USER).',
          );
        }
      }
    }

    const { role, password, ...rest } = updateUserDto;

    const updateData: {
      name?: string;
      email?: string;
      username?: string;
      cargo?: string;
      role?: Role;
      password?: string;
    } = { ...rest };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      // SUPER_ADMIN pode promover/rebaixar pra qualquer role.
      // ADMIN só pode manter/setar USER — não pode promover ninguém a ADMIN/SUPER_ADMIN.
      if (currentUser.role === Role.SUPER_ADMIN) {
        updateData.role = role as Role;
      } else if (currentUser.role === Role.ADMIN) {
        if (role !== Role.USER) {
          throw new ForbiddenException(
            'Você não tem permissão para atribuir essa permissão.',
          );
        }
        updateData.role = role as Role;
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return new UserEntity(user);
  }

  async remove(id: string, currentUser: { id: string; role: Role }) {
    // Verifica se o usuário está tentando se excluir
    if (id === currentUser.id) {
      throw new ForbiddenException('Você não pode excluir sua própria conta.');
    }

    // ADMIN só pode remover contas de funcionário (USER).
    if (currentUser.role === Role.ADMIN) {
      const target = await this.prisma.user.findUnique({ where: { id } });
      if (!target) throw new NotFoundException('Usuário não encontrado.');
      if (target.role !== Role.USER) {
        throw new ForbiddenException(
          'Você só pode remover contas de funcionário (USER).',
        );
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
