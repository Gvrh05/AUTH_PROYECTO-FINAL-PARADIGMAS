import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileAvatar1800000000002 implements MigrationInterface {
  name = 'ProfileAvatar1800000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN "avatarId" varchar NOT NULL DEFAULT 'owl-luna'`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD CONSTRAINT users_avatar_allowed CHECK ("avatarId" IN ('owl-luna', 'owl-menta', 'owl-rosa', 'owl-sol', 'owl-cielo', 'owl-coral'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users DROP CONSTRAINT users_avatar_allowed',
    );
    await queryRunner.query('ALTER TABLE users DROP COLUMN "avatarId"');
  }
}
