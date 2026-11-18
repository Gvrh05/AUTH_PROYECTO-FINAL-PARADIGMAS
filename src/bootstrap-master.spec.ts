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
        .mockImplementation(
          (_entity: unknown, criteria: Partial<User>) =>
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
  it('updates the protected system account with the fixed credentials', async () => {
    const { manager, source } = fixture({
      id: 'system-id',
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 4,
    });
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'system-id',
      created: false,
    });
    const saved = manager.save.mock.calls[0][1];
    expect(saved).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 5,
    });
    expect(await bcrypt.compare('Profesor123!', saved.passwordHash!)).toBe(
      true,
    );
  });
  it('restores the fixed username on a renamed protected system account', async () => {
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
    expect(manager.save.mock.calls[0][1]).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
    });
  });
  it('creates a protected MASTER with the fixed credentials when absent', async () => {
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
    const saved = manager.save.mock.calls[0][1];
    expect(saved).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 1,
    });
  });
  it('promotes an existing demo username to the protected MASTER account', async () => {
    const { manager, source } = fixture(null, {
      id: 'existing-id',
      username: 'profesor_test',
      role: 'PROFESOR',
      isSystem: false,
      active: true,
      credentialVersion: 3,
    });
    await expect(provisionMaster(source)).resolves.toEqual({
      id: 'existing-id',
      created: false,
    });
    const saved = manager.save.mock.calls[0][1];
    expect(saved).toMatchObject({
      username: 'profesor_test',
      role: 'MASTER',
      isSystem: true,
      active: true,
      credentialVersion: 4,
    });
    expect(await bcrypt.compare('Profesor123!', saved.passwordHash!)).toBe(
      true,
    );
  });
  it('rejects an account-name conflict with an existing protected MASTER', async () => {
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
    await expect(provisionMaster(source)).rejects.toThrow(
      'pertenece a otra cuenta',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
});
