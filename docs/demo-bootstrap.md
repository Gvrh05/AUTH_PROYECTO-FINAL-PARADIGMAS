# Cuenta inicial de la entrega

Una instalación nueva provisiona `profesor_test` / `Profesor123!` mediante
`pnpm bootstrap:master` después de `pnpm build`. La cuenta creada es MASTER.
Estas credenciales son conocidas de la demo; no protegen datos sensibles.

El bootstrap consulta primero la marca de sistema y después el username. Si ya
existe la cuenta, conserva UUID, hash, contraseña, estado y rol; no la restablece
ni duplica. En consecuencia, cambiar `.env` **no cambia la contraseña de una base
existente**. No se borran tablas ni volúmenes para adoptar estos valores.

`.env.example` y el setup local documentan los valores estables. Los secretos de
PostgreSQL y JWT siguen configurándose independientemente y no se publican.
La conexión Railway mantiene precedencia de DATABASE_URL sobre DB_* y se conserva
la telemetría entrante. Las pruebas verifican tanto alta inicial como preservación.

No se hizo push; los cambios se dejan en commits locales para revisión.
