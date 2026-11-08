import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // activacion de CORS
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  ); // validacion de dtos de forma automatica

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Auth Service corriendo en puerto ${port}`);
}

void bootstrap();
