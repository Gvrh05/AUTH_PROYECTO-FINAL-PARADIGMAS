## MODIFIED Requirements

### Requirement: Configuration-driven JWT Bearer Validation
Auth MUST require JWT_SECRET, use JWT_AUDIENCE default kahoot-api, and validate optional configured JWT_ISSUER.

#### Scenario: Missing secret
- **WHEN** JWT_SECRET is empty
- **THEN** startup fails.

### Requirement: Cryptographic Token and Claim Validation
Auth MUST issue/validate HS256 JWT with UUID sub, MASTER|PROFESOR role, purpose account, positive integer credentialVersion and mandatory exp; validation MUST consult persisted active state/role/version.

#### Scenario: Legacy token
- **WHEN** a token lacks purpose, credentialVersion or exp
- **THEN** Auth returns 401 and requires new login.

#### Scenario: Legacy or revoked token
- **WHEN** signature/algorithm/audience/issuer/expiration/claims are invalid or account state differs
- **THEN** protected Auth operations return 401.

### Requirement: Auth endpoint authorization
Auth MUST allow public login, health and registration of a PROFESOR profile. Me and session validation require an active account. User administration requires MASTER.

#### Scenario: Professor administration
- **WHEN** a PROFESOR calls user management
- **THEN** Auth returns 403.

### Requirement: Header-only account credentials
Auth MUST read credentials only from Authorization Bearer.

#### Scenario: Query token
- **WHEN** a protected request provides only query access_token
- **THEN** Auth returns 401.
