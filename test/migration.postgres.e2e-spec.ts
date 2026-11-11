import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../src/users/entities/user.entity';
import { CreateUsers1800000000000 } from '../src/database/migrations/1800000000000-CreateUsers';
import { AccountManagement1800000000001 } from '../src/database/migrations/1800000000001-AccountManagement';
import { provisionMaster } from '../src/bootstrap-master';

// Explicit opt-in; credentials are read without printing them. Each case owns
// exactly one random schema, and public is never in the connection search_path.
const postgres = process.env.AUTH_MIGRATION_TEST_ENV ? describe : describe.skip;
postgres('PostgreSQL account migration (isolated schemas)', () => {
  let source: DataSource;
  let schema: string;
  let originalDemo: string | undefined;
  let originalPassword: string | undefined;
  const demoId = randomUUID();
  const professorId = randomUUID();
  const studentId = randomUUID();
  let hash: string;

  beforeAll(async () => {
    originalDemo = process.env.DEMO_USER_USERNAME;
    originalPassword = process.env.DEMO_USER_PASSWORD;
    hash = await bcrypt.hash('fixture-original-password', 4);
  });
  beforeEach(async () => {
    const env = parse(readFileSync(process.env.AUTH_MIGRATION_TEST_ENV!));
    if (!env.AUTH_POSTGRES_PASSWORD)
      throw new Error('Fixture password missing');
    schema = `auth_fixture_${randomUUID().replaceAll('-', '')}`;
    source = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: Number(env.AUTH_POSTGRES_PORT ?? '55433'),
      username: 'auth',
      password: env.AUTH_POSTGRES_PASSWORD,
      database: 'auth_db',
      schema,
      extra: { options: `-c search_path=${schema}` },
      entities: [User],
      migrations: [AccountManagement1800000000001],
      synchronize: false,
      logging: false,
    });
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    const runner = source.createQueryRunner();
    try {
      await new CreateUsers1800000000000().up(runner);
    } finally {
      await runner.release();
    }
    process.env.DEMO_USER_USERNAME = 'configured_demo';
    process.env.DEMO_USER_PASSWORD = 'fixture-new-password';
  });
  afterEach(async () => {
    if (source?.isInitialized) {
      try {
        if (!/^auth_fixture_[a-f0-9]{32}$/.test(schema))
          throw new Error('Invalid fixture schema');
        await source.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await source.destroy();
      }
    }
  });
  afterAll(() => {
    if (originalDemo === undefined) delete process.env.DEMO_USER_USERNAME;
    else process.env.DEMO_USER_USERNAME = originalDemo;
    if (originalPassword === undefined) delete process.env.DEMO_USER_PASSWORD;
    else process.env.DEMO_USER_PASSWORD = originalPassword;
  });

  async function seed() {
    for (const [id, username, role] of [
      [demoId, 'Configured_Demo', 'PROFESOR'],
      [professorId, 'another_teacher', 'PROFESOR'],
      [studentId, 'legacy_student', 'ESTUDIANTE'],
    ])
      await source.query(
        'INSERT INTO users (id, username, "passwordHash", role) VALUES ($1,$2,$3,$4)',
        [id, username, hash, role],
      );
  }
  const snapshot = (): Promise<Record<string, unknown>[]> =>
    source.query('SELECT * FROM users ORDER BY id');

  it('preserves UUID/hash/date, promotes only configured demo and serializes idempotent bootstrap', async () => {
    await seed();
    const before = await snapshot();
    await source.runMigrations({ transaction: 'all' });
    const users = await source.getRepository(User).find();
    expect(users).toHaveLength(3);
    for (const user of users) {
      const previous = before.find((row) => row.id === user.id)!;
      expect(user.passwordHash).toBe(previous.passwordHash);
      expect(user.createdAt).toEqual(previous.createdAt);
      expect(user.role).toBe(user.id === demoId ? 'MASTER' : 'PROFESOR');
      expect(user.isSystem).toBe(user.id === demoId);
      expect(user.active).toBe(true);
      expect(user.credentialVersion).toBe(1);
    }
    await source
      .getRepository(User)
      .update(demoId, { username: 'renamed_demo' });
    delete process.env.DEMO_USER_PASSWORD;
    const results = await Promise.all([
      provisionMaster(source),
      provisionMaster(source),
    ]);
    expect(results).toEqual([
      { id: demoId, created: false },
      { id: demoId, created: false },
    ]);
    expect(
      await source.getRepository(User).findOneByOrFail({ id: demoId }),
    ).toMatchObject({ username: 'renamed_demo', passwordHash: hash });
    expect(await source.runMigrations()).toEqual([]);
  });

  it.each(['other-master', 'ambiguous-demo', 'missing-demo'])(
    'rolls back %s without losing legacy data',
    async (conflict) => {
      await seed();
      if (conflict === 'other-master')
        await source.query(`UPDATE users SET role = 'MASTER' WHERE id = $1`, [
          professorId,
        ]);
      if (conflict === 'ambiguous-demo')
        await source.query(
          'INSERT INTO users (username, "passwordHash", role) VALUES ($1,$2,$3)',
          ['configured_demo', hash, 'ESTUDIANTE'],
        );
      if (conflict === 'missing-demo')
        process.env.DEMO_USER_USERNAME = 'missing_demo';
      const before = await snapshot();
      await expect(
        source.runMigrations({ transaction: 'all' }),
      ).rejects.toThrow(/demo|MASTER/);
      expect(await snapshot()).toEqual(before);
      const columns: { column_name: string }[] = await source.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        [schema, 'users'],
      );
      expect(columns.map((column) => column.column_name)).not.toContain(
        'isSystem',
      );
      const migrations: unknown[] = await source.query(
        'SELECT * FROM migrations',
      );
      expect(migrations).toEqual([]);
    },
  );

  it('enforces system trigger, role/version checks and normalized uniqueness in SQL', async () => {
    await seed();
    await source.runMigrations({ transaction: 'all' });
    const before = await snapshot();
    for (const sql of [
      'DELETE FROM users WHERE id = $1',
      'UPDATE users SET active = false WHERE id = $1',
      'UPDATE users SET "isSystem" = false WHERE id = $1',
      `UPDATE users SET role = 'PROFESOR' WHERE id = $1`,
    ])
      await expect(source.query(sql, [demoId])).rejects.toMatchObject({
        code: 'P0001',
      });
    for (const sql of [
      `UPDATE users SET role = 'ESTUDIANTE' WHERE id = $1`,
      `UPDATE users SET role = 'MASTER' WHERE id = $1`,
      'UPDATE users SET "credentialVersion" = 0 WHERE id = $1',
    ])
      await expect(source.query(sql, [studentId])).rejects.toMatchObject({
        code: '23514',
      });
    await expect(
      source.query(
        `UPDATE users SET role = 'MASTER', "isSystem" = true WHERE id = $1`,
        [studentId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      source.query(
        `UPDATE users SET username = ' CONFIGURED_DEMO ' WHERE id = $1`,
        [studentId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    expect(await snapshot()).toEqual(before);
  });

  it('bootstraps an empty installation concurrently once, preserves hash on rerun', async () => {
    await source.runMigrations({ transaction: 'all' });
    const results = await Promise.all([
      provisionMaster(source),
      provisionMaster(source),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results[0].id).toBe(results[1].id);
    const user = await source
      .getRepository(User)
      .findOneByOrFail({ isSystem: true });
    expect(
      await bcrypt.compare('fixture-new-password', user.passwordHash),
    ).toBe(true);
    process.env.DEMO_USER_PASSWORD = 'different-configured-password';
    await provisionMaster(source);
    expect(await source.getRepository(User).count()).toBe(1);
    expect(
      (await source.getRepository(User).findOneByOrFail({ id: user.id }))
        .passwordHash,
    ).toBe(user.passwordHash);
  });
});
