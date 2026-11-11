# Auth en Railway

Desplegar la rama `feature/punto4` de este repositorio con su Dockerfile. Un push
a esta rama no actualiza un servicio configurado para desplegar `develop` o `master`.

En Variables del servicio **Auth**, no en PostgreSQL, configurar:

```dotenv
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_COMPARTIDO_CON_LA_API
JWT_AUDIENCE=kahoot-api
CORS_ORIGIN=https://project-deploy-985df3.netlify.app
DEMO_USER_USERNAME=profesor_test
DEMO_USER_PASSWORD=REEMPLAZAR_POR_LA_CONTRASENA_INICIAL_DEL_MASTER
```

`Postgres` debe ser el servicio de la base **de Auth**. `DATABASE_URL` tiene prioridad
sobre DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME; la alternativa DB_* sigue soportada.
No copiar localhost ni el host `auth-db` del Compose a Railway. Con DB_* incompletas
en producción, el arranque falla explicando qué falta, sin revelar credenciales.

Mantener el mismo JWT_SECRET y JWT_AUDIENCE en el backend de juego. JWT_ISSUER es
opcional: si se configura, tiene que coincidir en ambos servicios. No colocar
JWT_SECRET, contraseñas ni OTEL_EXPORTER_OTLP_HEADERS en Netlify/VITE_* ni en Git.

El contenedor ejecuta migraciones al iniciar. Para una instalación nueva configurar
como Start Command `sh -c 'node dist/bootstrap-master.js && node dist/main.js'`:
crea el MASTER si falta y conserva su contraseña si ya existe. Respaldar antes de
actualizar una base con datos y revisar la identidad demo si la migración se detiene.

Railway provee PORT; generar el dominio público apuntando a ese puerto y configurar
el healthcheck `/auth/health`. La referencia es `/auth/docs/` y su JSON
`/auth/docs/openapi.json`. El JSON debe devolver application/json, nunca HTML de React.

CORS_ORIGIN admite uno o varios orígenes separados por coma, sin rutas ni barra
final. Por ejemplo `https://project-deploy-985df3.netlify.app,http://localhost:5173`.
No usar `*` para añadir acceso indiscriminado. Aplicar cambios de variables y
desplegar de nuevo: el .env local no llega automáticamente a Railway.

## Grafana Cloud (opcional)

Configurar las variables privadas de servicio obtenidas del asistente OTLP de Grafana:
OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS y
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf. Usar OTEL_SERVICE_NAME=profelink-auth y
OTEL_DEPLOYMENT_ENVIRONMENT=production. El header de autorización no debe publicarse.
Si no se configura endpoint, el servicio puede operar sin exportación OTLP.

## Comprobación sin credenciales

```sh
curl -i https://TU-AUTH/auth/health -H 'Origin: https://project-deploy-985df3.netlify.app'
curl -i https://TU-AUTH/auth/docs/openapi.json -H 'Origin: https://project-deploy-985df3.netlify.app'
```

Debe haber HTTP 200 y Access-Control-Allow-Origin con el origen de Netlify. Un
404 en docs indica una revisión anterior o una URL equivocada; no se arregla
quitando autenticación de las rutas de cuentas.
