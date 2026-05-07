# Despliegue de los 3 cambios (mayo 2026)

Esta tanda de cambios resuelve tres problemas reportados:

1. **Catálogo EMO vacío en producción**: la BD no tenía exámenes asignados.
2. **Sin snapshot histórico**: si el perfil de Raúl cambia 5 años después,
   los registros antiguos parecían incluir los nuevos exámenes.
3. **Sin respaldo de archivos subidos**: si el cliente miente sobre lo que
   subió, no había forma de auditar.

Cada problema corresponde a archivos independientes; puedes desplegarlos por
separado, pero el orden recomendado es 1 → 2 → 3.

---

## Resumen de archivos nuevos / modificados

```
TuSalud-Backend/
  scripts/
    importar_perfiles_legacy.js          (mod) ahora idempotente
    diagnostico_catalogo.js              (NEW) imprime conteos del catálogo
    migration_snapshot_examenes_historico.sql  (NEW) snapshot JSON
    migration_archivos_subidos_s3.sql    (NEW) tabla auditoría
    tusalud_schema_mysql.sql             (mod) incluye columnas y tabla nuevas
    README_S3.md                         (NEW) guía AWS Console
  utils/
    perfilSnapshot.js                    (NEW) construye el JSON snapshot
    s3.js                                (NEW) cliente AWS S3
  middleware/
    auditarUpload.js                     (NEW) registro + upload a S3
  controllers/
    cotizacionesController.js            (mod) escribe snapshot en items PERFIL
    pedidosController.js                 (mod) escribe snapshot en pacientes
  routes/
    pdfTextoEmbebidoRoutes.js            (mod) usa el middleware de auditoría
  .env.example                           (NEW) plantilla con vars S3
  package.json                           (mod) agrega @aws-sdk/client-s3
```

---

## Problema 1 — Llenar el catálogo de exámenes

El script `importar_perfiles_legacy.js` ya existía. Ahora es **idempotente**:
re-correrlo no crea duplicados. Lee `cotizacion.csv` (o `cotizacion (2).csv`)
desde `~/Downloads` por defecto, o desde `--csv <ruta>`.

### Pasos en la EC2

```bash
# 1. Subir el CSV a la EC2 (desde tu máquina local):
scp -i tu-llave.pem "C:/Users/LENOVO/Downloads/cotizacion (2).csv" \
    ec2-user@tu-ec2:/home/ec2-user/cotizacion.csv

# 2. En la EC2:
cd ~/TuSalud-Backend
git pull
npm install              # por si hubo deps nuevas (S3 SDK)

# 3. Diagnóstico ANTES (cuántos exámenes / perfiles existen):
node scripts/diagnostico_catalogo.js

# 4. Dry-run para ver qué se importaría sin escribir nada:
node scripts/importar_perfiles_legacy.js \
  --csv /home/ec2-user/cotizacion.csv \
  --dry-run

# 5. Si el dry-run se ve bien, import real:
node scripts/importar_perfiles_legacy.js \
  --csv /home/ec2-user/cotizacion.csv

# 6. Diagnóstico DESPUÉS:
node scripts/diagnostico_catalogo.js
```

Resultado esperado: ver cientos/miles de filas en `examenes`, `emo_categorias`,
`emo_perfiles`, `emo_perfil_examenes`.

> Si la importación parcial ya se había hecho antes, el script reusa lo
> existente y sólo agrega lo que falte. Las estadísticas finales muestran
> "creados nuevos" vs "ya existentes".

---

## Problema 2 — Snapshot histórico de exámenes

Dos columnas JSON nuevas:

- `cotizacion_items.examenes_snapshot_json` (sólo cuando `tipo_item='PERFIL'`):
  congela la definición exacta del perfil al momento de la cotización
  (categorías, exámenes, códigos legacy, reglas).
- `pedido_pacientes.examenes_snapshot_json`: lista plana de exámenes que
  efectivamente se le asignaron a esa persona.

Ambas son **opcionales** (`DEFAULT NULL`): los registros antiguos siguen
funcionando; los nuevos llevan snapshot automático.

### Pasos en la EC2

```bash
# 1. Aplicar la migración (lee credenciales de .env):
cd ~/TuSalud-Backend
mysql -h $(grep ^DB_HOST .env | cut -d= -f2) \
      -u $(grep ^DB_USER .env | cut -d= -f2) \
      -p $(grep ^DB_NAME .env | cut -d= -f2) \
      < scripts/migration_snapshot_examenes_historico.sql

# 2. Reiniciar Node:
pm2 restart TuSalud-Backend

# 3. Verificar tras crear una cotización con perfil:
mysql ... <<'SQL'
SELECT id, tipo_item, perfil_id, tipo_emo,
       JSON_EXTRACT(examenes_snapshot_json, '$.total_examenes') AS n_ex,
       JSON_EXTRACT(examenes_snapshot_json, '$.snapshot_at')   AS snap_at
  FROM cotizacion_items
  ORDER BY id DESC
  LIMIT 5;
SQL
```

Las cotizaciones futuras congelarán el snapshot. Las cotizaciones existentes
quedan con `examenes_snapshot_json IS NULL` (no las re-procesamos
retroactivamente — sería arriesgado porque el catálogo pudo cambiar entre
medias).

### ¿Cómo recuperar los exámenes "exactos" de un paciente histórico?

```sql
SELECT JSON_EXTRACT(examenes_snapshot_json, '$.examenes')
  FROM pedido_pacientes
 WHERE id = ?;
```

Devuelve un array con `{examen_id, codigo_legacy, nombre, categoria_nombre}`
tal como estaba al momento de la asignación, **independiente** de si después
borraron exámenes del catálogo.

---

## Problema 3 — Respaldo a S3

Sigue las instrucciones detalladas en
[`scripts/README_S3.md`](./README_S3.md). Resumen:

1. Crear bucket S3 (privado, versionado, SSE-S3) en `us-east-1`.
2. Crear IAM Role attached a la EC2 (recomendado) **o** IAM User con keys.
3. Adjuntar la política mínima (sólo `PutObject`, `GetObject`, `ListBucket`).
4. Aplicar migración:

   ```bash
   mysql ... < scripts/migration_archivos_subidos_s3.sql
   ```

5. Llenar `.env` con `AWS_REGION`, `AWS_S3_BUCKET`, etc.
6. `pm2 restart TuSalud-Backend`.
7. Subir un PDF desde el frontend y verificar:

   ```sql
   SELECT id, fuente, estado, s3_key, error_mensaje
     FROM archivos_subidos
     ORDER BY id DESC LIMIT 5;
   ```

Si S3 no está configurado, los endpoints **siguen funcionando** (no hay
regresión); las filas en `archivos_subidos` quedan con `estado='ERROR_S3'`
hasta que actives el bucket.

---

## Rollback (si algo se rompe)

Cada cambio se puede revertir aisladamente:

- **Problema 1**: nada que revertir; los datos se quedan. Si quieres limpiar:
  `scripts/reset_datos.sql` (borra pedidos/cotizaciones, conserva catálogo).
- **Problema 2**:
  ```sql
  ALTER TABLE cotizacion_items   DROP COLUMN examenes_snapshot_json;
  ALTER TABLE pedido_pacientes   DROP COLUMN examenes_snapshot_json;
  ```
  Revertir el commit de los controllers también.
- **Problema 3**:
  ```sql
  DROP TABLE archivos_subidos;
  ```
  Quitar el middleware de las rutas y el `npm uninstall @aws-sdk/client-s3`
  son opcionales (sin la env vars S3 sigue desactivado solito).
