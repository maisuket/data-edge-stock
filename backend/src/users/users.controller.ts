import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from './entities/user.entity';
import { Query } from '@nestjs/common';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('users') // Cria uma seção "users" no Swagger
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo usuário' })
  // Documenta que a resposta será do tipo UserEntity (sem senha)
  @ApiResponse({
    status: 201,
    description: 'Usuário criado.',
    type: UserEntity,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários com paginação' })
  // No Swagger, explicamos que retorna um PageDto contendo UserEntity
  @ApiResponse({ status: 200, description: 'Lista paginada.', type: PageDto })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    // @Query pega os params da URL
    return this.usersService.findAll(pageOptionsDto);
  }

  // Mantemos os outros métodos vazios por enquanto...
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // <--- Protege a rota
  @ApiBearerAuth() // <--- Adiciona cadeado no Swagger
  @ApiOperation({ summary: 'Atualizar dados do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado.',
    type: UserEntity,
  })
  @ApiResponse({ status: 403, description: 'Proibido alterar outro usuário.' })
  @ApiResponse({ status: 409, description: 'Email ou Username já existem.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Passa o usuário logado (req.user) que contem { userId, role }
    return this.usersService.update(id, updateUserDto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Garante que temos o usuário no request
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido.' })
  @ApiResponse({ status: 403, description: 'Proibido excluir a si mesmo.' })
  remove(@Param('id') id: string, @Request() req) {
    // Passamos o ID da URL e o ID do usuário logado (req.user.userId)
    return this.usersService.remove(id, req.user.userId);
  }
}
