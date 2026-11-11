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
  it('does not promote an existing ordinary account', async () => {
    const { manager, source } = fixture(null, { id: 'existing' });
    await expect(provisionMaster(source)).rejects.toThrow(
      'Identidad demo existente',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('requires valid configured initial password', async () => {
    const { manager, source } = fixture(null);
    await expect(provisionMaster(source)).rejects.toBeDefined();
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('creates protected MASTER with bcrypt only on empty installation', async () => {
    process.env.DEMO_USER_PASSWORD = 'configured-password-123';
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
    expect(
      await bcrypt.compare(process.env.DEMO_USER_PASSWORD, saved.passwordHash!),
    ).toBe(true);
  });
});
