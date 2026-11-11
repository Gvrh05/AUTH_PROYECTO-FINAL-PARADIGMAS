# Account management

## Why
Retirar el registro público y separar administración MASTER de docencia PROFESOR; revocar sesiones cuando cambia la vigencia de la cuenta sin perder identidades existentes.

## What changes
- Migración conservadora de identidad demo configurada y restricciones PostgreSQL.
- Bootstrap interno idempotente, gestión autenticada y perfiles seguros.
- JWT de propósito account, versión de credenciales y validación persistida.
- Corregir la especificación JWT heredada, que describía otro stack y responsabilidades ajenas a Auth.

## Capabilities
- Added: account-management.
- Modified: jwt-authentication.

## Impact
Consumidores deben abandonar /auth/register, autenticar cuenta provisionada y validar sesiones contra Auth. Instalaciones nuevas ejecutan build, bootstrap y arranque. No cambia propiedad de recursos en otros servicios.
