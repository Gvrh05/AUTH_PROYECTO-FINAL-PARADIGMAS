import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountManagement1800000000001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const username = (process.env.DEMO_USER_USERNAME || 'profesor_test')
      .trim()
      .toLowerCase();
    await runner.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE');
    const rows = (await runner.query(
      'SELECT id, username, role FROM users',
    )) as { id: string; username: string; role: string }[];
    const matches = rows.filter(
      (u) => u.username.trim().toLowerCase() === username,
    );
    if (rows.length && !matches.length)
      throw new Error(
        'No se encontró la identidad demo configurada; revise DEMO_USER_USERNAME antes de migrar',
      );
    if (
      matches.length > 1 ||
      rows.some((u) => u.role === 'MASTER' && u.id !== matches[0]?.id)
    ) {
      throw new Error(
        'Identidad demo ambigua o MASTER diferente: revise DEMO_USER_USERNAME antes de migrar',
      );
    }
    if (
      rows.some((u) => !['MASTER', 'PROFESOR', 'ESTUDIANTE'].includes(u.role))
    ) {
      throw new Error(
        'Roles desconocidos: migración detenida sin modificar cuentas',
      );
    }
    const names = rows.map((u) => u.username.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      throw new Error('Usernames ambiguos tras normalización');
    await runner.query(
      `ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true, ADD COLUMN "isSystem" boolean NOT NULL DEFAULT false, ADD COLUMN "credentialVersion" integer NOT NULL DEFAULT 1`,
    );
    await runner.query(
      `UPDATE users SET username = lower(btrim(username)), role = 'PROFESOR'`,
    );
    if (matches[0])
      await runner.query(
        `UPDATE users SET role = 'MASTER', "isSystem" = true WHERE id = $1`,
        [matches[0].id],
      );
    await runner.query(
      `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'PROFESOR', ADD CONSTRAINT users_role CHECK (role IN ('MASTER','PROFESOR')), ADD CONSTRAINT users_version CHECK ("credentialVersion" >= 1), ADD CONSTRAINT users_system CHECK (("isSystem" AND role = 'MASTER' AND active) OR (NOT "isSystem" AND role = 'PROFESOR'))`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX users_single_system ON users ("isSystem") WHERE "isSystem"`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX users_normalized_username ON users (lower(btrim(username)))`,
    );
    await runner.query(
      `CREATE FUNCTION protect_system_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."isSystem" AND (TG_OP = 'DELETE' OR NEW."isSystem" IS DISTINCT FROM OLD."isSystem" OR NEW.role IS DISTINCT FROM OLD.role OR NOT NEW.active) THEN RAISE EXCEPTION 'System account is protected'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$`,
    );
    await runner.query(
      `CREATE TRIGGER protect_system_user BEFORE UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION protect_system_user()`,
    );
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'Migración de identidad irreversible automáticamente; restaurar únicamente mediante procedimiento revisado',
      ),
    );
  }
}
