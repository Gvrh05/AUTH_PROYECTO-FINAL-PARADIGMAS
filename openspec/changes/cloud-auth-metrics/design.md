## Decisions
Inicializar SDK antes de Nest y exportar solo si existe endpoint. HTTP middleware registra peticiones terminadas con método, ruta plantilla y estado. Nunca registrar token, contraseña, alias, query ni ID. Shutdown vacía el exportador. CORS utiliza orígenes exactos HTTP(S) separados por comas; no wildcard. Railway requiere redeploy y secretos proporcionados fuera de Git.
