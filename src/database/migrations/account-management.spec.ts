import { QueryRunner } from 'typeorm';
import { AccountManagement1800000000001 } from './1800000000001-AccountManagement';

describe('Account migration preflight', () => {
  const migration = new AccountManagement1800000000001();
  const fixture = (rows: { id: string; username: string; role: string }[]) => {
    const query = jest.fn((sql: string) =>
      Promise.resolve(sql.startsWith('SELECT') ? rows : []),
    );
    return { query, runner: { query } as unknown as QueryRunner };
  };
  beforeEach(() => {
    delete process.env.DEMO_USER_USERNAME;
  });
  it.each([
    [{ id: '1', username: 'another', role: 'MASTER' }],
    [
      { id: '1', username: 'profesor_test', role: 'PROFESOR' },
      { id: '2', username: 'PROFESOR_TEST', role: 'ESTUDIANTE' },
    ],
    [
      { id: '1', username: 'profesor_test', role: 'PROFESOR' },
      { id: '2', username: 'other', role: 'MASTER' },
    ],
    [{ id: '1', username: 'profesor_test', role: 'UNKNOWN' }],
    [{ id: '1', username: 'other', role: 'PROFESOR' }],
  ])(
    'aborts ambiguous or unexpected identity before any write (%j)',
    async (...rows) => {
      const { query, runner } = fixture(rows);
      await expect(migration.up(runner)).rejects.toThrow();
      expect(
        query.mock.calls.every(([sql]) => /^(LOCK|SELECT)/.test(sql)),
      ).toBe(true);
    },
  );
  it('promotes only configured UUID and never writes passwords or IDs', async () => {
    process.env.DEMO_USER_USERNAME = 'custom_demo';
    const { query, runner } = fixture([
      { id: 'preserved-id', username: 'custom_demo', role: 'ESTUDIANTE' },
      { id: 'other-id', username: 'other', role: 'PROFESOR' },
    ]);
    await migration.up(runner);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET role = 'MASTER'"),
      ['preserved-id'],
    );
    expect(
      query.mock.calls.some(([sql]) => /passwordHash|SET id/.test(sql)),
    ).toBe(false);
  });
  it('allows empty installation without silently creating credentials', async () => {
    const { query, runner } = fixture([]);
    await migration.up(runner);
    expect(
      query.mock.calls.some(([sql]) => /INSERT|SET role = 'MASTER'/.test(sql)),
    ).toBe(false);
  });
});
