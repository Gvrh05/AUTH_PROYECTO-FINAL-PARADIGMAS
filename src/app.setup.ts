import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolve } from 'node:path';

export function configureApp(app: INestApplication): void {
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Register after CORS so the reference also works from another origin.
  const docs = resolve(__dirname, '../docs');
  const http = app.getHttpAdapter();
  http.get('/auth/docs', (_request: Request, response: Response) =>
    response.sendFile('index.html', { root: docs }),
  );
  http.get('/auth/docs/openapi.json', (_request: Request, response: Response) =>
    response.sendFile('openapi.json', { root: docs }),
  );
}
