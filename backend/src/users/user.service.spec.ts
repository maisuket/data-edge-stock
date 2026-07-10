import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

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
      update: jest.fn(),
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

  describe('update', () => {
    it('deve fazer o hash da senha caso ela seja enviada no update', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'nova_senha_secreta',
      };

      // Simulando o usuário atual que está fazendo a requisição (neste caso, ele mesmo)
      const currentUser = { id: 'uuid-123', role: 'USER' as any };

      const updatedUserFromDb = {
        id: 'uuid-123',
        name: 'Teste',
        email: 'teste@email.com',
        username: 'teste_user',
        role: 'USER',
        password: 'hashed_password_xyz', // Retorno esperado após o mock do Prisma
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(mockPrismaService.user, 'update')
        .mockResolvedValue(updatedUserFromDb);

      const result = await service.update('uuid-123', updateUserDto, currentUser);

      // 1. Verifica se o bcrypt foi chamado interceptando a nova senha e com o 'salt' correto (10)
      expect(bcrypt.hash).toHaveBeenCalledWith('nova_senha_secreta', 10);

      // 2. Verifica se a chamada do Prisma.update enviou para o banco a senha com hash e não a senha em texto plano
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: expect.objectContaining({
          password: 'hashed_password_xyz',
        }),
      });
    });

    it('não deve permitir que usuários comuns alterem sua própria role', async () => {
      const updateUserDto: UpdateUserDto = {
        role: 'ADMIN' as any, // Tentativa maliciosa de virar administrador
        name: 'Novo Nome',
      };

      // Simulando que o autor da requisição é um usuário comum (USER)
      const currentUser = { id: 'uuid-123', role: 'USER' as any };

      jest
        .spyOn(mockPrismaService.user, 'update')
        .mockResolvedValue({ id: 'uuid-123', role: 'USER', name: 'Novo Nome' }); // Retorno fake

      await service.update('uuid-123', updateUserDto, currentUser);

      // Verifica se a requisição enviada ao Prisma ignorou solenemente o campo 'role'
      // e enviou apenas os campos seguros (como 'name')
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: {
          name: 'Novo Nome',
          // o campo 'role' não deve estar presente no objeto enviado ao banco!
        },
      });
    });
  });
});
