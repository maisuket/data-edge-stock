import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { Reflector } from '@nestjs/core';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { resetDatabase } from './db-reset';
import { CreateUserDto } from '../src/users/dto/create-user.dto';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let jwtToken: string;

  // Dados de teste
  const userDto: CreateUserDto = {
    name: 'E2E User',
    email: 'e2e@test.com',
    username: 'e2euser',
    password: 'password123',
  };

  // --- SETUP ANTES DE TODOS OS TESTES ---
  beforeAll(async () => {
    // 1. Garante que o banco de teste está limpo antes de começar
    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // 2. Inicializa a aplicação usando FastifyAdapter
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // 3. Reaplica as configurações globais do main.ts (Validação e Serialização)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    // 4. Inicia a aplicação
    await app.init();
    // Espera o Fastify estar pronto para receber injeções
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
  });

  // --- LIMPEZA DEPOIS DE TODOS OS TESTES ---
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // === BATERIA DE TESTES DO FLUXO ===

  describe('Fluxo de Usuário e Autenticação', () => {
    // TESTE 1: Criar Usuário
    it('1. POST /users - Deve criar um usuário com sucesso', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userDto,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.email).toBe(userDto.email);
      expect(body.username).toBe(userDto.username);
      expect(body).toHaveProperty('id');
      expect(body).not.toHaveProperty('password'); // Garante que a serialização funcionou no E2E
    });

    // TESTE 2: Tentar criar duplicado
    it('2. POST /users - Deve falhar ao criar usuário duplicado (409)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userDto,
      });

      expect(response.statusCode).toBe(409);
    });

    // TESTE 3: Login
    it('3. POST /auth/login - Deve fazer login e retornar JWT', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: userDto.username,
          password: userDto.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('access_token');
      jwtToken = body.access_token; // Salva o token para os próximos testes
    });

    // TESTE 4: Rota Protegida SEM Token
    it('4. GET /users - Deve falhar sem token (401)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
      });

      expect(response.statusCode).toBe(401);
    });

    // TESTE 5: Rota Protegida COM Token
    it('5. GET /users - Deve ter sucesso com token (200)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        // Injeta o header de autorização
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].email).toBe(userDto.email);
    });
  });
});
