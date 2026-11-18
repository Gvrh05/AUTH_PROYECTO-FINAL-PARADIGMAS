import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { provisionMaster } from './bootstrap-master';
import { User } from './users/entities/user.entity';

describe('Internal MASTER bootstrap', () => {
  const password = 'BootstrapFixture123!';
  let originalUsername: string | undefined;
  let originalPassword: string | undefined;
  beforeEach(() => {
    originalUsername = process.env.DEMO_USER_USERNAME;
    originalPassword = process.env.DEMO_USER_PASSWORD;
    process.env.DEMO_USER_USERNAME = 'profesor_test';
    process.env.DEMO_USER_PASSWORD = password;
  });
  afterEach(() => {
    if (originalUsername === undefined) delete process.env.DEMO_USER_USERNAME;
    else process.env.DEMO_USER_USERNAME = originalUsername;
    if (originalPassword === undefined) delete process.env.DEMO_USER_PASSWORD;
    else process.env.DEMO_USER_PASSWORD = originalPassword;
  });
  const fixture = (
    system: Partial<User> | null,
    existing: Partial<User> | null = null,
  ) => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      findOneBy: jest
        .fn()
        .mockImplementation((_entity: unknown, criteria: Partial<User>) =>
          Promise.resolve(criteria.isSystem ? system : existing),
        ),
      create: (_entity: unknown, input: Partial<User>) => input,
      save: jest.fn((_entity: unknown, user: Partial<User>) =>
        Promise.resolve({ ...user, id: user.id ?? 'new-id' }),
      ),
    };
    const source = {
      transaction: <T>(fn: (value: typeof manager) => Promise<T>) =>
        fn(manager),
    } as unknown as DataSource;
    return { manager, source };
  };
  it('preserves an existing protected account without resetting credentials or state', async () => {
    const system = Object.freeze({
      id: 'system-id',
      username: 'profesor_test',
      passwordHash: 'existing-hash',
      role: 'MASTER' as const,
      isSystem: true,
      active: false,
      credentialVersion: 4,
    });
    const { manager, source } = fixture(system);
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'system-id',
      created: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(system.passwordHash).toBe('existing-hash');
    expect(system.credentialVersion).toBe(4);
    expect(system.active).toBe(false);
  });
  it('preserves the renamed protected account using its immutable system marker', async () => {
    const { manager, source } = fixture({
      id: 'system-id',
      username: 'renamed',
      role: 'MASTER',
      isSystem: true,
      credentialVersion: 1,
    });
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'system-id',
      created: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.findOneBy).toHaveBeenCalledTimes(1);
  });
  it('creates a protected MASTER with configured credentials only when absent', async () => {
    const { manager, source } = fixture(null);
    await expect(provisionMaster(source)).resolves.toMatchObject({
      created: true,
    });
    expect(
      await bcrypt.compare(
        password,
        manager.save.mock.calls[0][1].passwordHash!,
      ),
    ).toBe(true);
    const saved = manager.save.mock.calls[0][1];
    expect(saved).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 1,
    });
  });
  it('rejects an unmarked existing demo username instead of promoting or resetting it', async () => {
    const { manager, source } = fixture(null, {
      id: 'existing-id',
      username: 'profesor_test',
      role: 'PROFESOR',
      isSystem: false,
      active: true,
      credentialVersion: 3,
    });
    await expect(provisionMaster(source)).rejects.toThrow(
      'requiere revisión de migración',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('leaves both accounts untouched when a protected MASTER already exists', async () => {
    const { manager, source } = fixture(
      {
        id: 'system-id',
        username: 'renamed',
        role: 'MASTER',
        isSystem: true,
      },
      {
        id: 'existing-id',
        username: 'profesor_test',
        role: 'PROFESOR',
        isSystem: false,
      },
    );
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'system-id',
      created: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.findOneBy).toHaveBeenCalledTimes(1);
  });
  it('does not create an account when the configured initial password is absent', async () => {
    delete process.env.DEMO_USER_PASSWORD;
    const { manager, source } = fixture(null);
    await expect(provisionMaster(source)).rejects.toBeDefined();
    expect(manager.save).not.toHaveBeenCalled();
  });
});
