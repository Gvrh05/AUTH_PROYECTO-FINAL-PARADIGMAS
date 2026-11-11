import { observeHttp } from './telemetry';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(observeHttp);
  configureApp(app);

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
