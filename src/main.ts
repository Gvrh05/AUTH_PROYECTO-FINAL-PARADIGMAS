import { authMetricsMiddleware } from './telemetry';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { corsOrigins } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(authMetricsMiddleware());
  app.enableShutdownHooks();

  app.enableCors({
    origin: corsOrigins(),
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
