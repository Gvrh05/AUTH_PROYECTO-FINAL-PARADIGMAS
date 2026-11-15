import {
  Controller,
  Post,
  Body,
  HttpCode,
  Get,
  Headers,
  Query,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  CreateUserDto,
  ListUsersDto,
  PasswordDto,
  UpdateUserDto,
} from './dto/account.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('health') health() {
    return { status: 'ok', service: 'auth' };
  }
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.auth.create(dto);
  }
  @Get('me') me(@Headers('authorization') header?: string) {
    return this.auth.validate(header);
  }
  @HttpCode(200)
  @Post('session/validate')
  validate(@Headers('authorization') header?: string) {
    return this.auth.validate(header);
  }
  @Get('users') async list(
    @Query() query: ListUsersDto,
    @Headers('authorization') header?: string,
  ) {
    await this.auth.master(header);
    return this.auth.list(query);
  }
  @Post('users') async create(
    @Body() dto: CreateUserDto,
    @Headers('authorization') header?: string,
  ) {
    const actor = await this.auth.master(header);
    return this.auth.create(dto, actor.id);
  }
  @Patch('users/:id') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Headers('authorization') header?: string,
  ) {
    const actor = await this.auth.master(header);
    return this.auth.update(id, dto, actor.id);
  }
  @HttpCode(200)
  @Post('users/:id/reset-password')
  async reset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasswordDto,
    @Headers('authorization') header?: string,
  ) {
    const actor = await this.auth.master(header);
    return this.auth.resetPassword(id, dto.password, actor.id);
  }
}
