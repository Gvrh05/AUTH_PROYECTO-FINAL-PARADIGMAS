import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret?.trim()) {
          throw new Error('JWT_SECRET es obligatorio para iniciar Auth');
        }
        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            expiresIn: '1d' as const,
            audience: process.env.JWT_AUDIENCE?.trim() || 'kahoot-api',
            ...(process.env.JWT_ISSUER?.trim() && {
              issuer: process.env.JWT_ISSUER.trim(),
            }),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
