import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1800000000000 implements MigrationInterface {
  name = 'CreateUsers1800000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        role varchar NOT NULL DEFAULT 'ESTUDIANTE',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
