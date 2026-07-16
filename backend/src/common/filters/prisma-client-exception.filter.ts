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

        let targetName = 'desconhecido';
        if (Array.isArray(target)) {
          targetName = target.join(', ');
        } else if (typeof target === 'string') {
          targetName = target;
        }

        response.status(status).send({
          statusCode: status,
          message: `Dados duplicados: O campo ${targetName} já está em uso.`,
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
      // P2028: Transaction timeout (ex: banco "acordando" de hibernação no Render/Neon)
      case 'P2028': {
        const status = HttpStatus.GATEWAY_TIMEOUT;
        response.status(status).send({
          statusCode: status,
          message:
            'O banco de dados demorou demais para responder (pode estar iniciando após período de inatividade). Tente novamente em alguns segundos.',
          error: 'Gateway Timeout',
        });
        break;
      }
      // P2034: Write conflict / deadlock em transação concorrente
      case 'P2034': {
        const status = HttpStatus.CONFLICT;
        response.status(status).send({
          statusCode: status,
          message:
            'Conflito ao salvar: outra operação concorrente alterou os mesmos dados. Tente novamente.',
          error: 'Conflict',
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
