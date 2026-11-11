import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/users/entities/user.entity';

describe('Auth HTTP (repositorio aislado, JWT y bcrypt reales)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const users = new Map<string, User>();
  const repository = {
    findOne: jest.fn(({ where }: { where: { username: string } }) =>
      Promise.resolve(users.get(where.username) ?? null),
    ),
    create: jest.fn((input: Partial<User>) => Object.assign(new User(), input)),
    save: jest.fn((user: User) => {
      user.id = randomUUID();
      users.set(user.username, user);
      return Promise.resolve(user);
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-auth-secret',
          signOptions: { expiresIn: '1d', audience: 'kahoot-api' },
        }),
      ],
      controllers: [AppController, AuthController],
      providers: [
        AppService,
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => users.clear());
  afterAll(async () => app?.close());

  it('expone raíz y health sin credenciales', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
    await request(app.getHttpServer())
      .get('/auth/health')
      .expect(200)
      .expect({ status: 'ok', service: 'auth' });
  });

  it('registra, guarda un hash y permite login con un JWT verificable', async () => {
    const credentials = { username: 'prueba', password: 'prueba-segura-123' };
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const body = registered.body as {
      accessToken: string;
      user: { id: string };
    };
    const stored = users.get(credentials.username)!;
    expect(stored.passwordHash).not.toBe(credentials.password);
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(
      jwt.verify(body.accessToken, { audience: 'kahoot-api' }),
    ).toMatchObject({
      sub: stored.id,
      username: credentials.username,
    });
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...credentials, password: 'incorrecta' })
      .expect(401);
  });

  it('rechaza usuarios desconocidos', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'noexiste', password: 'incorrecta' })
      .expect(401);
  });

  it.each([
    { username: 'x', password: 'corta' },
    { username: 'valido', password: 'password-123', extra: true },
    { username: 'con espacios', password: 'password-123' },
  ])('rechaza registros inválidos: %j', async (body) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(400);
    expect(users.size).toBe(0);
  });
});
