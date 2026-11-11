import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CreateUsers1800000000000 } from './migrations/1800000000000-CreateUsers';
import { AccountManagement1800000000001 } from './migrations/1800000000001-AccountManagement';

export function databaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  const common = {
    type: 'postgres' as const,
    entities: [User],
    synchronize: false,
    migrations: [CreateUsers1800000000000, AccountManagement1800000000001],
    migrationsRun: true,
  };
  if (env.DATABASE_URL?.trim()) {
    let url: URL;
    try {
      url = new URL(env.DATABASE_URL);
    } catch {
      throw new Error(
        'DATABASE_URL de Auth debe ser una URL PostgreSQL válida',
      );
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
      throw new Error(
        'DATABASE_URL de Auth debe ser una URL PostgreSQL válida',
      );
    }
    return { ...common, url: env.DATABASE_URL };
  }
  if (env.NODE_ENV === 'production') {
    for (const key of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
      if (!env[key]?.trim()) {
        throw new Error(`Configura DATABASE_URL o ${key} en el servicio Auth`);
      }
    }
  }
  const port = Number(env.DB_PORT || '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT de Auth debe ser un puerto válido');
  }
  return {
    ...common,
    host: env.DB_HOST || 'localhost',
    port,
    username: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'kahoot_db',
  };
}
