import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { Logger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { DecimalInterceptor } from './common/interceptors/decimal.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true, // 🔥 essencial em Docker / Proxy
    }),
    { bufferLogs: true },
  );

  /* =============================
   * 🌐 PREFIXO GLOBAL
   * ============================= */
  app.setGlobalPrefix('api');

  /* =============================
   * 🍪 COOKIES
   * ============================= */
  await app.register(cookie);

  /* =============================
   * 📦 UPLOAD DE ARQUIVOS
   * ============================= */
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  /* =============================
   * 🛡️ SEGURANÇA
   * ============================= */
  await app.register(helmet);

  /* =============================
   * 🌍 CORS
   * ============================= */
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim());

  // Usar o método nativo do NestJS garante que o CORS respeite o ciclo de vida da aplicação
  app.enableCors({
    origin: (origin, cb) => {
      // Permite requisições sem origin (ex: curl, Postman, apps mobile)
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(`Origin não permitida pelo CORS: ${origin}`),
          false,
        );
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  /* =============================
   * 📋 LOGS
   * ============================= */
  app.useLogger(app.get(Logger));

  /* =============================
   * ✅ VALIDAÇÃO GLOBAL
   * ============================= */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        return new BadRequestException(errors);
      },
    }),
  );

  // A ordem aqui é vital para interceptores no NestJS:
  // Na saída da resposta, o DecimalInterceptor roda primeiro, convertendo os Decimais,
  // e depois o ClassSerializerInterceptor atua em cima de objetos seguros sem quebrar as propriedades.
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new DecimalInterceptor(),
  );

  /* =============================
   * ❌ ERROS DO PRISMA
   * ============================= */
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  /* =============================
   * 📄 SWAGGER (CONDICIONAL)
   * ============================= */
  if (
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.NODE_ENV === 'development'
  ) {
    const config = new DocumentBuilder()
      .setTitle('ERP API')
      .setDescription('API do Sistema ERP')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Swagger disponível em /api/docs
    SwaggerModule.setup('docs', app, document);
  }

  /* =============================
   * 🚀 START
   * ============================= */
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  app.get(Logger).log(`API rodando em ${await app.getUrl()}`);
}

bootstrap();
