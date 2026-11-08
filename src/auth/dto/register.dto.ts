import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsEnum(['PROFESSOR', 'ESTUDIANTE'])
  role?: 'PROFESSOR' | 'ESTUDIANTE';
}
