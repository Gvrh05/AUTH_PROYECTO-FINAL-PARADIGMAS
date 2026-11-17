import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NumericProfileAvatar1800000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT users_avatar_allowed, ALTER COLUMN "avatarId" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN "avatarId" TYPE integer USING (CASE "avatarId"
      WHEN 'owl-menta' THEN 1 WHEN 'owl-rosa' THEN 2 WHEN 'owl-sol' THEN 3
      WHEN 'owl-cielo' THEN 4 WHEN 'owl-coral' THEN 5 ELSE 0 END)`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN "avatarId" SET DEFAULT 0,
      ADD CONSTRAINT users_avatar_allowed CHECK ("avatarId" BETWEEN 0 AND 14)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT users_avatar_allowed, ALTER COLUMN "avatarId" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN "avatarId" TYPE varchar USING (CASE "avatarId"
      WHEN 1 THEN 'owl-menta' WHEN 2 THEN 'owl-rosa' WHEN 3 THEN 'owl-sol'
      WHEN 4 THEN 'owl-cielo' WHEN 5 THEN 'owl-coral' ELSE 'owl-luna' END)`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN "avatarId" SET DEFAULT 'owl-luna',
      ADD CONSTRAINT users_avatar_allowed CHECK ("avatarId" IN ('owl-luna', 'owl-menta', 'owl-rosa', 'owl-sol', 'owl-cielo', 'owl-coral'))`);
  }
}
