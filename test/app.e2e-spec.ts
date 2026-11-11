import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/users/entities/user.entity';

describe('Account HTTP (fixture aislado, JWT y bcrypt reales)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let master: User;
  let token: string;
  const users = new Map<string, User>();
  const find = (where: Partial<User>) =>
    Promise.resolve(
      [...users.values()].find((u) =>
        Object.entries(where).every(([k, v]) => u[k as keyof User] === v),
      ) ?? null,
    );
  const save = (user: User) => {
    if (
      [...users.values()].some(
        (u) => u.username === user.username && u.id !== user.id,
      )
    )
      throw Object.assign(new Error('duplicate'), { code: '23505' });
    user.id ||= randomUUID();
    users.set(user.id, user);
    return Promise.resolve(user);
  };
  const manager = {
    findOne: (_entity: unknown, options: { where: Partial<User> }) =>
      find(options.where),
    save,
  };
  const repository = {
    findOneBy: find,
    create: (input: Partial<User>) => Object.assign(new User(), input),
    save,
    findAndCount: ({ skip, take }: { skip: number; take: number }) =>
      Promise.resolve([
        [...users.values()].slice(skip, skip + take),
        users.size,
      ]),
    manager: {
      transaction: <T>(fn: (m: typeof manager) => Promise<T>) => fn(manager),
    },
  };
  const bearer = () => `Bearer ${token}`;
  it('registra un perfil, rechaza duplicados y permite iniciar sesión sin dar acceso MASTER', async () => {
    const input = {
      username: '  perfil_demo  ',
      password: 'prueba-segura-2026',
    };
    const agent = request(app.getHttpServer());
    const { body: profile } = await agent
      .post('/auth/register')
      .send(input)
      .expect(201);
    expect(profile).toMatchObject({
      username: 'perfil_demo',
      role: 'PROFESOR',
      isSystem: false,
    });
    expect(profile).not.toHaveProperty('passwordHash');
    await agent.post('/auth/register').send(input).expect(409);
    await agent
      .post('/auth/register')
      .send({ ...input, role: 'MASTER' })
      .expect(400);
    const { body: session } = await agent
      .post('/auth/login')
      .send(input)
      .expect(200);
    await agent
      .get('/auth/users')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
  });

  beforeAll(async () => {
    process.env.JWT_AUDIENCE = 'kahoot-api';
    delete process.env.JWT_ISSUER;
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-secret',
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '1d',
            audience: 'kahoot-api',
          },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repository },
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
  beforeEach(async () => {
    users.clear();
    master = Object.assign(new User(), {
      id: randomUUID(),
      username: 'profesor_test',
      role: 'MASTER',
      active: true,
      isSystem: true,
      credentialVersion: 1,
      passwordHash: await bcrypt.hash('password-123', 4),
    });
    users.set(master.id, master);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: master.username, password: 'password-123' })
      .expect(200);
    token = (res.body as { accessToken: string }).accessToken;
  });
  afterAll(async () => app?.close());

  it('emite contrato estricto y perfiles seguros', async () => {
    expect(jwt.verify<Record<string, unknown>>(token)).toMatchObject({
      sub: master.id,
      role: 'MASTER',
      purpose: 'account',
      credentialVersion: 1,
      aud: 'kahoot-api',
      exp: expect.any(Number) as unknown,
    });
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', bearer())
      .expect(200);
    expect(Object.keys(me.body as object).sort()).toEqual([
      'active',
      'credentialVersion',
      'id',
      'isSystem',
      'role',
      'username',
    ]);
    await request(app.getHttpServer())
      .post('/auth/session/validate')
      .set('Authorization', bearer())
      .expect(200)
      .expect(me.body as object);
  });

  it('MASTER crea PROFESOR, normaliza y maneja duplicados; PROFESOR no administra', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', bearer())
      .send({ username: ' Docente ', password: 'password-123' })
      .expect(201);
    expect(res.body).toMatchObject({
      username: 'docente',
      role: 'PROFESOR',
      active: true,
      isSystem: false,
    });
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', bearer())
      .send({ username: 'DOCENTE', password: 'password-123' })
      .expect(409);
    const list = await request(app.getHttpServer())
      .get('/auth/users?page=1&limit=1')
      .set('Authorization', bearer())
      .expect(200);
    expect(list.body).toMatchObject({ total: 2, page: 1, limit: 1 });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'docente', password: 'password-123' })
      .expect(200);
    const professor = `Bearer ${(login.body as { accessToken: string }).accessToken}`;
    await request(app.getHttpServer())
      .get('/auth/users')
      .set('Authorization', professor)
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', professor)
      .send({ username: 'otro', password: 'password-123' })
      .expect(403);
    await request(app.getHttpServer()).get('/auth/users').expect(401);
  });

  it('desactivar/reactivar y reset revocan tokens anteriores', async () => {
    const user = await save(
      Object.assign(new User(), {
        username: 'docente',
        role: 'PROFESOR',
        active: true,
        isSystem: false,
        credentialVersion: 1,
        passwordHash: master.passwordHash,
      }),
    );
    const login = async (password = 'password-123') =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: user.username, password });
    const initial = (await login()).body as { accessToken: string };
    const validate = (value: string) =>
      request(app.getHttpServer())
        .post('/auth/session/validate')
        .set('Authorization', `Bearer ${value}`);
    await request(app.getHttpServer())
      .patch(`/auth/users/${user.id}`)
      .set('Authorization', bearer())
      .send({ active: false })
      .expect(200);
    await validate(initial.accessToken).expect(401);
    expect((await login()).status).toBe(401);
    await request(app.getHttpServer())
      .patch(`/auth/users/${user.id}`)
      .set('Authorization', bearer())
      .send({ active: true })
      .expect(200);
    await validate(initial.accessToken).expect(401);
    const fresh = (await login()).body as { accessToken: string };
    await validate(fresh.accessToken).expect(200);
    await request(app.getHttpServer())
      .post(`/auth/users/${user.id}/reset-password`)
      .set('Authorization', bearer())
      .send({ password: 'new-password-123' })
      .expect(200);
    await validate(fresh.accessToken).expect(401);
    expect((await login()).status).toBe(401);
    expect((await login('new-password-123')).status).toBe(200);
  });

  it('protege MASTER y rechaza elevación, campos nulos, ids y paginación inválidos', async () => {
    await request(app.getHttpServer())
      .patch(`/auth/users/${master.id}`)
      .set('Authorization', bearer())
      .send({ active: false })
      .expect(403);
    for (const dto of [
      { role: 'MASTER' },
      { active: null },
      { username: null },
      { isSystem: false },
    ])
      await request(app.getHttpServer())
        .patch(`/auth/users/${master.id}`)
        .set('Authorization', bearer())
        .send(dto)
        .expect(400);
    await request(app.getHttpServer())
      .get('/auth/users?limit=101')
      .set('Authorization', bearer())
      .expect(400);
    await request(app.getHttpServer())
      .patch('/auth/users/not-uuid')
      .set('Authorization', bearer())
      .send({ active: false })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/auth/users/${randomUUID()}`)
      .set('Authorization', bearer())
      .send({ active: false })
      .expect(404);
    await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', bearer())
      .send({ username: 'nuevo', password: 'password-123', role: 'MASTER' })
      .expect(400);
  });

  it('rechaza JWT heredado, expirado, sin exp, de otra audiencia/algoritmo/firma y claims adulterados', async () => {
    const base = {
      sub: master.id,
      role: 'MASTER',
      purpose: 'account',
      credentialVersion: 1,
    };
    const raw = new JwtService({ secret: 'test-only-secret' });
    const invalid = [
      raw.sign(base, { audience: 'kahoot-api' }),
      jwt.sign({ sub: master.id, role: 'MASTER' }),
      jwt.sign({ ...base, purpose: 'guest' }),
      jwt.sign({ ...base, credentialVersion: 2 }),
      jwt.sign({ ...base, sub: 'not-uuid' }),
      jwt.sign({ ...base, role: 'PROFESOR' }),
      jwt.sign(base, { expiresIn: -1 }),
      jwt.sign(base, { audience: 'other' }),
      jwt.sign(base, { algorithm: 'HS384' }),
      jwt.sign(base, { secret: 'wrong' }),
    ];
    for (const value of invalid)
      await request(app.getHttpServer())
        .post('/auth/session/validate')
        .set('Authorization', `Bearer ${value}`)
        .expect(401);
  });
});
