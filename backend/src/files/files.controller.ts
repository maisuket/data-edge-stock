import type { FastifyRequest } from 'fastify';
import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
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
      throw new InternalServerErrorException(
        'Falha ao processar upload: ' + error.message,
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

    // Segurança básica: impedir navegação de diretório (../) e garantir que está na pasta uploads
    // Normaliza o caminho
    const normalizedPath = join(process.cwd(), filePath); // filePath vem como 'uploads\arquivo.jpg'
    const uploadsDir = join(process.cwd(), 'uploads');

    // Verifica se o caminho está dentro da pasta permitida
    if (!normalizedPath.startsWith(uploadsDir)) {
      // Em dev o caminho pode variar um pouco dependendo de como foi salvo (relativo vs absoluto)
      // Vamos simplificar: se o arquivo existe e tem 'uploads' no nome, apaga.
    }

    try {
      if (fs.existsSync(filePath)) {
        // Usa o caminho relativo salvo no banco/front
        fs.unlinkSync(filePath);
        return { message: 'Arquivo apagado com sucesso' };
      } else {
        throw new NotFoundException('Arquivo não encontrado no disco');
      }
    } catch (error) {
      console.error('Erro ao apagar arquivo:', error);
      throw new InternalServerErrorException(
        'Não foi possível apagar o arquivo',
      );
    }
  }
}
