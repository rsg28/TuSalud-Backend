# Fixes de concurrencia / multi-vendedor / multi-rol

Conjunto de cambios para soportar muchos vendedores, managers y clientes operando a la vez sin perder integridad. Cubre **todos** los riesgos detectados en auditoría y va acompañado de cambios de backend en este mismo commit.

Se aplica en **dos migraciones SQL** (`migration_concurrencia_fixes.sql` y `migration_concurrencia_fixes_v2.sql`) más cambios en backend Node.js.

---

## 1. Qué resuelve

### Tanda 1 (`migration_concurrencia_fixes.sql` + backend)

| Riesgo previo | Fix |
|---|---|
| Dos vendedores creando pedido/cotización/factura al mismo tiempo → colisión de `numero_*` o salto de números | Tabla `serie_numeracion` + helper atómico `utils/numeracion.js` (`LAST_INSERT_ID` trick) |
| Dos managers facturando el mismo pedido a la vez → dos facturas y/o cotización facturada dos veces | `UNIQUE(cotizacion_id)` en `factura_cotizacion` + `SELECT … FOR UPDATE` en `createFactura` |
| Aprobación HTTP + aprobación por WhatsApp casi simultáneas | Compare-and-swap en `updateEstadoCotizacion` y `aplicarTransicionExterna` |
| `cotizacion_principal_id` last-write-wins | `COALESCE(cotizacion_principal_id, ?)` (first-approval-wins) |
| `PATCH /pedidos/:id/estado` saca un pedido de un estado terminal | Lista negra + `estado_esperado` opcional (CAS) |
| Upsert no atómico de `examen_precio` / `emo_perfil_precio` con `sede_id IS NULL` | Columnas `sede_key` / `empresa_key` (`COALESCE(.., 0)`) + UNIQUE + `INSERT … ON DUPLICATE KEY UPDATE` |
| Pool MySQL = 10 conexiones, cola ilimitada | `connectionLimit = 50`, `queueLimit = 200`, configurables por env |
| JWT sin expiración | `expiresIn` configurable (`JWT_EXPIRES_IN`, default `30d`) |

### Tanda 2 (`migration_concurrencia_fixes_v2.sql` + backend) — **NUEVO**

| Riesgo previo | Fix |
|---|---|
| Doble clic / retry del frontend genera dos pedidos/cotizaciones/facturas idénticos | Tabla `idempotency_keys` + middleware `middleware/idempotency.js` para `POST /api/pedidos`, `POST /api/cotizaciones`, `POST /api/cotizaciones/complementarias`, `POST /api/pedidos/:id/examenes`, `POST /api/facturas`. El cliente envía `Idempotency-Key: <uuid>` y reintentos devuelven la primera respuesta cacheada |
| Vendedor edita ítems de una cotización aprobada → cambia el monto facturado por la espalda | `ESTADOS_COTIZACION_BLOQUEADOS` en `updateCotizacion`: rechaza con 403 cualquier cambio de ítems o estado si la cotización está `APROBADA / APROBADA_POR_MANAGER / RECHAZADA / CANCELADA` |
| Dos personas editan ítems de la misma cotización a la vez (DELETE-all + reinsert) → se pisan | Versionado optimista: el frontend envía `expected_updated_at` y el backend devuelve `409 COTIZACION_DESACTUALIZADA` si alguien más editó entre tanto |
| `agregarExamen` y `marcarExamenCompletado` no estaban dentro de transacción → entrada parcial si el segundo `INSERT` falla | Ambos endpoints reorganizados con `pool.getConnection() / BEGIN / COMMIT` + `SELECT … FOR UPDATE` sobre la fila padre |
| WhatsApp: dos webhooks generan dos conversaciones abiertas para la misma cotización | `UNIQUE` parcial `uq_wa_cotizacion_abierta (cotizacion_id, estado_abierto_lock)` + `UPDATE … SET estado='CANCELADA'` previo al `INSERT` con manejo de `ER_DUP_ENTRY` |
| WhatsApp: vendedor con varias cotizaciones pendientes contesta sin decir cuál → la última gana | El mensaje template incluye `APROBAR COT-YYYY-NNNNNN`; el webhook parsea el N° del cuerpo y matchea exactamente. Si hay ambigüedad, pide al vendedor que repita con el N° |
| Falta de auditoría centralizada para "¿quién hizo qué?" | Tabla `audit_log` + helper `utils/audit.js` + endpoints `GET /api/auditoria`, `/api/auditoria/resumen`, `/api/auditoria/mio`. Cada acción crítica registra rol, usuario, IP, payload |
| No se ve en la UI que otro vendedor / manager ya está editando un pedido (choques fáciles) | Soft-lock de presencia: `editor_actividad` + `utils/presencia.js` + endpoints `POST /api/presencia/heartbeat`, `GET /api/presencia/:tipo/:id`, `DELETE /api/presencia/:tipo/:id` |
| `archivoCache` en memoria por proceso (Map) | Validado: tiene fallback automático a regenerar el XLSX desde BD si el token no está en cache (multi-instancia OK). Se mantiene como optimización local |

