# Account management

## Why
Permitir el registro público de perfiles PROFESOR y separar la administración MASTER. Revocar sesiones cuando cambia la vigencia de la cuenta sin perder identidades existentes.

## What changes
- Migración conservadora de identidad demo configurada y restricciones PostgreSQL.
- Bootstrap interno idempotente, gestión autenticada y perfiles seguros.
- JWT de propósito account, versión de credenciales y validación persistida.
- Corregir la especificación JWT heredada, que describía otro stack y responsabilidades ajenas a Auth.

## Capabilities
- Added: account-management.
- Modified: jwt-authentication.

## Impact
Los consumidores pueden registrar un perfil mediante /auth/register, iniciar sesión y validar sesiones contra Auth. Las instalaciones nuevas ejecutan build, bootstrap y arranque.
