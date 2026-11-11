## Why
Auth público no emitía las métricas requeridas para la demostración Cloud y CORS admitía un solo origen.
## What Changes
- SDK OTLP configurable y métricas HTTP sin datos privados.
- Allowlist CORS exacta por variable, compatible con localhost y Netlify.
## Capabilities
### New Capabilities
- `auth-observability`: contadores HTTP y exportación Cloud.
## Impact
Arranque Auth, dependencias y configuración de despliegue. Sin cambios de roles ni registro público.