---

## 2. Despliegue desde tu máquina contra RDS

> Conexión usada: `mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud`

### 2.1. Subir los archivos al servidor (si todavía no están allí)

Si vas a correr desde tu PC (Windows), salta este paso: los `.sql` están dentro del repo en `TuSalud-Backend/scripts/`.

### 2.2. Aplicar las migraciones SQL — orden importa

**PowerShell (Windows, desde la raíz del repo):**

```powershell
# 1. Migración v1 (si aún no la corriste)
Get-Content -Encoding UTF8 .\TuSalud-Backend\scripts\migration_concurrencia_fixes.sql `
  | mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud

# 2. Migración v2 (siempre después de la v1)
Get-Content -Encoding UTF8 .\TuSalud-Backend\scripts\migration_concurrencia_fixes_v2.sql `
  | mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud
```

**Bash / WSL / Git Bash:**

```bash
mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud \
  < TuSalud-Backend/scripts/migration_concurrencia_fixes.sql

mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud \
  < TuSalud-Backend/scripts/migration_concurrencia_fixes_v2.sql
```

Ambas migraciones son **idempotentes**: puedes correrlas más de una vez sin problema.

### 2.3. Verificar que aplicó correctamente

```bash
mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud -e "
SELECT table_name, table_rows
  FROM information_schema.tables
 WHERE table_schema = 'tusalud'
   AND table_name IN ('serie_numeracion','idempotency_keys','audit_log','editor_actividad');

SELECT INDEX_NAME
  FROM information_schema.statistics
 WHERE TABLE_SCHEMA='tusalud'
   AND TABLE_NAME='whatsapp_aprobaciones'
   AND INDEX_NAME='uq_wa_cotizacion_abierta';

SELECT INDEX_NAME
  FROM information_schema.statistics
 WHERE TABLE_SCHEMA='tusalud'
   AND TABLE_NAME='factura_cotizacion'
   AND INDEX_NAME='uq_factura_cotizacion_cotizacion';
"
```

Esperado: las 4 tablas existen y los dos índices `uq_*` aparecen.

### 2.4. Desplegar el backend (EC2)

Una vez aplicadas las migraciones, despliega el backend como siempre (`pm2 reload`, redeploy de la imagen, etc.). **Antes** de reiniciar:

- (Opcional) Setea estas variables de entorno en `.env`:

  ```bash
  # Pool MySQL — el default ya es 50/200, pero puedes subirlo si tu RDS aguanta
  DB_POOL_LIMIT=50
  DB_POOL_QUEUE_LIMIT=200
  DB_CONNECT_TIMEOUT_MS=10000

  # JWT
  JWT_EXPIRES_IN=30d

  # Asegúrate de NO tener esto en producción:
  # TRUST_ACTING_USER_HEADER=1     ← peligroso (permite spoofing del header X-Acting-User-Id)
  # DISABLE_JWT_AUTH=1             ← desactiva auth, solo dev
  ```

- Reinicia el servicio.

### 2.5. Limpieza periódica (opcional, recomendable después de unas semanas)

Las tablas `idempotency_keys` y `editor_actividad` crecen lento pero crecen. Cuando quieras (o vía cron / event scheduler):

```sql
DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL 7 DAY;
DELETE FROM editor_actividad WHERE heartbeat_at < NOW() - INTERVAL 6 HOUR;
```

---

## 3. ¿Y qué pasa con el manager / vendedor / cliente trabajando al mismo tiempo?

Esto fue revisado expresamente. La política implementada es **role-aware**:

### 3.1. Crear / editar cotización

