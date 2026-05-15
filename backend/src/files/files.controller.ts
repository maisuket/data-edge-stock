import type { FastifyRequest } from 'fastify';
import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Delete,
  Body,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import * as fs from 'fs';
import * as util from 'util';
import { pipeline } from 'stream';
import * as path from 'path';
import { join } from 'path';
import { SavedMultipartFile } from '@fastify/multipart';

const pump = util.promisify(pipeline);

// Interface auxiliar para tipar os métodos do @fastify/multipart
interface FastifyMultipartRequest extends FastifyRequest {
  file: () => Promise<SavedMultipartFile | undefined>;
}

@ApiTags('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  @Post('upload')
  @ApiOperation({ summary: 'Fazer upload de um arquivo (Fastify)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@Req() req: FastifyMultipartRequest) {
    // Validação de Multipart
    if (!req.isMultipart()) {
      throw new BadRequestException('A requisição não é multipart/form-data');
    }

    try {
      const data = await req.file();

      if (!data) {
        throw new BadRequestException('Nenhum arquivo enviado');
      }

      // Gera nome único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = data.filename.split('.').pop();
      const fileName = `upload-${uniqueSuffix}.${ext}`;

      // Garante que a pasta existe
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      // Salva o arquivo
      await pump(data.file, writeStream);

      // Verificação extra: Se o arquivo foi truncado (limite excedido), o Fastify lança propriedade 'truncated'
      if (data.file.truncated) {
        // Apaga o arquivo corrompido
        fs.unlinkSync(filePath);
        throw new BadRequestException('Arquivo muito grande. Limite excedido.');
      }

      return {
        fileName: data.filename,
        filePath: filePath,
        fileType: data.mimetype,
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Falha ao processar upload: ' + errorMessage,
      );
    }
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Apagar arquivo do disco' })
  @ApiBody({
    schema: { type: 'object', properties: { filePath: { type: 'string' } } },
  })
  deleteFile(@Body('filePath') filePath: string) {
    if (!filePath)
      throw new BadRequestException('Caminho do arquivo não informado');

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(process.cwd(), filePath);

    // Rejeita qualquer caminho que não esteja dentro de /uploads
    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      throw new ForbiddenException('Acesso negado: caminho inválido.');
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        return { message: 'Arquivo apagado com sucesso' };
      } else {
        throw new NotFoundException('Arquivo não encontrado no disco');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Não foi possível apagar o arquivo',
      );
    }
  }
}
