# Catálogo de exámenes — Migración v2

Carga el catálogo "oficial" desde:

- `examen (1).csv` — 1494 exámenes legacy con sus IDs (`identificador`), agrupados en 14 categorías padre.
- `Tarifario Base S.O. TU SALUD SAC.xlsx` — 177 exámenes con **dos precios** (1–15 pacientes / 16+ pacientes) en 7 categorías comerciales.

## Qué hace

1. **Amplía** `examen_precio` con `precio_hasta_15` y `precio_desde_16`.  
   La columna `precio` legacy se conserva y queda igual al `precio_desde_16` (precio mayorista, el más bajo) para no romper código existente.
2. Crea/actualiza **16 categorías canónicas** = unión consolidada del CSV + Excel.  
   Las categorías equivalentes (`LABORATORIO` ≡ `Exámenes de laboratorio`, etc.) se unifican; las únicas (`Exámenes complementarios`, `Vacunas`) se agregan.
3. **Reset suave**: marca `activo = 0` todos los exámenes actuales, y vuelve a activar los que estén en CSV/Excel. **No borra** nada → cotizaciones y facturas históricas siguen funcionando, sólo los exámenes huérfanos quedan ocultos.
4. **Upsert por `identificador`** para los exámenes del CSV: si el ID legacy ya existe en tu BD, se actualiza el nombre/categoría; si no, se inserta. Conserva el `id` interno usado por cotizaciones viejas.
5. **Excel sobreescribe precios** donde haga match por nombre (130 de 177). Los 47 nuevos del Excel se insertan con `identificador = NULL` (códigos comerciales sin equivalente en el legacy).

## Cómo ejecutarlo

```bash
# 1) Backup recomendado
mysqldump tu_salud_db examenes examen_precio emo_categorias > backup_examenes_$(date +%Y%m%d).sql

# 2) Schema (ALTER TABLE)
mysql tu_salud_db < TuSalud-Backend/scripts/migration_examenes_catalogo_v2_schema.sql

# 3) Datos (~13700 líneas SQL, ~5 MB; tarda 1-3 minutos)
mysql tu_salud_db < TuSalud-Backend/scripts/migration_examenes_catalogo_v2_data.sql

# 4) Verificación rápida
mysql tu_salud_db -e "SELECT
  (SELECT COUNT(*) FROM examenes WHERE activo=1) AS activos,
  (SELECT COUNT(*) FROM examenes) AS totales,
  (SELECT COUNT(*) FROM examen_precio WHERE sede_id IS NULL) AS precios_base,
  (SELECT COUNT(*) FROM emo_categorias) AS categorias;"
```

Salida esperada (aprox):

| activos | totales | precios_base | categorias |
|---:|---:|---:|---:|
| 1541 | ≥ totales previos | ~636 | 16 |

## Re-generar el SQL de datos

Si los archivos cambian, vuelve a generar con:

```bash
node TuSalud-Backend/scripts/build_examenes_catalogo_v2.js \
  --csv  "C:/Users/rgome/Downloads/examen (1).csv" \
  --xlsx "C:/Users/rgome/Downloads/Tarifario Base  S.O. TU SALUD SAC (2).xlsx" \
  --out  TuSalud-Backend/scripts/migration_examenes_catalogo_v2_data.sql
```

El script:

- Lee el CSV como **latin1** (los acentos vienen como bytes únicos cp1252; leerlo como UTF-8 corrompe nombres y duplica categorías).
- Usa un mapa de alias para consolidar categorías equivalentes; si aparece una nueva categoría que no esté en el mapa, la crea automáticamente con un `id_cola` sintético.
- Match por nombre normalizado (sin acentos / sin mayúsculas / sin puntuación).

## Rollback

```bash
mysql tu_salud_db < TuSalud-Backend/scripts/migration_examenes_catalogo_v2_rollback.sql
# Para volver al estado anterior de los datos, restaurar desde el backup del paso 1.
mysql tu_salud_db < backup_examenes_YYYYMMDD.sql
```

## Lógica de precios por volumen (siguiente paso)

Hoy el código sólo lee `examen_precio.precio` (precio único). Con esta migración hay dos tramos:

- **`precio_hasta_15`** — pedidos de 1 a 15 pacientes (retail).
- **`precio_desde_16`** — pedidos de 16+ pacientes (mayorista, ≤ retail).

Para que la app los use, hay que actualizar el `precio_base` que devuelve la API en función del número de pacientes del pedido (campo `pedido.numero_empleados` o equivalente). Eso lo dejamos como cambio aparte para revisarlo con cuidado.
