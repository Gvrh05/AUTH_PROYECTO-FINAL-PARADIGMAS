# JWT authentication

## Purpose
Auth emite y valida credenciales de cuentas docentes. Autorización de recursos y participantes temporales pertenecen a los consumidores, no a este servicio.

## Requirements

### Requirement: Configuration-driven JWT Bearer Validation
Auth MUST require JWT_SECRET, use JWT_AUDIENCE (default kahoot-api) and validate JWT_ISSUER when configured.

#### Scenario: Missing secret
- **WHEN** Auth starts without a nonempty JWT_SECRET
- **THEN** startup fails.

### Requirement: Cryptographic Token and Claim Validation
Auth MUST issue/accept only HS256 account JWT with UUID sub, MASTER|PROFESOR role, purpose account, positive integer credentialVersion and mandatory exp. Login returns accessToken and safe user profile. Validation MUST check current account active state, role and version.

#### Scenario: Legacy or revoked token
- **WHEN** signature/algorithm/audience/issuer/expiration/claims are invalid or account state differs
- **THEN** protected Auth operations return 401.

### Requirement: Auth endpoint authorization
Login, /auth/health and root health are public. Me/session validation MUST require active account; account administration MUST require MASTER. /auth/register MUST NOT provision accounts.

#### Scenario: Professor administration
- **WHEN** active PROFESOR calls /auth/users
- **THEN** Auth returns 403.

### Requirement: Header-only account credentials
Auth MUST read account credentials only from Authorization Bearer, never query parameters.

#### Scenario: Query token
- **WHEN** a request to /auth/me supplies only access_token in query
- **THEN** Auth returns 401.
