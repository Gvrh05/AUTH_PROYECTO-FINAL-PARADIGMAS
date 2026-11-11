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

## REMOVED Requirements

### Requirement: Global Endpoint Authorization and Public Exceptions
**Reason**: Legacy specification describes another service's quizzes/images and excludes Auth login.
**Migration**: Use Auth endpoint authorization below; resource access belongs to API specs.

### Requirement: Authenticated Context via ICurrentUser
**Reason**: .NET ICurrentUser does not exist in this Nest Auth service.
**Migration**: Consumers use safe session profile UUID for resource authorization.

### Requirement: SignalR Hub Authentication via Query Parameter
**Reason**: Auth exposes no SignalR or gameplay websocket.
**Migration**: Gameplay authentication is owned by API; Auth uses Authorization header.

## ADDED Requirements

### Requirement: Auth endpoint authorization
Auth MUST allow public login/health, require active account for me/session validation and MASTER for user administration; public registration MUST be absent.

#### Scenario: Unauthorized account administration
- **WHEN** a PROFESOR calls user management
- **THEN** Auth returns 403.

### Requirement: Header-only account credentials
Auth MUST read credentials only from Authorization Bearer.

#### Scenario: Query-only token
- **WHEN** a protected request provides only query access_token
- **THEN** Auth returns 401.
