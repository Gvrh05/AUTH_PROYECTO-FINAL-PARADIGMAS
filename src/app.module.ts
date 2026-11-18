import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseOptions } from './database/database.config';

@Module({
  imports: [TypeOrmModule.forRoot(databaseOptions()), AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
