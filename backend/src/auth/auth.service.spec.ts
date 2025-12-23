import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // Mock do UsersService (dependência do AuthService)
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        // Mock do JwtService (dependência do AuthService)
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'token_mock'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
