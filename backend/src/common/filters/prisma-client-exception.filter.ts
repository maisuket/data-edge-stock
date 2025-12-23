import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // <--- Importação Correta
import { FastifyReply } from 'fastify';

@Catch(PrismaClientKnownRequestError) // <--- Uso direto da Classe
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    // Remove quebras de linha da mensagem original do Prisma para ficar limpo
    // const message = exception.message.replace(/\n/g, '');

    switch (exception.code) {
      // P2002: Unique constraint failed (ex: Email já existe)
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        const target = exception.meta?.target;

        response.status(status).send({
          statusCode: status,
          message: `Dados duplicados: O campo ${target} já está em uso.`,
          error: 'Conflict',
        });
        break;
      }
      // P2025: Record not found (ex: Tentar deletar ID que não existe)
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).send({
          statusCode: status,
          message: 'Registro não encontrado para realizar a operação.',
          error: 'Not Found',
        });
        break;
      }
      default:
        // Para outros erros, usa o comportamento padrão (loga e retorna 500)
        super.catch(exception, host);
        break;
    }
  }
}
