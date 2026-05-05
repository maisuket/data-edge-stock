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
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';

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
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin (ex: curl, Postman, apps mobile)
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`Origin não permitida: ${origin}`), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
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
        console.error(JSON.stringify(errors, null, 2));
        return new BadRequestException(errors);
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  /* =============================
   * ❌ ERROS DO PRISMA
   * ============================= */
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  /* =============================
   * 📄 SWAGGER (CONDICIONAL)
   * ============================= */
  if (process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development') {
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
