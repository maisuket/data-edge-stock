import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

// 1. MOCK DO BCRYPT (Global)
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_xyz'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;

  // Definimos o Mock do Prisma
  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // 2. IMPORTANTE: Limpa os mocks antes de cada teste para não vazar estado
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar um usuário com sucesso e retornar UserEntity', async () => {
      const dto: CreateUserDto = {
        name: 'Teste',
        email: 'teste@email.com',
        username: 'teste_user',
        password: '12345678',
      };

      const userFromDb = {
        id: 'uuid-123',
        ...dto,
        password: 'hashed_password_xyz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock: Não existe usuário duplicado
      jest.spyOn(mockPrismaService.user, 'findFirst').mockResolvedValue(null);
      // Mock: Criação retorna usuário
      jest
        .spyOn(mockPrismaService.user, 'create')
        .mockResolvedValue(userFromDb);

      const result = await service.create(dto);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result).toHaveProperty('id');
      expect(result.username).toBe('teste_user');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('deve lançar erro se email ou username já existirem', async () => {
      const dto: CreateUserDto = {
        name: 'Duplicado',
        email: 'existente@email.com',
        username: 'existente',
        password: '123',
      };

      // Mock: Encontrou um usuário (simula duplicidade)
      jest
        .spyOn(mockPrismaService.user, 'findFirst')
        .mockResolvedValue({ id: 'xyz' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);

      // Garante que NÃO tentou criar
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar uma lista de UserEntity', async () => {
      const usersArray = [
        {
          id: '1',
          name: 'User 1',
          password: 'hash1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'User 2',
          password: 'hash2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest
        .spyOn(mockPrismaService.user, 'findMany')
        .mockResolvedValue(usersArray);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[0].name).toBe('User 1');
    });
  });
});
