# S3 — Respaldo de archivos subidos

Este documento explica cómo dejar el respaldo a S3 funcionando en producción.
Hay **dos formas** de autenticar la EC2 contra S3; usa la que prefieras.

## ¿Qué se respalda?

Cada vez que un usuario sube un archivo a uno de estos endpoints:

- `POST /api/import/pdf-texto-embebido`
- `POST /api/import/pdf-perfil-tablas`

el backend:

1. Inserta una fila en `archivos_subidos` con SHA-256, tamaño, mime, usuario, etc.
2. Sube el archivo original a S3 con encriptación `AES256` y key:
   `uploads/<año>/<mes>/<día>/<fuente>/<nombre>_<random6>.<ext>`
3. Actualiza la fila con el `s3_key`, `s3_etag` y `s3_version_id`.

Si S3 no está configurado o falla, el endpoint **sigue funcionando** y la fila
queda con `estado='ERROR_S3'` para que veas qué archivo no llegó al bucket.

---

## Paso 1 — Crear el bucket S3

1. Entra a la **AWS Console** → S3 → "Create bucket".
2. **Region**: misma región que la EC2 y la RDS (recomendado `us-east-1` —
   coincide con tu RDS actual).
3. **Bucket name**: algo único globalmente, p. ej. `tusalud-uploads-prod`.
4. **Object Ownership**: "ACLs disabled (recommended)".
5. **Block Public Access**: deja **TODO bloqueado** (es un bucket privado).
6. **Versioning**: actívalo (te permite recuperar archivos sobreescritos).
7. **Encryption**: "Server-side encryption with Amazon S3 managed keys (SSE-S3)".
8. Crea el bucket.

(Opcional) En el bucket → **Lifecycle rules** puedes mover archivos a Glacier
Deep Archive después de N días para abaratar costos.

---

## Paso 2 — Dar acceso a la EC2

### Opción A (recomendada): IAM Role attached a la EC2 (sin keys)

Es la más segura: no tienes que rotar ni guardar credenciales en `.env`.

1. AWS Console → IAM → Roles → "Create role".
2. **Trusted entity type**: AWS service → EC2.
3. Sin políticas todavía (las añadimos en el paso 3). Termina la creación.
4. Llámalo `tusalud-backend-ec2`.
5. Attach a la EC2: EC2 Console → tu instancia → Actions → Security →
   "Modify IAM role" → selecciona `tusalud-backend-ec2`.
6. En el `.env` del backend deja `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`
   **vacíos**. El SDK usa el role automáticamente.

### Opción B: IAM User con access keys

Más simple si la EC2 ya está corriendo y no quieres tocarla.

1. IAM → Users → "Create user".
2. Nombre: `tusalud-backend-s3`.
3. **No** marques "Provide user access to the AWS Management Console"
   (es un usuario programático).
4. Termina la creación; entra al usuario → "Security credentials" →
   "Create access key" → tipo "Application running outside AWS".
5. Copia `Access key ID` y `Secret access key`.
6. Pégalos en `.env`:

   ```env
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

---

## Paso 3 — Política mínima de IAM

Adjuntala al **role** (Opción A) o al **user** (Opción B). Reemplaza
`tusalud-uploads-prod` por tu bucket.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TuSaludUploadsRW",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::tusalud-uploads-prod",
        "arn:aws:s3:::tusalud-uploads-prod/*"
      ]
    }
  ]
}
```

**No incluye `s3:DeleteObject`** a propósito: el sistema nunca borra archivos
respaldados (auditoría histórica). Si alguna vez necesitas purgar, hazlo
manualmente desde la consola con tu usuario admin.

---

## Paso 4 — Variables de entorno

En el `.env` del backend (EC2):

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=tusalud-uploads-prod
AWS_S3_KEY_PREFIX=uploads/
# Opción A (IAM role): dejar vacíos
# Opción B (IAM user): rellenar
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Reinicia Node:

```bash
pm2 restart TuSalud-Backend
```

---

## Paso 5 — Aplicar la migración a la BD

```bash
mysql -h tusaluddb...rds.amazonaws.com -u admin -p tusalud \
  < scripts/migration_archivos_subidos_s3.sql
```

Confirma:

```sql
SELECT COUNT(*) FROM archivos_subidos;
```

---

## Paso 6 — Verificar end-to-end

1. Sube un PDF desde el frontend (importar protocolo).
2. En la BD:

   ```sql
   SELECT id, fuente, nombre_original, sha256_hex, s3_key, estado, error_mensaje
     FROM archivos_subidos
     ORDER BY id DESC
     LIMIT 5;
   ```

   Debes ver `estado='SUBIDO'` y un `s3_key` no nulo.

3. En la AWS Console → S3 → tu bucket → navega al `s3_key`. El archivo
   debería estar ahí con tamaño coherente.

4. Si `estado='ERROR_S3'`, revisa `error_mensaje` (la causa más común es la
   policy IAM mal aplicada o el region incorrecto).

---

## Costos esperados

S3 estándar en `us-east-1`:

- Almacenamiento: ~`$0.023 / GB / mes`.
- PUT (subida): ~`$0.005 / 1000` requests.
- GET (descarga firmada): ~`$0.0004 / 1000` requests.

Con ~1000 archivos al mes de ~2MB cada uno = ~2GB → menos de **$0.10/mes**.

---

## Borrar accidentalmente algo

Como activamos versioning, las "deletes" son borrados lógicos. Para recuperar:
S3 Console → Bucket → "Show versions" → restaurar la versión deseada.
