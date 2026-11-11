import { observeHttp } from './telemetry';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';
import { resolve } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(observeHttp);
  const docs = resolve(__dirname, '../docs');
  const http = app.getHttpAdapter();
  http.get('/auth/docs', (_request: Request, response: Response) =>
    response.sendFile('index.html', { root: docs }),
  );
  http.get('/auth/docs/openapi.json', (_request: Request, response: Response) =>
    response.sendFile('openapi.json', { root: docs }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });
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

void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : 'No se pudo iniciar Auth',
  );
  process.exit(1);
});
