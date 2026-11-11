<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Servicio de identidad de Profelink Kahoot. La autenticación usa exclusivamente
`username` y contraseña; no se solicita ni se usa correo electrónico.

## Contrato de autenticación

- `POST /auth/login`: `{username,password}` → 200 `{accessToken,user}`.
- `GET /auth/me`, `POST /auth/session/validate`: Bearer → 200 perfil seguro.
- `GET /auth/users?page=1&limit=20`: MASTER → `{items,total,page,limit}`.
- `POST /auth/users`: MASTER, `{username,password}` → 201 perfil PROFESOR.
- `PATCH /auth/users/:id`: MASTER, `{username?,active?}` → 200 perfil.
- `POST /auth/users/:id/reset-password`: MASTER, `{password}` → 200 perfil.
- Perfil seguro: `{id,username,role,active,isSystem,credentialVersion}`. Nunca hashes.
- Registro público retirado (`POST /auth/register` devuelve 404).
- JWT HS256: `sub` UUID, `role` MASTER|PROFESOR, `purpose:'account'`,
  `credentialVersion` entero positivo, `exp` obligatorio (24 h), `aud` default
  `kahoot-api`. `JWT_SECRET` debe coincidir con API; `JWT_ISSUER` opcional.
- Credencial inválida/inactiva/revocada: 401; rol insuficiente o desactivación
  del sistema: 403; usuario inexistente: 404; username duplicado: 409.
- Username normalizado trim/lowercase, 3–15 caracteres `[a-z0-9_]`. Contraseña
  8 caracteres mínimo y 72 bytes UTF-8 máximo. Paginación: limit 1–100.
- Desactivar, reactivar o resetear incrementa versión. Reactivar exige nuevo
  login; renombrar conserva identidad. Role/isSystem no son campos editables.
- Healthcheck público: `GET /auth/health`.

## Migración y bootstrap

Usar Node 22 y pnpm 11.11.0. `pnpm-workspace.yaml` autoriza explícitamente scripts
de bcrypt (módulo nativo) y Parcel watcher (watch de desarrollo).

Configurar DB_HOST/PORT/USER/PASSWORD/NAME, JWT_SECRET y DEMO_USER_USERNAME
(default `profesor_test`) antes de migrar. DEMO_USER_PASSWORD se usa **solo para
crear** el MASTER inicial; nunca resetea contraseñas existentes.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm bootstrap:master
pnpm start:prod
```

En imagen de producción, el comando interno es `node dist/bootstrap-master.js`
(no requiere pnpm instalado). Compose debe ejecutarlo como tarea única después
de PostgreSQL saludable y antes de Auth/API/seed. El seed API debe usar login,
no register. El coordinador integra ese orden fuera de este repositorio.

La migración automática conserva UUID, hash y createdAt; promueve solo la demo
configurada y convierte los restantes PROFESOR/ESTUDIANTE a PROFESOR. Base
no vacía sin demo, MASTER diferente, roles desconocidos o nombres ambiguos
detienen la migración con diagnóstico. Revisar configuración y datos antes de
reintentar; no borrar bases/volúmenes. Preparar respaldo antes del despliegue.
No hay down automático destructivo. Bootstrap idempotente identifica isSystem
incluso tras renombrar y no necesita la contraseña inicial cuando ya existe.

La cuenta de sistema no se puede desactivar, borrar, desmarcar o degradar; checks,
índice único y trigger PostgreSQL refuerzan la protección. Las operaciones de
estado/reset bloquean fila para incrementar versión sin perder actualizaciones.

Pruebas locales usan fixtures aislados con JWT/bcrypt reales. Antes del despliegue
ejecutar migración/trigger/concurrencia sobre PostgreSQL aislado y smoke integrado
API/web. Esas pruebas necesitan infraestructura y no las reemplaza el fixture.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
