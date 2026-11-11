## ADDED Requirements

### Requirement: Conservative identity migration
Auth SHALL preserve UUID/password hashes and promote only configured DEMO_USER_USERNAME (default profesor_test) to MASTER/isSystem; all other known legacy accounts SHALL become PROFESOR.

#### Scenario: Existing configured demo
- **WHEN** migration finds one matching demo and no conflicting MASTER or normalized usernames
- **THEN** it preserves identifiers/hashes and promotes only that account.

#### Scenario: Ambiguous or missing identity
- **WHEN** a nonempty database has no demo match, ambiguous names, unknown roles or a different MASTER
- **THEN** migration aborts before data mutation with a diagnostic.

### Requirement: Internal idempotent bootstrap
Auth SHALL offer pnpm bootstrap:master using node dist/bootstrap-master.js, never a public provisioning endpoint.

#### Scenario: New installation
- **WHEN** the database is empty and DEMO_USER_PASSWORD is valid
- **THEN** bootstrap creates the configured protected MASTER with a bcrypt hash.

#### Scenario: Existing or renamed system account
- **WHEN** bootstrap runs again
- **THEN** it preserves the system account UUID, visible name and hash without requiring initial credentials.

### Requirement: Protected system identity
Auth SHALL protect isSystem independently of username, enforce MASTER/PROFESOR roles and prohibit system deactivation, deletion or demotion at database level.

#### Scenario: Attempt to deactivate MASTER
- **WHEN** an administrator submits active false for system account
- **THEN** Auth returns 403 and preserves active state.

### Requirement: MASTER account administration
Only active MASTER SHALL list/create/patch/reset accounts; creation SHALL return PROFESOR safe profile without replacing actor session. Registration SHALL be absent.

#### Scenario: Create and list
- **WHEN** MASTER posts username/password to /auth/users
- **THEN** Auth returns safe profile with 201; duplicate normalized username returns 409; GET users returns items,total,page,limit with defaults 1/20.

#### Scenario: Insufficient privilege or arbitrary role
- **WHEN** PROFESOR invokes administration or MASTER submits role/isSystem fields
- **THEN** Auth rejects with 403 or validation 400 respectively.

### Requirement: Account session validity
Auth SHALL return only id,username,role,active,isSystem,credentialVersion from GET /auth/me and POST /auth/session/validate after Bearer validation and persisted account lookup.

#### Scenario: Revocation and reactivation
- **WHEN** MASTER deactivates or resets a password
- **THEN** old tokens fail with 401; reactivation does not restore them and a new login is required.

### Requirement: Administrative audit
Auth SHALL log successful administrative changes using action and actor/target UUIDs without secrets.

#### Scenario: Password reset
- **WHEN** a reset succeeds
- **THEN** an audit event is emitted without password, hash or token.
### Requirement: Registro de perfil
Auth SHALL aceptar un usuario y contraseña válidos en `POST /auth/register` y crear un perfil activo PROFESOR con identidad propia.

#### Scenario: Registro público sin privilegios administrativos
- WHEN una persona registra un nombre disponible y una contraseña válida
- THEN recibe el perfil seguro y puede iniciar sesión con ese usuario.

#### Scenario: Nombre duplicado o intento de elegir rol
- WHEN el nombre ya existe o la solicitud contiene un rol
- THEN Auth responde 409 para duplicados o 400 para un campo no admitido.
