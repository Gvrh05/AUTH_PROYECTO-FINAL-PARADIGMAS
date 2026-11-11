import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { User } from './users/entities/user.entity';
import { CreateUserDto } from './auth/dto/account.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export async function provisionMaster(source: DataSource) {
  return source.transaction(async (manager) => {
    await manager.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE');
    const system = await manager.findOneBy(User, { isSystem: true });
    // The immutable marker survives visible username changes; never reset an existing account.
    if (system) return { id: system.id, created: false };
    const username = (process.env.DEMO_USER_USERNAME || 'profesor_test')
      .trim()
      .toLowerCase();
    if (await manager.findOneBy(User, { username }))
      throw new Error(
        'Identidad demo existente sin marca de sistema; requiere revisión de migración',
      );
    const dto = plainToInstance(CreateUserDto, {
      username,
      password: process.env.DEMO_USER_PASSWORD,
    });
    await validateOrReject(dto, {
      validationError: { target: false, value: false },
    });
    const user = await manager.save(
      User,
      manager.create(User, {
        username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: 'MASTER',
        isSystem: true,
        active: true,
        credentialVersion: 1,
      }),
    );
    return { id: user.id, created: true };
  });
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    console.log(await provisionMaster(app.get(DataSource)));
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void main().catch(() => {
    console.error(
      'Bootstrap falló: revise identidad demo, DEMO_USER_PASSWORD y conexión DB',
    );
    process.exitCode = 1;
  });
