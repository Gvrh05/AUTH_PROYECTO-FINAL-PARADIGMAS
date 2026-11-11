# Design

## Identity and migration
Una transacción bloquea users y valida DEMO_USER_USERNAME (default profesor_test), nombres normalizados y roles conocidos antes de escribir. Base vacía permite bootstrap; base no vacía sin demo, demo ambiguo, colisiones normalizadas o MASTER diferente detienen migración con diagnóstico. Solo la identidad demo recibe MASTER/isSystem; otras cuentas pasan a PROFESOR. UUID, hashes y fechas se conservan. Los nombres se normalizan trim/lowercase.

Checks limitan roles, versión positiva y correspondencia MASTER/isSystem/active. Índice parcial admite una sola cuenta sistema; trigger impide eliminar/desmarcar/desactivar/cambiar rol del sistema incluso mediante SQL. La migración no tiene rollback automático destructivo.

## Bootstrap
El comando usa el contexto Nest sin escuchar HTTP y ejecuta migraciones. Bajo bloqueo de tabla busca primero isSystem, conservando cuentas renombradas y contraseñas existentes. Solo crea cuenta nueva con contraseña configurada y validada; una cuenta ordinaria con igual nombre genera error. Restricción única y bloqueo serializan ejecuciones concurrentes.

## Authorization and revocation
HS256, audiencia configurable/default kahoot-api, issuer opcional, sub UUID, role MASTER|PROFESOR, purpose account, credentialVersion entero positivo y exp obligatorio. Cada operación protegida consulta cuenta activa y compara rol/versión. Cambios de estado y reset toman bloqueo de fila e incrementan versión atómicamente. Reactivar nunca restaura tokens previos. Renombrar no cambia identidad ni revoca sesión.

## API and validation
Perfil seguro explícito, sin serializar entidad. Alta/patch no aceptan role/isSystem/version. Username trim/lowercase, 3–15 letras ASCII/números/underscore; password mínimo 8 caracteres y máximo 72 bytes UTF-8 (bcrypt). PATCH rechaza null. Listado page >= 1, limit 1–100, defaults 1/20. Duplicados concurrentes PostgreSQL 23505 -> 409. Credenciales inválidas -> 401; rol insuficiente/protección sistema -> 403; usuario inexistente -> 404.

Logs administrativos contienen solo acción, UUID actor y UUID objetivo; nunca cuerpos, hashes, contraseñas o tokens. La auditoría operativa se emite tras guardar cambios.

## Validation boundaries
HTTP e2e usa repositorio aislado y criptografía real. Unit tests cubren preflight de migración y bootstrap. SQL, triggers, rollback transaccional y concurrencia reales requieren PostgreSQL aislado en integración; no se levantó infraestructura compartida.
