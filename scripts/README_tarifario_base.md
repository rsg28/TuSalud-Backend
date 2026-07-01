# Tarifario Base — Reset y carga del catálogo de exámenes

Flujo de "borrón y cuenta nueva" para el catálogo de exámenes/precios, alineado al Excel:

```
docs/Tarifario Base  S.O. TU SALUD SAC (3).xlsx
```

## Archivos involucrados

| Archivo | Propósito |
|---|---|
| `docs/Tarifario Base  S.O. TU SALUD SAC (3).xlsx` | Tarifario fuente (versionado en el repo). |
| `scripts/reset_catalogo_examenes.sql` | **Borra** el catálogo (categorías, exámenes, precios, perfiles) **y toda la data transaccional dependiente** (pedidos, cotizaciones, facturas, pacientes, solicitudes, historial). |
| `scripts/importarTarifarioBase.js` | **Carga** categorías + exámenes + precios base desde el `.xlsx`. |

## Por qué el reset borra también los pedidos / cotizaciones / facturas

Las tablas `pedido_items`, `cotizacion_items`, `factura_detalle` y `solicitud_agregar_examenes` tienen FK **`ON DELETE RESTRICT`** hacia `examenes` / `emo_perfiles`. Si esas tablas no se vacían primero, cualquier intento de borrar el catálogo falla con:

```
Cannot delete or update a parent row: a foreign key constraint fails
```

Por eso el script hace un reset total (catálogo + data operativa). Se conservan usuarios, empresas, sedes, grupos empresariales, la tabla lookup `emo_tipos_evaluacion` y todo lo no relacionado al catálogo.

## Formato del Excel

Hoja: `Precios`. Cabecera en la fila 3:

| Col A | Col B | Col C | Col D |
|---|---|---|---|
| Tipo (categoría) | Examen (nombre) | 01 a 15 pacientes mensual | 15 a más pacientes mensual |

- Los precios se guardan en `examen_precio` con `sede_id = NULL` (precio base global aplicable a cualquier sede).
- El campo `precio` de la tabla espeja `precio_desde_16` por compatibilidad legacy (ver comentario en `tusalud_schema_mysql.sql`).
- El `id_cola` de cada categoría se autogenera como `TAR_<SLUG_MAYUS>` (p. ej. `TAR_EXAMENES_DE_LABORATORIO`). Se detectan colisiones contra la BD y se resuelven con sufijo numérico.
- Los exámenes se insertan con `identificador = NULL` (el `identificador` legacy es único pero opcional y se reserva para los perfiles importados desde el JSON antiguo).

## Uso

### 1) Borrar todo lo actual

Desde `~/app/TuSalud-Backend` en el servidor:

```bash
mysql -h tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com -P 3306 -u admin -p tusalud \
  < scripts/reset_catalogo_examenes.sql
```

Al final imprime un `SELECT` con el conteo por tabla (todo debe quedar en 0).

### 2) Cargar el tarifario

Dry-run (no toca la DB, valida el parseo). Por defecto lee `docs/Tarifario Base  S.O. TU SALUD SAC (3).xlsx`:

```bash
cd ~/app/TuSalud-Backend
node scripts/importarTarifarioBase.js
```

Aplicar de verdad:

```bash
node scripts/importarTarifarioBase.js --apply
```

Ruta explícita (si hace falta):

```bash
node scripts/importarTarifarioBase.js \
  --xlsx "docs/Tarifario Base  S.O. TU SALUD SAC (3).xlsx" \
  --apply
```

Otras banderas útiles:

| Flag | Descripción |
|---|---|
| `--sheet "Precios"` | Nombre de la hoja (por defecto: la primera). |
| `--header-row 3` | Fila 1-based de la cabecera (por defecto: autodetectada buscando "Tipo" + "Examen"). |
| `--limit 20` | Solo procesa las primeras 20 filas de datos (útil para pruebas). |

Todo se hace dentro de una transacción; si algo falla, se hace ROLLBACK y no queda data parcial.

## Qué se espera cargar (referencia del archivo actual)

- **7 categorías**: Examen clínico ocupacional, Evaluación oftalmológica, Exámenes complementarios, Exámenes cardiológicos, Exámenes de laboratorio, Vacunas, Evaluación psicológica.
- **177 exámenes** con sus dos tramos de precio (1-15 y 16+).
- Nota: el Excel contiene algunas filas con nombres repetidos (p. ej. "Cromo en orina" con precios distintos). El script las inserta tal cual, porque `examenes.nombre` no tiene UNIQUE constraint y esos duplicados representan variantes reales del análisis.

## Después del import

Los perfiles EMO (`emo_perfiles`, `emo_perfil_examenes`, `emo_perfil_precio`, asignaciones) se quedan **vacíos**. Se crean después vinculando los exámenes recién cargados, ya sea manualmente desde el panel o con el importador legacy (`scripts/importar_perfiles_legacy.js`) si se dispone del CSV correspondiente.
