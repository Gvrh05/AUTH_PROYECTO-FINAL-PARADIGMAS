import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // activacion de CORS
  app.useGlobalPipes(new ValidationPipe({ whitelist: true })); //validacion de dtos de forma automatica

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Auth Service corriendo en puerto ${process.env.PORT || 3001}`);

  bootstrap();
}
