import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'El username debe ser un texto' })
  @IsNotEmpty({ message: 'El username es obligatorio' })
  @MaxLength(15, { message: 'El username no puede ser mayor a 15 caracteres' })
  username: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
