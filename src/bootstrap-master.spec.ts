import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { provisionMaster } from './bootstrap-master';
import { User } from './users/entities/user.entity';

describe('Internal MASTER bootstrap', () => {
  const fixture = (
    system: Partial<User> | null,
    existing: Partial<User> | null = null,
  ) => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce(system)
        .mockResolvedValueOnce(existing),
      create: (_entity: unknown, input: Partial<User>) => input,
      save: jest.fn((_entity: unknown, user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'new-id' }),
      ),
    };
    const source = {
      transaction: <T>(fn: (value: typeof manager) => Promise<T>) =>
        fn(manager),
    } as unknown as DataSource;
    return { manager, source };
  };
  beforeEach(() => {
    delete process.env.DEMO_USER_USERNAME;
    delete process.env.DEMO_USER_PASSWORD;
  });
  it('keeps renamed existing system account without requiring/resetting credentials', async () => {
    const { manager, source } = fixture({
      id: 'original-id',
      username: 'renamed',
    });
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'original-id',
      created: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('leaves an existing username and password unchanged without promoting it', async () => {
    const { manager, source } = fixture(null, { id: 'existing' });
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'existing',
      created: false,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('uses the fixed initial credentials even without password configuration', async () => {
    const { manager, source } = fixture(null);
    await expect(provisionMaster(source)).resolves.toMatchObject({
      created: true,
    });
    expect(
      await bcrypt.compare(
        'Profesor123!',
        manager.save.mock.calls[0][1].passwordHash!,
      ),
    ).toBe(true);
  });
  it('creates protected MASTER with bcrypt only on empty installation', async () => {
    process.env.DEMO_USER_PASSWORD = 'configured-password-123';
    process.env.DEMO_USER_USERNAME = 'do_not_create_this';
    const { manager, source } = fixture(null);
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'new-id',
      created: true,
    });
    const saved = manager.save.mock.calls[0][1];
    expect(saved).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 1,
    });
    expect(await bcrypt.compare('Profesor123!', saved.passwordHash!)).toBe(
      true,
    );
  });
});