- **Vendedor o manager o cliente** crea una cotización → `siguienteNumeroCotizacion(connection)` garantiza N° único atómico.
- Dos vendedores creando para el mismo pedido es válido (puede haber múltiples cotizaciones por pedido); el `cotizacion_principal_id` del pedido solo se setea cuando **una** de ellas pasa a `APROBADA` (y la primera en aprobarse gana via `COALESCE`).
- Si una cotización está en estado **`APROBADA`, `APROBADA_POR_MANAGER`, `RECHAZADA` o `CANCELADA`**, **ningún rol** (ni vendedor ni manager) puede modificar sus ítems desde `PUT /api/cotizaciones/:id`. Devuelve `403`. Si se necesita cambiar algo, debe usarse una **cotización complementaria**.
- Versionado optimista: si el frontend envía `expected_updated_at`, el backend rechaza con `409 COTIZACION_DESACTUALIZADA` si alguien más editó la cotización entre que el usuario la abrió y guardó.

### 3.2. Manager revisa una cotización

- Flujo: vendedor → `ENVIADA_AL_MANAGER` → manager edita (si hace falta) y mueve a `APROBADA_POR_MANAGER` → vendedor envía al cliente (`ENVIADA_AL_CLIENTE`) → cliente aprueba (`APROBADA`).
- Mientras está en `ENVIADA_AL_MANAGER`, el vendedor todavía puede modificar items, **pero**: si el manager justo en paralelo aprueba (`APROBADA_POR_MANAGER`), el versionado optimista del vendedor falla en su siguiente guardado y la edición queda bloqueada (lo que es correcto: ya pasó por revisión).
- El `SELECT … FOR UPDATE` que añadí al `updateEstadoCotizacion` serializa los cambios de estado: si manager y vendedor pulsan "guardar" en la misma milésima, uno gana y el otro recibe `409`.

### 3.3. Manager / vendedor cambia precios mientras vendedor cotiza

- `examen_precio` y `emo_perfil_precio` se editan con `INSERT … ON DUPLICATE KEY UPDATE`, ya **atómico**.
- Las cotizaciones congelan el precio en `cotizacion_items.precio_final` y `pedido_items.precio_base` al momento de crearse o aprobarse: cambios posteriores de tarifa **no** afectan cotizaciones ya creadas (snapshot por línea).
- Auditoría: cada `setPrecioExamen` y `setPrecioPerfil` debería registrar en `audit_log` (TODO suave para próxima ronda — fácil agregarlo si ves valor).

### 3.4. Dos managers facturando el mismo pedido

- Cubierto en tanda 1: `createFactura` toma `SELECT … FOR UPDATE` del pedido + de las cotizaciones aprobadas. El segundo manager queda esperando, y al liberarse encuentra `factura_id IS NOT NULL` o `cotizaciones` ya marcadas y recibe 4xx.
- `UNIQUE(cotizacion_id)` en `factura_cotizacion` es la red de seguridad si por alguna razón se evade el lock.

### 3.5. Soft-lock visible en la UI

- Cuando un usuario abre el detalle de un pedido / cotización / factura, el frontend hace `POST /api/presencia/heartbeat` cada ~30 s con `{ recurso_tipo, recurso_id, accion: 'EDITAR' }`.
- Otros que abran el mismo recurso ven, vía `GET /api/presencia/:tipo/:id`, qué usuarios están activos en ese momento (`Juan – manager – editando desde hace 1 min`).
- Es **cooperativo** (no bloquea físicamente): la integridad real sigue garantizada por los CAS / transacciones. Pero evita que dos vendedores se pisen sin darse cuenta.

---

## 4. ¿Cómo organizo a las personas / perfiles?

Tienes ahora `GET /api/auditoria` y `GET /api/auditoria/resumen` (solo manager). Ejemplos:

```bash
# Top 10 usuarios más activos en la última semana
GET /api/auditoria/resumen?desde=2026-05-01&top=10

# Todas las aprobaciones de cotización del manager Juan en mayo
GET /api/auditoria?usuario_id=42&accion=COTIZACION_APROBADA&desde=2026-05-01&hasta=2026-05-31

# Quién tocó el pedido 1234 (en cualquier momento)
GET /api/auditoria?recurso_tipo=PEDIDO&recurso_id=1234

# Mi actividad personal (cualquier rol, ve solo lo suyo)
GET /api/auditoria/mio?limit=200
```

Cada entrada incluye `usuario_id`, `usuario_nombre`, `usuario_rol`, `accion`, `recurso_tipo`, `recurso_id`, `descripcion`, `detalle_json`, `ip`, `request_id`.

**Acciones registradas hoy:**

