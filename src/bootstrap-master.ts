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
    const username = 'profesor_test';
    const namedAccount = await manager.findOneBy(User, { username });
    if (system && namedAccount && system.id !== namedAccount.id) {
      throw new Error(
        'profesor_test ya pertenece a otra cuenta; revise la identidad demo antes de continuar',
      );
    }
    const existing = system ?? namedAccount;

    const dto = plainToInstance(CreateUserDto, {
      username,
      password: 'Profesor123!',
    });
    await validateOrReject(dto, {
      validationError: { target: false, value: false },
    });
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await manager.save(
      User,
      manager.create(User, {
        ...(existing ?? {}),
        username,
        passwordHash,
        role: 'MASTER',
        isSystem: true,
        active: true,
        credentialVersion: existing
          ? (existing.credentialVersion ?? 1) + 1
          : 1,
      }),
    );
    return { id: user.id, created: !existing };
  });
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    console.log(await provisionMaster(app.get(DataSource)));
    console.log(
      'Usuario profesor_test creado/actualizado con contraseña fija.',
    );
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void main().catch((error: unknown) => {
    console.error(
      'Bootstrap falló: revise identidad demo, DEMO_USER_PASSWORD y conexión DB',
      error,
    );
    process.exitCode = 1;
  });
