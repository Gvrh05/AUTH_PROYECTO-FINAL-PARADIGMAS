import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, ListUsersDto, UpdateUserDto } from './dto/account.dto';

export const safeUser = (u: User) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  active: u.active,
  isSystem: u.isSystem,
  credentialVersion: u.credentialVersion,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({
      username: dto.username.trim().toLowerCase(),
    });
    if (
      !user?.active ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    )
      throw new UnauthorizedException('Credenciales inválidas');
    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        role: user.role,
        purpose: 'account',
        credentialVersion: user.credentialVersion,
      }),
      user: safeUser(user),
    };
  }

  async validate(authorization?: string) {
    const token = /^Bearer ([^\s]+)$/i.exec(authorization || '')?.[1];
    if (!token) throw new UnauthorizedException();
    let claims: Record<string, unknown>;
    try {
      claims = this.jwt.verify<Record<string, unknown>>(token, {
        algorithms: ['HS256'],
        audience: process.env.JWT_AUDIENCE?.trim() || 'kahoot-api',
        ...(process.env.JWT_ISSUER?.trim()
          ? { issuer: process.env.JWT_ISSUER.trim() }
          : {}),
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (
      typeof claims.sub !== 'string' ||
      !isUUID(claims.sub) ||
      !['MASTER', 'PROFESOR'].includes(String(claims.role)) ||
      claims.purpose !== 'account' ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      !Number.isInteger(claims.credentialVersion) ||
      Number(claims.credentialVersion) < 1
    )
      throw new UnauthorizedException();
    const user = await this.users.findOneBy({ id: claims.sub });
    if (
      !user?.active ||
      user.role !== claims.role ||
      user.credentialVersion !== claims.credentialVersion
    )
      throw new UnauthorizedException();
    return safeUser(user);
  }

  async master(authorization?: string) {
    const actor = await this.validate(authorization);
    if (actor.role !== 'MASTER') throw new ForbiddenException();
    return actor;
  }

  async list(query: ListUsersDto) {
    const [users, total] = await this.users.findAndCount({
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      items: users.map(safeUser),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(dto: CreateUserDto, actor?: string) {
    try {
      const user = await this.users.save(
        this.users.create({
          username: dto.username,
          passwordHash: await bcrypt.hash(dto.password, 10),
          role: 'PROFESOR',
          active: true,
          isSystem: false,
          credentialVersion: 1,
        }),
      );
      this.audit(actor ? 'create' : 'register', actor ?? user.id, user.id);
      return safeUser(user);
    } catch (error) {
      this.rethrow(error);
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: string) {
    try {
      const result = await this.users.manager.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) throw new NotFoundException();
        if (user.isSystem && dto.active === false)
          throw new ForbiddenException('Cuenta de sistema protegida');
        if (dto.username !== undefined) user.username = dto.username;
        if (dto.active !== undefined && dto.active !== user.active) {
          user.active = dto.active;
          user.credentialVersion++;
        }
        return safeUser(await manager.save(user));
      });
      this.audit('update', actor, id);
      return result;
    } catch (error) {
      this.rethrow(error);
    }
  }

  async resetPassword(id: string, password: string, actor: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await this.users.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException();
      user.passwordHash = passwordHash;
      user.credentialVersion++;
      return safeUser(await manager.save(user));
    });
    this.audit('reset-password', actor, id);
    return result;
  }

  private audit(action: string, actor: string, target: string) {
    this.logger.log(JSON.stringify({ action, actor, target }));
  }
  private rethrow(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    )
      throw new ConflictException('Username ya registrado');
    throw error;
  }
}
