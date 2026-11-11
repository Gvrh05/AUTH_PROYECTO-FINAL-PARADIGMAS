import { databaseOptions } from './database.config';

describe('Auth database configuration', () => {
  it('accepts Railway DATABASE_URL and never enables synchronize', () => {
    expect(
      databaseOptions({
        NODE_ENV: 'production',
        DATABASE_URL:
          'postgresql://user:password@database.railway.internal:5432/auth',
      }),
    ).toMatchObject({
      type: 'postgres',
      url: 'postgresql://user:password@database.railway.internal:5432/auth',
      synchronize: false,
      migrationsRun: true,
    });
  });
  it('keeps DB_* configuration for Compose', () => {
    expect(
      databaseOptions({
        NODE_ENV: 'production',
        DB_HOST: 'auth-db',
        DB_USER: 'auth',
        DB_PASSWORD: 'fixture',
        DB_NAME: 'auth_db',
        DB_PORT: '5432',
      }),
    ).toMatchObject({
      host: 'auth-db',
      username: 'auth',
      database: 'auth_db',
      port: 5432,
    });
  });
  it('fails early rather than connecting to localhost in production', () => {
    expect(() => databaseOptions({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL o DB_HOST',
    );
  });
  it.each(['bad-url', 'https://example.com'])(
    'rejects an invalid URL without echoing credentials',
    (url) => {
      expect(() => databaseOptions({ DATABASE_URL: url })).toThrow(
        'URL PostgreSQL válida',
      );
    },
  );
  it('rejects invalid ports', () => {
    expect(() => databaseOptions({ DB_PORT: 'not-a-port' })).toThrow('DB_PORT');
  });
});
