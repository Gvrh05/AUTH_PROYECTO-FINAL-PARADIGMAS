## ADDED Requirements
### Requirement: Safe HTTP metrics
Auth SHALL export HTTP request count and duration via configured OTLP with service and environment resource attributes, without private data labels.
#### Scenario: Invalid login
- **WHEN** login returns 401
- **THEN** the request is counted with its status and route template, without credentials
### Requirement: Exact configured CORS
Auth SHALL support a comma-separated allowlist of exact HTTP(S) origins.
#### Scenario: Netlify preflight
- **WHEN** the configured Netlify origin sends preflight
- **THEN** the response allows that origin without allowing unrelated origins