- `CREAR_PEDIDO`, `PEDIDO_ITEM_AGREGADO`, `PEDIDO_ESTADO_ACTUALIZADO`
- `CREAR_COTIZACION`, `CREAR_COTIZACION_COMPLEMENTARIA`, `COTIZACION_EDITADA`, `COTIZACION_APROBADA`, `COTIZACION_APROBADA_POR_MANAGER`, `COTIZACION_ENVIADA`, `COTIZACION_ENVIADA_AL_CLIENTE`, `COTIZACION_RECHAZADA`, ...
- `EMITIR_FACTURA`
- `EXAMEN_ESTADO_ACTUALIZADO`

Agregar nuevas es trivial: `await registrarAuditoria(req, { accion, recurso_tipo, recurso_id, descripcion, detalle })`.

---

## 5. Cambios opcionales en frontend

El backend está completamente retrocompatible. Recomendaciones para aprovechar lo nuevo:

1. **Idempotency-Key**: el frontend genera un `uuid` por intento de POST y lo manda en `Idempotency-Key`. Recomendado para los botones "Crear pedido", "Generar cotización", "Emitir factura". Evita duplicados por doble click o reintentos de red.

2. **`expected_updated_at` al editar cotización**: cuando el usuario abre el detalle, guardar el `updated_at` que devuelve el GET. Al hacer `PUT /api/cotizaciones/:id`, enviarlo en el body. Si recibe `409 COTIZACION_DESACTUALIZADA`, mostrar "alguien editó esta cotización, refresca".

3. **Soft-lock visible**: al entrar a un detalle, llamar `POST /api/presencia/heartbeat` cada 30 s; al salir, `DELETE /api/presencia/:tipo/:id`. Mostrar un banner si `GET /api/presencia/:tipo/:id` devuelve `total_otros > 0`.

4. **Códigos 409 humanos**: actualmente devolvemos `409` con `codigo` y `error` legibles:
   - `IDEMPOTENCY_IN_PROGRESS` / `IDEMPOTENCY_KEY_REUSED`
   - `COTIZACION_DESACTUALIZADA`
   - "La cotización cambió de estado mientras se procesaba la solicitud."
   - "El pedido está en estado terminal X y no puede modificarse."

   La UI puede mapear estos a mensajes amigables ("Esta cotización ya fue aprobada por otra persona, recarga").

5. **Página de actividad** (manager): consume `GET /api/auditoria/resumen` para mostrar top usuarios, top acciones, eventos recientes. Es la "manera organizada por personas / perfiles" que pediste.

---

## 6. Tests sugeridos

- Lanzar dos `POST /api/pedidos` con el mismo `Idempotency-Key` → segundo devuelve la misma respuesta con `Idempotency-Replay: true` y NO crea un pedido nuevo.
- Lanzar dos `crearPedido` con payload distinto en paralelo → ambos obtienen N° distintos y consecutivos.
- Aprobar la misma cotización por dos canales casi simultáneos (HTTP+HTTP o HTTP+WA) → solo uno commitea (el otro 409 / `transicionado: false`).
- Emitir factura del mismo pedido desde dos sesiones de manager → solo una factura creada, la otra 4xx.
- Setear precio del mismo examen desde dos sesiones con `sede_id=NULL` → una sola fila en `examen_precio` con el último valor.
- Editar items de una cotización en `BORRADOR` desde dos sesiones distintas. Si la primera envía con `expected_updated_at`, la segunda debe recibir 409.
- Disparar dos webhooks de WhatsApp casi simultáneos para la misma cotización → solo una `whatsapp_aprobaciones` PENDIENTE; la segunda devuelve `skipped`.

---

## 7. Riesgos pendientes (fuera del alcance de este commit)

- **`actualizarEstadoMasivoPaciente`**: itera y hace N transacciones independientes. Si dos managers marcan AUSENTE al mismo paciente a la vez, puede haber order interleaving. Probabilidad muy baja; lo dejamos como TODO.
- **`cargarEmpleados`**: usa transacciones pero hace un `DELETE` + `INSERT` masivo. Si dos vendedores actualizan empleados del mismo pedido a la vez, se pisan. Bajo riesgo (el flujo real es secuencial).
- **`audit_log` para `setPrecioExamen` / `setPrecioPerfil`**: 2 líneas de código, no incluido porque la UI ya muestra histórico de precios. Si quieres trazabilidad explícita, añadimos.
- **Auditoría sobre logins / logouts / cambios de rol**: no implementado todavía.
- **`TRUST_ACTING_USER_HEADER` / `DISABLE_JWT_AUTH`** — confirmar que están DESACTIVADOS en producción (revisión manual de `.env`).
