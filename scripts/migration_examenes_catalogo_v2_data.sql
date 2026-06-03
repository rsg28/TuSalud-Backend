-- =============================================================================
-- Catálogo de exámenes v2 — datos (generado por build_examenes_catalogo_v2.js)
-- =============================================================================
-- Fuente CSV : examen (1).csv
-- Fuente XLSX: Tarifario Base  S.O. TU SALUD SAC (2).xlsx
-- Fecha gen. : 2026-06-02T20:02:59.914Z
-- Exámenes del CSV   : 1494
-- Exámenes del Excel : 177  (match 1:1 con CSV: 130; nuevos: 47)
-- Categorías canónicas: 16
--
-- IMPORTANTE: corre primero migration_examenes_catalogo_v2_schema.sql.
-- Este script es idempotente; aplica reset suave + upsert.
-- =============================================================================

START TRANSACTION;
SET @vigente := CURDATE();

-- --- 1) Reset suave: marcamos todos los exámenes actuales como inactivos.
--     Las cotizaciones/facturas históricas siguen vivas (no se borra nada).
UPDATE `examenes` SET `activo` = 0;

-- --- 2) Categorías (upsert por id_cola).
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EVALUACIÓN MÉDICA OCUPACIONAL', 'EVMEDOCU9')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('TRIAJE', 'T1')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('LABORATORIO', 'EVLAB4')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('OFTALMOLOGÍA', 'EVOFT7')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EVALUACIÓN PSICOLÓGICA', 'EVPSICOCU12')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EVALUACIÓN AUDIOMÉTRICA', 'EVAUDIO8')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('ESPIROMETRIA', 'EVESPIOCU10')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('RAYOS X', 'EVRX5')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EVALUACIÓN ODONTOLÓGICA', 'EVODO2')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EVALUACIÓN CARDIOVASCULAR', 'EVELE3')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EXAMEN PSICOSENSOMETRICO', 'PSICOSENS')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('PRUEBA DE EMBARAZO', 'EMBARAZO')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EXAMENES TU SALUD', 'TUSALUD')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('VISIOMETRO', 'VISIOMETRO')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('EXÁMENES COMPLEMENTARIOS', 'EXCOMP')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES ('VACUNAS', 'VACUNAS')
  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- --- 3) Exámenes con identificador legacy (CSV): upsert por `identificador`.
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (417, 'TRIAJE', (SELECT id FROM emo_categorias WHERE nombre = 'TRIAJE' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (419, 'EXAMEN CLÍNICO RM 312 - 2011', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (420, 'ANTECEDENTES PERSONALES Y OCUPACIONALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (421, 'HISTORIA OCUPACIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (422, 'EVALUACIÓN MÚSCULO ESQUELÉTICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (424, 'GRUPO SANGUÍNEO Y FACTOR RH ', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (425, 'HEMOGRAMA COMPLETO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (426, 'GLUCOSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (427, 'CREATININA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (428, 'PERFIL LIPÍDICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (429, 'EXAMEN COMPLETO DE ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (431, 'AGUDEZA VISUAL', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (432, 'REFRACCIÓN + OJO SECO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (433, 'EXAMEN EXTERNO E INTERNO DEL OJO CON LAMPARA HENDIDURA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (435, 'EXAMEN PSICOLÓGICO RM 312-2011', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (436, 'TEST DE PERSONALIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (437, 'TEST PSICOSOCIAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (438, 'TEST DE MACHOVER', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (440, 'AUDIOMETRIA AÉREA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (445, 'ESPIROMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (446, 'RAYOS X TÓRAX P.A.', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (447, 'ODONTOGRAMA COMPLETO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN ODONTOLÓGICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (448, 'ELECTROCARDIOGRAMA EN REPOSO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (449, 'PSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (450, 'CEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (451, 'CA 125', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (452, 'CA 15.3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (453, 'ALFA - FETOPROTEINA - (AFP)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (454, 'HCG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (455, 'NSE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (456, 'SCC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (457, 'TEST DE PROFUNDIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (458, 'EXAMEN PSICOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (459, 'AREA AFECTIVA Y COGNITIVA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (460, 'ENTREVISTA PSICOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (461, 'INFORME PSICOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (463, 'EVALUACIONES ESPECIALES PARA CONDUCTORES V. MENORES', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (464, 'AUDIOMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (465, 'TEST DE SCREENING DERMATOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (466, 'EVALUACION MUSCULO ESQUELETICA ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (467, 'TEST DE ISHIHARA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (468, 'TEST DE REACTIVIDAD AL ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (469, 'TEST DE ANSIEDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (470, 'CAOHC', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (471, 'COLESTEROL TOTAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (472, 'PERFIL HEPATICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (473, 'FACTOR REUMATOIDEO (CONV. COLECTIVO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (474, 'VELOCIDAD DE SEDIMENTACION GLOBULAR (VSG)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (475, 'PCR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (476, 'AGLUTINACIONES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (477, 'BK EN ESPUTO x1', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (478, 'PARASITOLOGICO x1', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (479, 'DESCARTE DE VARICES / ARTRITIS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (480, 'ENTREVISTA E INFORME PSICOLABORAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (481, 'PERFIL LIPÍDICO COMPLETO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (482, 'HEPATITIS A. IgM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (483, 'EXAMEN DE HONGOS - RASPADO DE UÑAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (484, 'TEST ISTAS 21', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (485, 'TEST DE MOOBING', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (486, 'TEST DE MASLACH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (487, 'PRUEBA PSICOSENSOMETRICA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (488, 'EXAMEN CLINICO GENERAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (489, 'ANTROPOMETRIA / INMUNIZACIONES / HABITOS NOCIVOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (490, 'EVALUACION MUSCULOESQUELETICA - ESPALDA - EXTREMIDADES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (491, 'AGUDEZA VISUAL / VISION LEJOS Y CERCA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (492, 'COLESTEROL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (493, 'TEST DE FATIGA Y SOMNOLENCIA (EPWORTH)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (494, 'RADIOGRAFIA DE TORAX (OIT - 2000)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (495, 'PSICOSENSOMETRICO (CONDUCTORES)', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (496, 'EXAMEN CLINICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (497, 'ANEXO 16 A - ALTURA GEOGRÁFICA > 2500 MSNM', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (498, 'HEMOGLOBINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (499, 'HEMATOCRITO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (500, 'GLUCOSA BASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (501, 'HEMOGLOBINA GLICOSILADA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (502, 'EXAMEN OSTEOMUSCULAR COMPLETO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (503, 'EXAMEN OFTALMOLOGICO BASICO VISION LEJOS Y CERCA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (504, 'EXAMEN DE ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (505, 'PANEL DE DROGAS (COCAINA Y MARIHUANA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (506, 'RAYOSX DE TORAX (OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (507, 'AUDIOMETRIA TONAL(AREA Y CAOHC)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (508, 'EXAMEN OFTALMOLOGICO COMPLETO VISION DE LEJOS Y CERCA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (509, 'TEST DE COLORES', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (510, 'VISIÓN DE PROFUNDIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (511, 'TEST DE EPWORTH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (512, 'EXAMEN PSICOSENSOMETRICO', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (513, 'INSULINA BASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (514, 'INSULINA POST PRANDIAL 2 HORAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (515, 'GLUCOSA POST PRANDIAL 120 MINUTOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (516, 'TRANSAMINASA OXALACETICA (TGO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (517, 'TRANSAMINASA PIRUVICA (TGP)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (518, 'GAMMA-GLUTAMIL TRANSPEPTIDASA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (519, 'FOSFATASA ALCALINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (520, 'TSH - HORMONA ESTIMULANTE DE LA TIROIDES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (521, 'TIROXINA LIBRE - T4 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (522, 'HEMOGRAMA COMPLETO AUTOMATIZADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (523, 'ODONTOGRAMA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (524, 'TRABAJOS ALTURA MAYOR A 1.8 mts.', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (525, 'EXAMEN PSICOLOGICO PARA CONDUCTOR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (526, 'BHCG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (527, 'PLOMO EN SANGRE / SOLDADORES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (528, 'PERFIL HEPÁTICO COMPLETO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (529, 'INFORME PSICOLABORAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (531, 'PRUEBA DE EMBARAZO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (532, 'AUDIOMETRIA (CAOHC)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (533, 'TEST DE CLAUSTROFOBIA (ESPACIOS CONFINADOS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (534, 'PROTEINA C REACTIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (535, 'Evaluación Psicológica', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (536, 'Evaluación Oftalmológica simple', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (537, 'Evaluación Odontológica simple', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN ODONTOLÓGICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (538, 'Radiografía de Tórax PA - Tipo 1', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (539, 'Plomo en sangre', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (540, 'Beta HCG (MUJERES)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (541, 'Evaluación Oftalmológica completa (AG VISUAL DE CERCA Y LEJOS + ISHIHARA + ESTEREOPSIS)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (542, 'Examen Toxicológico en Orina tipo 2 (Sólo Cocaína, Marihuana y Extasis)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (543, 'Radiografía de Tórax PA - Tipo 2 (OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (544, 'Electrocardiograma en reposo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (545, 'Cuestionario Nórdico de Síntomas Musculo esqueléticos', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (546, 'Cuestionario Quick Dash', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (547, 'Ficha Psicológica según RM 312-2011-MINSA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (548, 'Tamizaje de Salud Mental', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (549, 'TEST DE ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (550, 'Sindrome de Burnout', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (551, 'Prueba de Mobbing', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (552, 'Sólo Cocaína, Marihuana y Extasis', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (553, 'EKG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (554, 'Prueba B HCG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (555, 'Tamizaje Dermatológico', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (556, 'Declaración Jurada de Salud para Exposición Laboral a gran altitud', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (557, 'Cuestionario de Síntomas Respiratorios para Asma Ocupacional', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (558, 'ALTURA ESTRUCTURAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (559, 'TEST DE FACTORES PSICOSOCIALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (560, 'ENTREVISTA PERSONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (561, 'PROFUNDIDAD / FORIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (562, 'VISIÓN DE COLORES', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (563, 'TEST DE ESTEREOPSIS', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (564, 'DESCARTE DE CATARATAS', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (565, 'PATOLOGIAS EN OJO (PTERIGION, PINGUÉCULA)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (566, 'EXAMEN PSICOLÓGICO OCUPACIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (567, 'EXAMEN DE APTITUD PSICOLÓGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (568, 'RIESGOS PSICOSOCIALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (569, 'TRIGLICÉRIDOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (570, 'UREA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (571, 'CREATININA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (572, 'LECTURA OIT', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (573, 'RADIOGRAFIA SIMPLE DE TORAX P-A', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (574, 'TEST TOXICOLOGICO (COCAINA / MARIHUANA / EXTASIS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (575, 'EVALUACIONES PARA CONDUCTORES', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (576, 'PB EN PLOMO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (577, 'METAHEMOGLOBINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (578, 'RPR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (579, 'RAYOS X DE TORAX (LECTURA OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (580, 'ENFERMEDADES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (581, 'INTOXICACIONES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (582, 'CIRUGIAS Y OTROS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (583, 'OTOSCOPIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (584, 'VIA AEREA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (585, 'KLOCKHOFF', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (586, 'REFLEJOS PUPILARES', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (587, 'TEST PSICOLOGICOS EN LAS AREAS COGNITIVAS AFECTIVAS O EMOCIONALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (588, 'PLACA DE RAYOS X', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (589, 'TOXICOLOGICO DE COCAINA Y MARIHUANA EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (590, 'ELECTROCARDIOGRAMA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (591, 'ANTROPOMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (592, 'TEST DE CLAUSTROFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (593, 'SALUD BUCAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN ODONTOLÓGICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (594, 'CAMPO VISUAL (POR CONFRONTACION)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (595, 'TEST DE REFRACCION', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (596, 'ECTOSCOPIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (597, 'HABILIDAD COGNITIVA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (598, 'TEST MEMORIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (599, 'TEST BREVE DEL SINDROME DE BURNOUT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (600, 'COEFICIENTE INTELECTUAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (601, 'AREA EMOCIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (602, 'Coordinación Visomotriz', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (603, 'EVALUACION NEUROLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (604, 'EXAMEN FISICO GENERAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (605, 'ANAMNESIS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (606, 'PRUEBA DE EQUILIBRIO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (607, 'TEST DE ESTRES - COHEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (608, 'TEST DE FOBIAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (609, 'TEST DE ESPACIOS CONFINADOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (610, 'Altura geográfica / Anexo 7D', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (611, 'PLACA DE TORAX X', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (612, 'TEST TOXICOLOGICO COCAINA Y MARIHUANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (613, 'BILIRRUBINA TOTAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (614, 'TGP', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (615, 'TGO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (616, 'GGTP', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (617, 'PRUEBA MOLECULAR ANTIGENO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (618, 'PRUEBA RAPIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (619, 'EXAMEN FISICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (620, 'OSTEOMUSCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (621, 'HISTORIA CLINICA OCUPACIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (622, 'CERTIFICADO DE APTITUD MEDICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (623, 'ANTECEDENTES OFTALMOLOGICOS', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (624, 'TEST DE ESTEROPSIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (625, 'FICHA MEDICA RM 312', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (626, 'RADIOGRAFIA DE COLUMNA LUMBAR', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (627, 'EXAMEN PSICOLÓGICO SEGUN RM 312', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (628, 'TEST SRQ-TZUNG PARA ANSIEDAD - DEPRESION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (629, 'PRUEBA HISOPADO ANTIGENO', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (630, 'TEST DE ESTRES ANSIEDAD STAI', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (631, 'FUNCIONES BIOLOGICAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (632, 'GLUCOSA EN AYUNAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (633, 'ENTREVISTA DE ANTECEDENTES Y EXPOSICIÓN A RUIDO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (634, 'HDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (635, 'LDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (636, 'AUDIOMETRIA ÓSEA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (637, 'RADIOGRAFIA DE TÓRAX', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (638, 'EVALUACIÓN POR APARATOS Y SISTEMAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (639, 'FUNCIONES VITALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (640, 'CUESTIONARIO RESPIRATORIO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (641, 'TEST PSICOLOGICO EN AREAS COGNITIVAS Y AFECTIVAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (642, 'FONDO DE OJO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (643, 'PLOMO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (644, 'CADMIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (645, 'TEST DE VÉRTIGO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (646, 'TEST DE ADAPTACION, COMPETENCIAS, CONDUCTAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (647, 'TEST DE ADAPATACION, COMPETENCIAS, CONDUCTAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (648, 'PRUEBA DE ESFUERZO', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (649, 'VDRL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (650, 'HEMOGRAMA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (651, 'ACIDO URICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (652, 'COCAINA Y MARIHUANA EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (654, 'EXAMEN OFTALMOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (655, 'B-HCG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (656, 'SEROLOGICO - VHB - VHC - BK EN ESPUTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (657, 'EVALUACION MEDICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (658, 'ESCALA DE LIDERAZGO ORGANIZACIONAL (ELO)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (659, 'ESCALA MULTIDIMENSIONAL DE ASERTIVIDAD (EMA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (660, 'TEST DE LUSHER', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (661, 'TEST DEL ARBOL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (662, 'TEST POR COMPETENCIAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (663, 'TEST DE ESTRES OIT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (664, 'METODO SMART E', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (665, 'ESCALA DE SOMNOLENCIA DE EPWORTH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (666, 'INDICE DE CALIDAD DE SUEÑO PITTSBURG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (667, 'TEST DE COHEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (668, 'COCAINA Y MARIHUANA EN ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (669, 'BHCG CUALITATIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (670, 'PSICOSENSOMETRIA (TEST DE PALANCA, REACTIMETRO, SIMPLE Y TEST DE PUNTEADO)', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (671, 'PLOMO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (672, 'CROMO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (673, 'CROMO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (674, 'TEST DE EMBARAZO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (675, 'HEPATITIS B', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (676, 'HEPATITIS C', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (677, 'BK EN ESPUTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (678, 'SEROLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (681, 'COPSOQ ISTAS 21 VERSION MEDIA (Prevension Riesgo psicosocial)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (682, 'TEST INTELECTUAL / AFECTIVO-EMOCIONAL(SEGUN RM 312)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (683, 'RADIOGRAFIA DE TORAX - POSTERO-ANTERIOR DE TORAX', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (684, 'BK EN ESPUTO (2 MUESTRAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (685, 'AUDIOMETRIA AREA Y OSEA CON INTERPRETACION KLOCKHOFF', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (686, 'ESPIROMETRIA USO DE GEMO-006', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (687, 'VHB', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (688, 'VHC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (689, 'VIH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (690, 'EXAMEN OSTEOMUSCULAR GENERAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (691, 'EXAMEN OFTALMOLOGICO BASICO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (692, 'GLICEMIA EN AYUNAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (693, 'EXAMEN OSTEOMUSCULAR DIFERENCIADO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (694, 'RADIOGRAFIA LUMBOSACRA FRONTAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (695, 'ALTURA ESTRUCTURAL MAYOR 1.8 M DE ALTURA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (696, 'DECLARACION JURADA DE CONSENTIMIENTO - FICHA MEDICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (697, 'EXAMEN DE SEDIMENTO URINARIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (698, 'RADIOGRAFIA DE TORAX PA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (699, 'EVALUACION PSICOLOGICA OCUPACIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (700, 'COLINESTERERASA SERICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (701, 'ALCOHOL EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (702, 'ALCOHOL EN SALIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (703, 'GLICEMIA BASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (704, 'METANFETAMINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (705, 'ALCOHOL EN SALIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (706, 'BENZODIACEPINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (707, 'PERICAMPIMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (708, 'MINI TEST PSIQUIATRICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (709, 'TEST PARA TRABAJOS DE ALTURA GEOGRAFICA MAYOR A 2500 MSNM', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (710, 'TEST PARA TRABAJOS EN ESPACIOS CONFINADOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (711, 'PREGNOSTICON', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (712, 'ANTECEDENTES DE EXPOSICION A RUIDO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (713, 'PRUEBAS PSICOLOGICAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (714, 'RAYOS X FRONTAL (LECTURA OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (715, 'REFRACCIÓN CONDICIONAL SOLO PARA LOS QUE NO TIENEN 20/20', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (716, 'FICHA PSICOLOGICA OCUPACIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (717, 'BIOMETRIA SANGUINEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (718, 'PLACA DE TORAX PA', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (719, 'TEST DE ALTURA (ACROFOBIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (720, 'EVAlUACION  NEUROLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (721, 'FORMATO DE ALT. ML2 ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (722, 'CAMPIMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (723, 'ELECTROCARDIOGRAMA SIN CONDICIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (724, 'AGUJERO ESTENOPEICO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (725, 'MOTILIDAD OCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (726, 'ESCALA DE APRECIACION DEL ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (727, 'WAIS EVALUACION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (728, 'PRUEBA ANTIGENO COVID - 19', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (729, 'DOSAJE DE ALCOHOL (SALIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (730, 'PSICOLOGIA RM312', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (731, 'EXTASIS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (732, 'INTELIGENCIA (OBJETOS EQUIVOCADOS DEL BETA III)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (733, 'PERSONALIDAD (PERSONA BAJO LLUVIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (734, 'ATENCION Y CONCENTRACION (DIGITOS Y SIMBOLOS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (735, 'GOLDBERG (TEST DE ANSIEDAD Y DEPRESION)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (736, 'INVENTARIO DE MASIACH PARA DESCARTAR SD. BURNOUT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (737, 'ISTAS 21 (ABREVIADO)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (738, 'INTELIGENCIA (RAZONAMIENTO VERBAL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (739, 'TEST DE VISION DE PROFUNDIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (740, 'RADIOGRAFIA LUMBOSACRA FRONTAL Y LATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (741, 'EVALUACION PARA RIESGO DE FATIGA (TEST DE EPWORTH)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (742, 'RAYOS X DE PULMON', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (743, 'EVALUACION PARA ASCENSO A GRANDES ALTITUDES MAYOR 2500 msnm (16A)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (744, 'RADIOGRAFIA DE TORAX PA', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (745, 'B-HCG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (746, 'INMERSION BAJO EL AGUA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (747, 'REFRACCION LEJOS Y CERCA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (748, 'EXAMEN EXTERNO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (749, 'CAMPIMETRIA POR CONFRONTACION', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (750, 'TONOMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (751, 'Test de minessota (Test CAQ: De utilidad en procesos selectivos donde se requiera descartar Psicopatología. Tiene 144 preguntas.)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (752, 'EKG EN REPOSO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (753, 'VACUNA ANTIAMARILICA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (754, 'VACUNA ANTITETANICA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (756, 'ANEXO 16 + 16A', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (757, 'LAKE LOUISE MODIFICADO ANEXO 16A', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (758, 'TEST DE SOMNOLENCIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (759, 'SCORE CLINICO SAS', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (760, 'APTITUD PARA ALTURA FISICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (761, 'TRANSAMINASAS TGO Y TGP', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (762, 'RIESGO CARDIOVASCULAR FRAMINGHAM', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (763, 'PRUEBA DE ESFUERZO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (764, 'EVALUACION DE APTITUD MEDICA PARA TRABAJOS EN ALTURA ESTRUCTURAL MAYO 1.5M', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (765, 'VACUNA HEP B', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (766, 'VACUNA INFLUENZA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (767, 'TEST DE ACROFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (768, 'MOTIBIDAD OCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (769, 'TEST INVENTARIO DE ESTILOS DE PERSONALIDAD DE MILLION - MIPS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (770, 'TEST DE WAIS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (771, 'TEST DE BENTON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (772, 'TEST DE BENDER', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (773, 'Exploración externa:conjuntiva, córnea y esclerótica,reflejo fotomotor, consensual y reflejo de acomodación', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (774, 'Psicológica Ocupacional según Anexo 03 RM 312-2011', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (775, 'ACROFOBIA DE COHEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (776, 'TRABAJOS EN CALIENTE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (777, 'Personalidad, Adaptacion, Competencias, Conductas, Procesos Cognoscitivos, Estados Afectivos, Burnout, Estress Laboral', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (778, 'RADIOGRAFÍA LUMBO-SACRA: Radiografía FRONTAL Y LATERAL DE COLUMNA LUMBAR Y SACRA (Sólo casos críticos y antecedentes patológicos que reporte el MO)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (779, 'REACCION DE WIDALL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (780, 'KOH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (781, 'PARASITOLOGICO DIRECTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (782, 'PERFIL TIROIDEO (T3, T4, TSH)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (783, 'PSA (ANTIGENO PROSTATICO ESPECIFICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (784, 'AUDIOMETRIA AEREA Y OSEA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (785, 'BK INVESTIGACION', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (786, 'DROGAS PANEL 5D(MARIHUANA , COCAINA, EXTASIS , ANFETAMINA, BENZO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (787, 'MASLACH (BURNOUT, STRESS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (788, 'METANFETAMINA (ORINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (789, 'OPIACEOS CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (790, 'CAMPIMETRIA POR CONFRONTACION', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (791, 'ENCANDILAMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (792, 'FORIAS-HORIZONTAL/VERTICAL', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (793, 'FICHA DE EVALUACION OSTEOMUSCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (794, 'TEST DE MASLASCH (ESTRES LABORAL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (795, 'DROGAS (Metabolitos de marihuana / Metabolitos de cocaína / Metabolitos de opiáceos / Fenciclidina / Anfetaminas / Metanfetaminas)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (796, 'EXAMEN ESPUTO TBC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (797, 'EX. PARASITOLOGICOS DE HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (798, 'AGLUTINACIONES TIFOIDEAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (799, 'AGLUTINACIONES PARATIFICAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (800, 'AGLUTINACIONES BRUCELLA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (801, 'HONGOS UÑAS-KOH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (802, 'TEST DE FOBIAS (INCLUYE ACROFOBIA Y CLAUSTROFOBIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (803, 'VISIÓN ESTEREOSCOPICA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (804, 'ENCANDILAMIENTO, FORIA, CAMPIMETRÍA ', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (805, 'ANEXO 16 A - ESCALA LAKE LOUISE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (806, 'EXAMEN EXTERNO DEL OJO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (807, 'DESCARTE DE ESTRABISMO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (808, 'EVALUACION DE OJO SECO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (809, 'FICHA DE APTITUD EN ALTURA GEOGRAFICA (7D) - ANEXO 16 A', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (810, 'CUESTIONARIO PITTSBURGH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (811, 'Cuestionario de Berlin ( ficha de detección de SAOS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (812, 'HEMOGLOBINA GLICOSILADA (HBA1C)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (813, 'TRANSAMINASA OXALACETICA (AST) TGO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (814, 'TRANSAMINASA TGP (ALT)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (815, 'CREATININA SERICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (816, 'MERCURIO EN ORINA 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (817, 'ACOSO SEXUAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (818, 'EXAMEN CLINICO COMPLETA (FICHA OCUPACIONAL - ANEXO 02)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (819, 'DESCARTE DE EMBARAZO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (820, 'EXAMEN VHB, VHC, BK EN ESPUTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (821, 'BALANCE MUSCULAR BASICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (822, 'TEST DE DESLUMBRAMIENTO (VISION NOCTURNA, ENCANDILAMIENTO, RECUPERACION DE ENCADILAMIENTO)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (823, 'TEST DE SINTOMATICO RESPIRATORIO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (824, 'TEST DE AUDIT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (825, 'FICHA DE DESPISTAJE DE SINDROME DE APNEA DE SUEÑO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (826, 'ANEXO 16', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (827, 'TEST DE RAVEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (828, 'TEST DE LUXEMBOURG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (829, 'TEST DE LUXEMBOURG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (830, 'AUDIOMETRIA TONAL LIMINAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (831, 'RADIOGRAFIA DE TORAX PA Y LATERAL, LECTURA OIT, DESCARTE DE TBC', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (832, 'DESCARTE DE CATARATAS, GLAUCOMA Y OTRAS PATOLOGIAS', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (833, 'EVALUACION DE COMPETENCIAS LABORALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (834, 'TEST PERSONA BAJO LA LLUVIA, ANSIEDAD Y DEPRESION DE GOLDBERG, MINIMULT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (835, 'EVALUACION DE RIESGOS OCUPACIONALES (ISTAS 21)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (836, 'CUESTIONARIO NORDICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (837, 'EV. DERMATOLOGICO DIRIGIDA A DETECTAR CA, DE PIEL Y DERMATITIS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (838, 'RADIOGRAFIA DORSO LUMBAR PA Y LATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (839, 'PSICOSENSOMETRICO (PUNTEADO LAHY, PALANCA LAHY, TEST DE REACTIMETRIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (840, 'FATIGA Y SOMNOLENCIA : TEST E EPWORTH, BERLIN MODIFICADA, PITTSBURGH, TOULOUSE Y YOSHITAKE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (841, 'VIH, ANTICUERPOS - VHBS, VHC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (842, 'MANIPULADOR DE ALIMENTOS: KOH, PARASITOLOGICO, FROTIS FARINGEO D/C SALMONELOSIS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (843, 'TEST DE BARON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (844, 'TEST DE BARRAT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (845, 'TEST DE ISTAS (VISION CORTA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (846, 'SEROLOGICA (VDRL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (847, 'TEST DE DETECCIÓN DE FATIGA Y SOMNOLENCIA- SAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (848, 'CUESTIONARIO DE CONSUMO DE ALCOHOL -AUDIT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (849, 'PARASITOLÓGICO SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (850, 'SECRESIÓN NASO-FARINGE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (851, 'Ficha médica Anexo 16 (DS 024-2016 EM)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (852, 'TEST DE GOLDBERG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (853, 'TEST SINTOMATICO RESPIRATORIO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (854, 'TEST SINTOMATICO RESPIRATORIO Y/O DESCARTE COVID', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (855, 'DESCARTE DE LUMBALGIA MECANICA Y OTRAS LESIONES OSEAS, MUSCULARES Y ARTICULARES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (856, 'TEST COGNITIVO Y DE PERSONALIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (857, 'TEST MASLACH/ZUNG/INTELIGENCIA/NEUROPSICOLÓGICO/ESCALA APRECIACION DEL ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (858, 'VISION DE COLORES Y PROFUNDIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (859, 'EVALUACION POR COMPETENCIAS PARA EL PUESTO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (860, 'DEBE CUMPLIR REPETITIVIDAD Y ACEPTABILIDAD. SOLO SE ACEPTAN CURVAS A O B', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (861, 'TEST DE ANSIEDAD/INTELIGENCIA/NEUROPSICOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (862, 'FORMATO DE ALT. ML2', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (863, 'ISTAS 21 CORTO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (864, 'COPROCULTIVO SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (865, 'AGLUTINACIONES TIFICA Y PARATIFICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (866, 'BRUCELA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (867, 'HEPATITIS A (VHA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (868, 'BILIRRUBINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (869, 'CREATININA (FUNCION RENAL)(EN SANGRE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (871, 'EXAMEN DE ORINA CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (872, 'PRUEBA DE EQUILIBRIO ESTAICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (873, 'PSICOLOGIA DESCARTE DE FOBIA-ACROFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (874, 'ANAMNESIS, ANTECEDENTES PATOLOGICOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (875, 'INDICE DE FRAMINGHAM', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (876, 'Ficha médica Anexo 16 (DS 024-2016 EM)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (877, 'PATOLOGIAS EN OJO (PTERIGION, PINGUÉCULA)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (878, 'TORAX FRONTAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (879, 'EV. DE COMPETENCIAS LABORALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (880, 'TEST DE DEPRESION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (881, 'TEST DE BENDER O BENETON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (882, 'TEST MINIMENTAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (883, 'Test de Lusher (test de colores)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (884, 'WONDERLIC', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (885, 'CUESTIONARIO DE GOLDBERG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (886, 'VISION BINOCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (887, 'TEST DE EPWORTH (SOMNOLENCIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (888, 'TEST DE YOSHITAKE (FATIGA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (889, 'Anexo Nº 3 RM 312-2011 MINSA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (890, 'Agudeza visual (incluido agujero estenopéico)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (891, 'EAE, WAIS Evaluación', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (892, 'Escala de apreciación del estréseae', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (893, 'FENOLES TOTALES EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (894, 'EXAMEN OCULAR VISION BASICA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (895, 'ESPIROMETRIA NIOSH', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (896, 'EVALUACION DE RIESGO PSICOSOCIAL - ISTAS 21 (VISION CORTA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (897, 'AUDIOMETRÍA DE MONITOREO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (898, 'Fiche médico ocupacional: Anexo 02 RM 312-2011-MINSA + Historia de antecedentes ocupacional / antecedentes patológicos + Triaje + Antropometría + Ev clínica', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (899, 'Ev. Médica para trabajos en espacios confinados', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (900, 'Anexo 16 - Anexo para minería', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (901, 'Maniobra de nikolsky', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (902, 'Ficha SAS (Apnea)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (903, 'Cuestionario de índice capacidad vocal y calidad de vida de JACOBS Y COLS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (904, 'Test de colores (Test de ishihara)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (905, 'Test de profundidad (estereopsis/ Test de mosca/mariposa o random dot)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (906, 'Campimetría clínica en visiómetro', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (907, 'Test de schirmer (Descarte de ojo seco / Sensibilidad mucosa)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (908, 'Fondo de ojo sin dilatación', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (909, 'Fondo de ojo con dilatación', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (910, 'Refracción (medida de vista)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (911, 'Tonometría (Presión intraocular - PIO)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (912, 'Encandilamiento y recuperación', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (913, 'Test de foria', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (914, 'Firma oftalmólogo', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (915, 'Audiometría + Otoscopía', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (916, 'Espirometría + cuestionario', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (917, 'Radiografía de tórax + OIT', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (918, 'Audiometría + Otoscopía + Firma especialista', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (919, 'Espirometría + cuestionario  + Firma especialista', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (920, 'Radiografía de tórax + OIT  + Firma especialista', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (921, 'Radiografía de tórax PA  + Firma especialista', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (922, 'Radiografía cualquiera sin contraste 1 toma', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (923, 'Radiografía cualquiera sin contraste 2 tomas', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (924, 'Radiografía cualquiera sin contraste 3 tomas', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (925, 'Radiografía de columna completa (3 tomas)', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (926, 'Examen psicosensométrico - psicomotriz', (SELECT id FROM emo_categorias WHERE nombre = 'EXÁMENES COMPLEMENTARIOS' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (927, 'Electrocardiograma', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (928, 'Electrocardiograma + firma especialista', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (929, 'PRUEBA DE ESFUERZO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (930, 'Glucosa (basal o postprandial)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (931, 'Reticulocitos', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (932, 'Constantes corpusculares', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (933, 'Riesgo coronario (C-T -HDL-LDL-VLDL-Índice Coronario) PERFIL LIPIDICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (934, 'VLDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (935, 'Fosfatasa alcalina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (936, 'Bilirrubina total y fraccionada', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (937, 'Amilasa', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (938, 'Proteína total y fraccionada', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (939, 'Perfil hepático (TGO-TGP-GGTP-Fosfatasa - bilirrubina T y F-Proteina T y F)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (940, 'Calcio en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (941, 'Magnesio en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (942, 'Vitamina B12', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (943, 'Coprocultivo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (944, 'Urocultivo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (945, 'Ganmaglutamil transpeptidasa (GGTP)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (946, 'PSA cualitativo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (947, 'PSA cuantitativo (total o libre)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (948, 'T3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (949, 'T4', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (950, 'T4 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (951, 'TSH ultrasensible', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (952, 'Tiempo de coagulación y sangría', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (953, 'Tiempo de protombina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (954, 'Tiempo de Troboplastina parcial activada', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (955, 'Fibrinógeno', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (956, 'Aglutinaciones febriles (Tífico y paratífico /salmonelosis)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (957, 'KOH en uñas', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (958, 'Ex. De heces (parasitológico X1 muestra)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (959, 'Hepatitis A cualitativo - Igm', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (960, 'Perfil ETAS (KOH, Parasitológico, hep A, BK en esputo, Aglutinaciones febriles)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (961, 'RPR/VDRL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (962, 'VIH cualitativo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (963, 'Hepatitis B - Igm cualitativo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (964, 'Hepatitis C - Igm cualitativo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (965, 'HCV', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (966, 'HBs Antígeno australiano', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (967, 'Cultivo nasal (hisopado)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (968, 'Cultivo faríngeo (hisopado)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (969, 'Colinesterasa sérica', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (970, 'Colinesterasa eritrocitaria- plasmática', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (971, 'Alcohol en saliva - prueba rápida', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (972, 'Hemoglobina glicosilada', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (973, 'Test de Graham', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (974, 'COCAINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (975, 'MARIHUANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (976, 'Cocaína - marihuana - éxtasis (3 drogas)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (977, 'Panel (5 drogas)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (979, 'Panel (10 drogas)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (980, 'Plomo en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (981, 'CROMO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (982, 'Mercurio en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (983, 'Cadmio en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (984, 'Manganeso en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (985, 'Plomo suero', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (986, 'Cromo suero', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (987, 'Mercurio suero', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (988, 'DECLARACION DE SINTOMATICO RESPIRATORIO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (989, 'INTELIGENCIA - MEMORIA - PERSONALIDAD - AFECTIVIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (990, 'RADIOGRAFIA DE TORAX POSTERO ANTERIOR - CON LECTURA OIT', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (991, 'EXAMEN OCULAR VISION OPERADOR / CHOFER', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (992, 'RADIOGRAFIA DE TORAX (POSTERO - ANTERIOR)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 0)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (993, 'BILLIRRUBINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (994, 'CROMO EN SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (995, 'CADMIO SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (996, 'MANGANESO SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (997, 'FIRMA PATOLOGO ADICIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (998, 'Ev. Psicológica (RM. 312-2011-MINSA) - (Personalidad, inteligencia, emociones)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (999, 'Istas 21 versión corta (sin informe de monitoreo) - Riesgos psicosociales', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1000, 'Istas 21 versión media (sin informe de monitoreo) - Riesgos psicosociales', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1001, 'Test de somnolencia de EPTWORTH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1002, 'Inventario de burnout de MASLACH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1003, 'Test de estrés EAE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1004, 'Actitud hacia la prevención de riesgos laborales (aversión al riesgo)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1005, 'Test de ansiedad de Zung', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1006, 'Test de ansiedad estado - rasgo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1007, 'APGAR familiar', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1008, 'Cuestionario de acrofobia de cohen (fobia a alturas)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1009, 'Batería para conductores AUDIT /FICHAS SAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1010, 'Cuestionario de claustrofobia de Radomsky', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1011, 'Cuestionario de agresión de Buss y Perry', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1012, 'Cuestionario de Berlón', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1013, 'Cuestionario de Salamanca', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1014, 'Cuestionario LIPT-60 (acoso laboral)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1015, 'Cuestionario para identificación de trastornos debido al consumo de alcohol', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1016, 'Test de depresión de Zung', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1017, 'EQ-1 Test de Baron', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1018, 'Escala de bienestar psicológico de RYFF', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1019, 'Escala de estrés percibido', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1020, 'Escala de motivaciones psicosociales', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1021, 'Test de estados fóbicos', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1022, 'Teste de estrés OIT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1023, 'Test de fatiga', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1024, 'Índice de reactividad al estrés (IRE)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1025, 'Test de instricciones complejas', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1026, 'Índice NSA TLX', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1027, 'Perfil de estrés de Keneth', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1028, 'Síntomas de estrés SEPPO ARO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1029, 'SRQ-18', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1030, 'Test de vulnerabilidad', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1031, 'Test gestáltico visomotor de Bender', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1032, 'Test rápido de barranquilla Barsit', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1033, 'Test de ansiedad y depresión de GOLBERT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1034, 'Test mini-mental', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1035, 'Test de matrices progresivas avanzadas (MPA) de Raven', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1036, 'Test de Disc', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1037, 'Escala de inteligencia de Weschler para adultos WAIS IV', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1038, 'Test de Wonderlic', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1039, 'Test de la figura humana de Karen Machover', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1040, 'Test de la persona bajo la lluvia.', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1041, 'Test del animal que no existe', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1042, 'Test de la persona con arma', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1043, 'Test MCMI-III de Pearson Clinical. inventario clínico multiaxial de Millon.', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1044, 'Test de Rosal', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1045, 'Test de Mobbing- Pando', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1046, 'Cuestionario de autoestima de Rosemberg', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1047, 'Test de Personalidad de Eysenk', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1048, 'ACIDO FOLICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1049, 'ACIDO URICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1050, 'ACIDO URICO (ORINA 24 HRS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1051, 'ACIDO URICO (ORINA SIMPLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1052, 'ACTH (A.M.)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1053, 'ACTH (P.M.)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1054, 'ADA (LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1055, 'ADA (LIQ. ABDOMINAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1056, 'ADA (LIQ. ASCITICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1057, 'ADA (LIQ. PERICARDICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1058, 'ADA (LIQ. PERITONEAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1059, 'ADA (LIQ. PLEURAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1060, 'ADA (LIQ. SINOVIAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1061, 'ADA (LIQ. BRONCO ALVEOLAR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1062, 'ADA (LIQUIDO QUISTICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1063, 'ADA (SEC. HERIDA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1064, 'ADA (SEC. TORAXICA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1065, 'ADA SERICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1066, 'ALBUMINA (LIQ. ASCITICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1067, 'ALBUMINA (LIQ. PLEURAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1068, 'ALCOHOL CUALITATIVO (SALIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1069, 'ALFA FETO PROTEINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1070, 'ALFA FETO PROTEINA MATERNA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1071, 'AMILASA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1072, 'AMILASA (DRENAJE HUMORAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1073, 'AMILASA (LIQUIDO CAVIDAD ABDOMINAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1074, 'AMILASA (ORINA SIMPLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1075, 'AMILASA DREN DERECHO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1076, 'AMILASA DREN IZQUIERDO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1077, 'AMILASA EN ORINA DE 25 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1078, 'AMILASA SEC. HERIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1079, 'ANTI CCP IGG (PEPTIDO CICLICO CITRULINADO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1080, 'ANTI TIROGLOBULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1081, 'ANTI TPO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1082, 'ANTIESTREPTOLISINA O', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1083, 'BENCES JONES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1084, 'BETA 2 MICROGLOBULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1085, 'BHCG (VARONES)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1086, 'BILIRRUBINAS TOTALES Y FRACCIONADAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1087, 'BUN UREICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1088, 'CA 125', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1089, 'CA 15 3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1090, 'CA 19 9', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1091, 'CALCIO (ORINA DE 12 HORAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1092, 'CALCIO (ORINA DE 24 HORAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1093, 'CALCIO (ORINA SIMPLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1094, 'CALCIO IONICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1095, 'CALCIO SERICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1096, 'CEA (AG. CARCINO EMBRIONARIO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1097, 'CITOQUIMICO ASPIRADO BRONQUIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1098, 'CITOQUIMICO DE ABSCESO RIÑON', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1099, 'CITOQUIMICO DE LIQ. RETRO AURICULAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1100, 'CITOQUIMICO DE SEC. HERIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1101, 'CITOQUIMICO DE SEC. INTESTINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1102, 'CITOQUIMICO DE SEC. RINORAQUIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1103, 'CITOQUIMICO L.C.R.', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1104, 'CITOQUIMICO LIQ. ABDOMINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1105, 'CITOQUIMICO LIQ. AMNIOTICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1106, 'CITOQUIMICO LIQ. ASCITICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1107, 'CITOQUIMICO LIQ. DE BURSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1108, 'CITOQUIMICO LIQ. OVARICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1109, 'CITOQUIMICO LIQ. PERICARDICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1110, 'CITOQUIMICO LIQ. PERITONEAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1111, 'CITOQUIMICO LIQ. PIE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1112, 'CITOQUIMICO LIQ. PLEURAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1113, 'CITOQUIMICO LIQ. QUISTICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1114, 'CITOQUIMICO LIQ. SINOVIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1115, 'CLORO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1116, 'COLESTEROL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1117, 'COLESTEROL HDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1118, 'COLESTEROL LDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1119, 'COLESTEROL VLDL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1120, 'COMPLEMENTO C3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1121, 'COMPLEMENTO C4', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1122, 'CORTISOL AM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1123, 'CORTISOL PM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1124, 'CORTISOL POST ACTH 0.25 MG D', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1125, 'CPK', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1126, 'CPK MB STAT', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1127, 'CREATININA (ORINA AL AZAR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1128, 'CREATININA (ORINA SIMPLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1129, 'CREATININA (SANGRE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1130, 'CULTIVO DE AMBIENTE DE TRABAJO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1131, 'CULTIVO DE HONGOS COAGULO DE ESPECTORACION', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1132, 'CULTIVO SECRECION ABSCESO PERIANAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1133, 'CYFRA 21-1 (PULMON)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1134, 'DEPURACION DE CREAT. CORREGIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1135, 'DEPURACION DE CREATININA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1136, 'DEPURACION DE CREATININA EN 12H', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1137, 'DHEA-S', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1138, 'DHL (DESHIDROGENASA LACTICA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1139, 'DHL (LIQ.PLEURAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1140, 'ELECTROLITOS DE SUDOR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1141, 'ELECTROLITOS EN ORINA 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1142, 'ELECTROLITOS ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1143, 'ELECTROLITOS SUERO (NA CL K)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1144, 'ESTRADIOL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1145, 'FENOMENO LE L.CEFALORRAQUIDEO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1146, 'DERRITINA SERICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1147, 'FOSFATASA ACIDA PROSTATICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1148, 'FOSFATASA ACIDA TOTAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1149, 'FOSFATASA ALCALINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1150, 'FOSFORO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1151, 'FOSFORO EN ORINA DE 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1152, 'FOSFORO ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1153, 'FRACCION BETA BHCG (SANGRE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1154, 'FSH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1155, 'GASES EN SANGRE CAPILAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1156, 'GASES EN SANGRE VENOSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1157, 'GLUCOSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1158, 'GLUCOSA AYUNAS (GLICEMIA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1159, 'GLUCOSA BASAL Y POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1160, 'GLUCOSA POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1161, 'HEMOGLOBINA GLICOSILADA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1162, 'HEP. A AC IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1163, 'HEP. A AC. IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1164, 'HEP. B AG. DE SUPERF (HBSAG)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1165, 'HEP. B ANTICUERPO E', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1166, 'HEP. B ANTIGENO E', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1167, 'HEP. B CORE IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1168, 'HEP. C ANTICUERPOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1169, 'HEP. B ANTI. AG. SUPERFICIE (HBSAB)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1170, 'HEP. B CORE TOTAL (HBcAb)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1171, 'HIERRO SERICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1172, 'HIV I Y II + AG P24', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1173, 'HORMONA ANTIMULLERIANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1174, 'HORMONA DE CRECIMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1175, 'HTLV 1/2', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1176, 'INMUNOGLOBULINA A', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1177, 'INMUNOGLOBULINA E', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1178, 'INMUNOGLOBULINA G', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1179, 'INMUNOGLOBULINA M', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1180, 'INSULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1181, 'INSULINA BASAL Y POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1182, 'INSULINA POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1183, 'LATEX (RF)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1184, 'LH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1185, 'LIPASA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1186, 'LIPASA DREN IZQUIERDO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1187, 'LIPASA LIQ. DE CAVIDAD ABDOMINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1188, 'LIPASA SEC. HERIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1189, 'LIPIDOS TOTALES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1190, 'MAGNESIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1191, 'MAGNESIO (ORINA DE 24 HORAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1192, 'MAGNESIO (ORINA SIMPLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1193, 'MICROALBUMINURIA EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1194, 'MICROALBUMINURIA ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1195, 'NITROGENO UREICO ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1196, 'NITROGENO UREICO PLASMATICO (BUN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1197, 'PARATOHORMONA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1198, 'PCR-US (PROTEINA C REACTIVA ULTRASENSIBLE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1199, 'PEPTIDO C', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1200, 'PEPTIDO C BASAL Y POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1201, 'PEPTIDO C POST PRANDIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1202, 'PERFIL PSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1203, 'PERFIL TIROIDEO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1204, 'POTASIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1205, 'PROGESTERONA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1206, 'PROLACTINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1207, 'PROLACTINA POOL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1208, 'PROTEINA C REACTIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1209, 'PROTEINAS (LIQUIDO PLEURAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1210, 'PROTEINAS DE BENCES JONES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1211, 'PROTEINAS EN ORINA AL AZAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1212, 'PROTEINAS LIQ. ASCITICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1213, 'PROTEINAS TOTALES Y FRACCION', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1214, 'PROTEINURIA DE 12 HORAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1215, 'PROTEINURIA EN ORINA AL AZAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1216, 'PROTEINURIA ORINA DE 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1217, 'PSA (ANTIGENO PROSTATICO ESPECIFICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1218, 'PSA LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1219, 'SATURACION DE TRANSFERRINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1220, 'SODIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1221, 'SUERO AUTOLOGO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1222, 'T.G.O (TRANSAMINASA OXALACETICA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1223, 'T.G.P. (TRANSAMINASA PIRUVICA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1224, 'T3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1225, 'T3 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1226, 'T4', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1227, 'TESTOSTERONA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1228, 'TIROGLOBULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1229, 'TOLERANCIA A LA GLUCOSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1230, 'TOLERANCIA A LA LACTOSA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1231, 'TRANSFERRINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1232, 'TRANSFUCION AUTOLOGIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1233, 'TRIGLICERIDOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1234, 'TROPONINA T STAT', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1235, 'TSH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1236, 'UREA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1237, 'VITAMINA B12', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1238, 'ANFETAMINA CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1239, 'ANTICUERPOS ANTITIROIDEOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1240, 'ANTIDEPRESIVOS TRICICLICOS (ORINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1241, 'BARBITURICOS CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1242, 'BENZODIAZEPINAS CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1243, 'COCAINA CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1244, 'COCAINA (CUANTITATIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1245, 'DROGAS 2 TEST (COC-THC)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1246, 'DROGAS PANEL PARA 10 TEST', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1247, 'DROGAS PANEL PARA 5 TEST', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1248, 'EXTASIS CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1249, 'FENCICLIDINA CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1250, 'METANFETAMINAS CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1251, 'MORFINA CUALITATIVO (OPIOIDES)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1252, 'CONSTANTES CORPUSCULARES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1253, 'FRAGILIDAD CAPILAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1254, 'GOTA GRUESA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1255, 'HEMATIES, RECUENTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1256, 'HEMATOCRITO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1257, 'HEMOGLOBINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1258, 'HEMOGLOBINA - HEMATOCRITO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1259, 'HEMOGLOBINA LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1260, 'HEMOGRAMA AUTOMATIZADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1261, 'LAMINA PERIFERICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1262, 'PERFIL HEMOSTATICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1263, 'PLAQUETAS, RECUENTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1264, 'RETRACCION DEL COAGULO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1265, 'SANGRIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1266, 'TIEMPO DE COAGULACION Y SANGRIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1267, 'TIEMPO DE SANGRIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1268, 'VELOCIDAD DE SEDIMENTACION', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1269, 'ALERGIA, PANEL 27 ALERGENOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1270, 'ANTICOAGULANTE LUPICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1271, 'BICARBONATO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1272, 'BRUCELLA (HUDLESON)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1273, 'COMPATIBILIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1274, 'CRIOAGLUTININAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1275, 'CRIOGLOBULINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1276, 'DIMERO D', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1277, 'DONANTE TAMIZAJE COMPATIBILIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1278, 'FENOMENO LE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1279, 'FIBRINOGENO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1280, 'GASES ARTERIALES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1281, 'GRUPO SANGUINEO Y FACTOR RH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1282, 'LISIS EUGLOBULINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1283, 'MONOTEST (PAUL BUNNELL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1284, 'PROTEINOGRAMA / ELECTROFORETICO (SERICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1285, 'PROTEINOGRAMA / ELECTROFORESIS (ORINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1286, 'REACCION DE WIDAL (AGLUTACIONES FEBRILES)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1287, 'RETICULOCITOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1288, 'RPR (SEROLOGIAS) VDRL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1289, 'RPR CUANTITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1290, 'TEST DE COOMBS DIRECTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1291, 'TEST DE COOMBS INDIRECTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1292, 'TIEMPO DE PROTROMBINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1293, 'TIEMPO DE TROMBINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1294, 'TIEMPO PARCIAL TROMBOPLASTINA ACTIVADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1295, 'ALCOHOL, DOSAJE (SANGRE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1296, 'ANCA (ANTI-NEUTROF)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1297, 'ANDROSTENEDIONA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1298, 'ANTI.NEUTRALIZANTES SARS-COV-2', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1299, 'ANTINUCLEARES ESPECIFICO (ANA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1300, 'CARDIOLIPINA, AUTOANTIC. IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1301, 'CARDIOLIPINA, AUTOANTIC. IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1302, 'CHLAMYDIA TRACHOMATIS IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1303, 'CHLAMYDIA TRACHOMATIS IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1304, 'CITOMEGALOVIRUS IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1305, 'CITOMEGALOVIRUS IGG EN LCR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1306, 'GENEXPERT MTB/RIF (MYCOBACT. EN ESPUTO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1307, 'GENEXPERT MTB/RIF (MYCOBACT. EN L.SINOVIAL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1308, 'GENEXPERT MTB/RIF (MYCOBACT. EN LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1309, 'GENEXPERT MTB/RIF (MYCOBACT. EN ORINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1310, 'GENEXPERT MTB/RIF (MYCOBACT. X PCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1311, 'HELICOBACTER PYLORI IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1312, 'HELICOBACTER PYLORI IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1313, 'HERPES I IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1314, 'HERPES I IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1315, 'HERPES II IgG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1316, 'HERPES II IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1317, 'HERPES II IgM(LIQ. LUMBAR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1318, 'HERPES VIRUS I IGG(LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1319, 'HERPES VIRUS I IGM(LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1320, 'HERPES VIRUS II IGG(LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1321, 'HERPES VIRUS II IGM(LCR)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1322, 'HIDATIDOSIS, AC IGG (ECHINOCOCCUS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1323, 'HORMONA CRECIMIENTO (POST. EJE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1324, 'INMUNOGLOBULINAS (A, G, M)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1325, 'MITOCONDRIALES, AUTOANTICUERPO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1326, 'PAPILOMA VIRUS HUMANO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1327, 'PERFIL TORCH IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1328, 'PERFIL TORCH IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1329, 'RUBEOLA IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1330, 'RUBEOLA IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1331, 'TOXOPLASMA EN L.C.R. IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1332, 'TOXOPLASMA EN L.C.R. IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1333, 'TOXOPLASMA GONDII IGG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1334, 'TOXOPLASMA GONDII IGM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1335, 'TRIPANOSOMA-CRUZI (CHAGAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1336, 'ADENOVIRUS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1337, 'BENEDICT', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1338, 'BK 1 (ORINA 24H)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1339, 'BK 2 (ORINA 24H)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1340, 'BK 3 (ORINA 24H)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1341, 'BK 4 (ORINA 24H)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1342, 'BK ORINA 24 HORAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1343, 'BK SERIADO (ESPUTO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1344, 'BK SERIADO (ORINA 24 HRS) 10 MUESTRAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1345, 'CAPACITACION ESPERMATICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1346, 'CITOGRAMA DE ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1347, 'CITOGRAMA DE SEC. FARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1348, 'CITOGRAMA DE SEC. NASOFARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1349, 'CITOGRAMA DE SECRECION NASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1350, 'CITOGRAMA EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1351, 'CUERPOS CETONICOS EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1352, 'CUERPOS CETONICOS EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1353, 'ESPUTO PNEUMOCYSTIS JORIVECI (CARINII)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1354, 'EXAMEN COMPLETO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1355, 'EXAMEN COMPLETO ORINA/CONDICIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1356, 'EXAMEN DIRECTO CAVIDAD BUCAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1357, 'EXAMEN DIRECTO COSTRAS DE CARA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1358, 'EXAMEN DIRECTO CUERO CABELLUDO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1359, 'EXAMEN DIRECTO DE BOCA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1360, 'EXAMEN DIRECTO DE CUELLO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1361, 'EXAMEN DIRECTO DE ESCROTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1362, 'EXAMEN DIRECTO DE ESPALDAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1363, 'EXAMEN DIRECTO DE PESTAÑAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1364, 'EXAMEN DIRECTO DE PIE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1365, 'EXAMEN DIRECTO DE REGION ANAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1366, 'EXAMEN DIRECTO DE SALIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1367, 'EXAMEN DIRECTO DE SEC. PULMONAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1368, 'EXAMEN DIRECTO DE SEC. FARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1369, 'EXAMEN DIRECTO DE SEC.NASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1370, 'EXAMEN DIRECTO DE SEC.NASOFARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1371, 'EXAMEN DIRECTO DE SEC.PROSTATICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1372, 'EXAMEN DIRECTO DE SEC.URETRAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1373, 'EXAMEN DIRECTO DE SEC.VAGINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1374, 'EXAMEN DIRECTO DE TORAX', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1375, 'EXAMEN DIRECTO DE LIQ.SINOVIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1376, 'EXAMEN DIRECTO LIQ.ARTICULAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1377, 'EXAMEN DIRECTO LIQ.ESPERMATICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1378, 'EXAMEN DIRECTO RASPADO DE BRAZO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1379, 'EXAMEN DIRECTO. SEC. AMIGDALA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1380, 'EXAMEN DIRECTO SEC.HERIDA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1381, 'EXAMEN DIRECTO SEC.INGLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1382, 'EXAMEN DIRECTO SEC.OIDO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1383, 'EXAMEN DIRECTO SURCO B.PREPUCIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1384, 'EXAMEN DIRECTO ULCERA DE PENE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1385, 'EXAMEN DIRECTO ULCERA DE PIE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1386, 'GONADOTROFINA CORIONICA (ORINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1387, 'GRAM DE LIQUIDO QUISTICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1388, 'GRAM EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1389, 'GRAM QUISTE DE OVARIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1390, 'INVESTIG. DE PARASITOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1391, 'MORFOLOGIA DE GLOBULOS ROJOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1392, 'PH (ORINA 24H)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1393, 'PH EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1394, 'PH EN SALIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1395, 'PH EN SALIVA PM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1396, 'PROTEINURIA CUALITATIVA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1397, 'RECUENTO DE LEUCOCITOS (SEMEN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1398, 'SANGRE OCULTA (CHQ)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1399, 'SANGRE OCULTA I (CH)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1400, 'SANGRE OCULTA II (CH)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1401, 'SANGRE OCULTA/HECES(METODO INMUN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1402, 'SUDAN III', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1403, 'SUSTANCIAS REDUCTORAS EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1404, 'TINTA CHINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1405, 'TRICOGRAMA DE BELLOS (CARA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1406, 'TRICOGRAMA DE CABELLO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1407, 'BILIRRUBINA DE DRENAJE PULMONAR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1408, 'BK EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1409, 'BK EN LCR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1410, 'BK EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1411, 'CITOGRAMA EN ESPUTO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1412, 'COPROCULTIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1413, 'CULTIVO SEC. GLANDE Y PREPUCIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1414, 'CULTIVO (MIELOCULTIVO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1415, 'CULTIVO ANTIBIOGRAMA SEC.TALON', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1416, 'CULTIVO BK ASPIRADO BRONQUIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1417, 'CULTIVO BK QUISTE DE OVARIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1418, 'CULTIVO CHUPONES DE EMBASADORA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1419, 'CULTIVO DE ABSCESO CEREBRAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1420, 'INVESTIG. DE HONGOS REG. PERIANAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1421, 'INVESTIG. DE HONGOS REGION ANAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1422, 'INVESTIG. DE HONGOS RODILLA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1423, 'INVESTIG. DE HONGOS SEC URETRAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1424, 'INVESTIG. DE HONGOS SEC. BRONQUIAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1425, 'INVESTIG. DE HONGOS SEC. CONJUNTIVAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1426, 'INVESTIG. DE HONGOS SEC. FARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1427, 'INVESTIG. DE HONGOS SEC. GLANDE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1428, 'INVESTIG. DE HONGOS SEC.NASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1429, 'INVESTIG. DE HONGOS SEC. OJOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1430, 'INVESTIG. DE HONGOS SEC.VAGINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1431, 'INVESTIG. DE HONGOS SEMEN', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1432, 'INVESTIG. DE HONGOS SENO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1433, 'INVESTIG. DE HONGOS SURCO BALANO P', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1434, 'INVESTIG. DE HONGOS TESTICULO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1435, 'INVESTIG. DE HONGOS TORAX', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1436, 'INVESTIG. DE HONGOS UÑA DE PIE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1437, 'INVESTIG. DE HONGOS UÑAS DE MANO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1438, 'INVESTIG. DE HUEVOS (PEDICULUS HUMANUS CAPITIS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1439, 'PH VAGINAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1440, 'COPROFUNCIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1441, 'DIFERENCIACION CELULAR HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1442, 'PARASITOLOGICO SERIADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1443, 'PARASITOLOGICO SERIADO (2M)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1444, 'PARASITOLOGICO SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1445, 'REACCION INFLAMATORIA EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1446, 'ROTAVIRUS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1447, 'SANGRE OCULTA III(CH)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1448, 'SANGRE OCULTA/HECES I (METODO INMUN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1449, 'SANGRE OCULTA/HECES II (METODO INMUN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1450, 'SANGRE OCULTA/HECES III (METODO INMUN)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1451, 'TEST DE GRAHAM', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1452, 'TEST DE GRAHAM SERIADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1453, 'GLUCOSA ANH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1454, 'ESPERMATOGRAMA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1455, 'PRUEBA CUANTITATIVA COVID 19 (ECLIA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1456, 'PRUEBA CUANTITATIVA COVID19 (ECLIA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1457, 'MOLECULAR PCR - SARS COV-2 (COVID-19)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1458, 'PRUEBAS ESPECIALES PARA CONDUCTORES', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1460, 'KOH EN UÑAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1462, 'VISION NOCTURNA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1463, 'VISION MONOCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1464, 'VISION BINOCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1465, 'TEST VOCAL - ESTADO CUERDAS VOCALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1466, 'ORGANICIDAD, INTELIGENCIA, PERSONALIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1467, 'RADIOGRAFIA DE HOMBROS, CADERA Y RODILLAS', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1468, 'OTOSCOPIA BILATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1469, 'FUNCION VESTIBULAR DEL VIII PAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1470, 'TEST DE INTELIGENCIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1471, 'PSICOPATOLOGIA (MILLON)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1472, 'AUDIOMETRIA CON ENMASCARAMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1473, 'ORIENTACIÓN ESPACIAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1474, 'APNEA DEL SUEÑO (BERLIN MODIFICADO)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1475, 'PARASITOLÓGICO SERIADO EN HECES (x3)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1476, 'CULTIVO Y ANTIBIOGRAMA DE SECRECIÓN FARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1477, 'CULTIVO Y ANTIBIOGRAMA DE SECRECIÓN NASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1478, 'KOH DE LECHO UNGUEAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1479, 'CULTIVO DE LAVADO DE MANOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1480, 'HEPATITIS B (IgM)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1481, 'ALBUMINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1482, 'GLOBULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1483, 'THEVENON EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1484, 'EXAMEN EXTERNO DEL GLOBO OCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1485, 'EXTASIS EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1486, 'EVALUACION AFECTIVA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1487, 'TEST DE CONCENTRACIÓN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1488, 'EVALUACIÓN PARA CONDUCTORES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1489, 'Declaración jurada de estado de salud', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1490, 'Descarte de Psicopatologías', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1491, 'Descarte de Psicopatologías', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1492, 'CONDUCTA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1493, 'Ficha para suficiencia médica para conducción de vehículos', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1494, 'TEST DE AFECTIVIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1495, 'MOVIMIENTOS OCULARES', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1496, 'Aptitud de Seguridad', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1497, 'Proyectivo de personalidad', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1498, 'Seguimiento de instrucciones', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1499, 'Afrontamiento de situaciones de riesgo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1500, 'Control de impulsos', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1501, 'Normas y procedimientos', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1502, 'Proyectivo de personalidad', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1503, 'ESPIROMETRIA FORZADA ALAT', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1504, 'TOXICOLOGICO 10 DROGAS(cocaína, marihuana, éxtasis, opiáceos, anfetaminas, benzodiacepinas, oxicodona, metanfetamina, barbitúricos y metadona)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1505, 'TEST DE FATIGA DE YOSHITAKE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1506, 'ESCALA DE GOLDBERG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1507, 'ESCALA DE IMPULSIVIDAD DE BARRAT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1508, 'TEST DE FOBIAS DE COHEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1509, 'TEST DE AUDIT ESTÁNDAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1510, 'EXAMEN PSICOLÓGICO POR PUESTO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1511, 'ARSENICO EN ORINA DE 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1512, 'COBRE EN SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1513, 'AGLUTINACION EN LAMINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1514, 'FICHA DE EVALUACIÓN DERMATOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1515, 'RADIOGRAFIA DE TORAX POSTERO ANTERIOR (PA : DIGITAL; OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1516, 'VALORACION NUTRICIONAL COMPLETA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1517, 'EVALUACION MEDICA GENERAL INCIDIENDO EN EVALUACION PULMONAR ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1518, 'EVALUACION ERGONOMICA / EXAMEN MUSCULOESQUELETICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1519, 'BK SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1520, 'ESPIROMETRIA (NIOSH - ALAT)', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1521, 'DESCARTE DE FOBIA - ACROFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1522, 'BAT - 7 (SUB ESCALA DE ORIENTACION ESPACIAL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1523, 'TEST D2', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1524, 'PRUEBAS DE EQUILIBRIO ESTATICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1525, 'PARASITOLOGICO - COPROCULTIVO CON 1 MUESTRA DE HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1526, 'ACI ( APRECIACIÓN DE LA CAPACIDAD INTELECTUAL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1527, 'DIRECCIONES ( APTITUD ESPACIAL) Y SEMÁFOROS ( PRECISION Y RAPIDEZ PERCEPTIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1528, 'LA PRUEBA DE PERSONALIDAD ES EL CUESTIONARIO O ESCALA PSS QUE EVALUA PATRONES DE CONDUCTA DE LOS AUTOMOVILÍSTICAS CON CONTEXTOS DE TRAFICO + TEST DE SOMNOLENCIA ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1529, 'FICHA DE ALTURA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1530, 'LUMBAR (ANTERIOR - POSTERIOR)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1531, 'PLACA DE MANO', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1533, 'Carboxihemoglobina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1534, 'CULTIVO NASOFARINGE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1535, 'TOXICOLOGICO 5 DROGAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1536, 'PRUEBA DE ELISA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1537, 'TEST SCREENING DERMATOLOGICO (LAMPARA DE WOOD)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1538, 'ANEXO 16-A (MAS LAKE LOISE)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1539, 'EXAMEN MUSCULOESQUELETICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1540, 'EXAMEN MUSCULOESQUELETICO ESPECIFICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1541, 'RADIOGRAFIA DE TORAX METODOLOGIA OIT', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1542, 'EXAMEN OFTALMOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1543, 'EVALUACION ODONTOLOGIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN ODONTOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1544, 'RPR-VDRL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1545, 'EVALUACION CARDIOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1546, 'FICHA SAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1547, 'EAE Y TEST DE EPWORTH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1548, 'EMISION DE INFORME MEDICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1549, 'TEST VOCAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1550, 'ALTURA ESTRUCTURAL - TRABAJO A MAS DE 1 METRO DEL SUELO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1551, 'CUESTIONARIO POR ESPOSICION A COVS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1552, 'TEST DE INCAPACIDAD VOCAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1553, 'ESPIROMETRIA FORZADA', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1554, 'RADIOGRAFIA DE TORAX TECNICA CONVENCIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1555, 'TEST MINIMENTAL ABREVIADO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1556, 'EVALUACION CLINICA POR APARATOS Y SISTEMAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1557, 'COLESTEROL TOTAL + FRACCIONADO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1558, 'GLUCOSA EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1559, 'PLACA PULMONAR PA', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1560, 'ODONTOLOGIA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN ODONTOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1561, 'EVALUACION MUSCULO ESQUELETICA DE ACUERDO A LA RM 313-2011-MINSA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1562, 'CERTIFICADO MEDICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1563, 'PARASITOLOGICO SERIADO (3 MUESTRAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1564, 'BK EN ESPUTO SERIADO (3 MUESTRAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1565, 'PATOLOGIA OCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1566, 'PRUEBA BETA HCG (CUANTITATIVO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1567, 'HISOPADO NASOFARINGEO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1568, 'DECLARACION JURADA COVID 1G', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1569, 'RAYOS X TORAX INFORME MEDICO', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1570, 'HEMOGLOBINA GLICOSILADA (HBA1C)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1571, 'AGUDEZA VISUAL (CERCA Y LEJOS, AO, AE)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1572, 'DOSAJE PARA PLOMO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1573, 'DOSAJE PARA CADMIO EN ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1574, 'FICHA NEUROLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1575, 'Ficha COVID 19 (Anexo 2 DA 349 MINSA/DGIESP 2024)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1576, 'EVALUACION DE PIEL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1577, 'ANEXO 3 (RM 312 2011 MINSA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1578, 'EVALUACION DE ACOSO LABORAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1579, 'EVALUACION DE BURNOUT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1580, 'AUDIOMETRIA COMPLETA (VIA OSEA EN CASO SEA PATOLOGICA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1581, 'HEMOGRAMA COMPLETO (LEUCOCITOS/GLOBULOS ROJOS/PLAQUETAS/HEMOGLOBINA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1582, 'PERFIL LIPIDICO (SOLO COLESTEROL TOTAL/HDL/TGC)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1583, 'FUNCION HEPATICA (SOLO TGO - TGP)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1584, 'Examen ectoscópico (Conjuntivas, Escleras, Córnea, Pupila, Cristalino)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1585, 'Diplopía', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1586, 'CAMPO VISUAL', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1587, 'Distinguir colores Rojo-Verde-Amarillo', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1588, 'TEST DE BERLIN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1589, 'TEST DE PITTSBURGH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1590, 'EVALUACION PSICOTECNICA ( TEST DE PALANCA, TEST DE PUNTEO, TEST DE REACCIÓN)', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1591, 'Ficha de screening para Tuberculosis', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1592, 'DOSAJE DE MANGANESO ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1593, 'DOSAJE DE CROMO ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1595, 'THEVENON (SANGRE OCULTA DE HECES)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1596, 'Pruebas completas de Función hepática (TGO, TGP, Bilirrubinas totales y fraccionadas, Proteinas totales y fraccionadas, Gammaglutamil transpeptidasa)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1597, 'PSA Libre y total', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1598, 'ELECTROCARDIOGRAMA (12 DERIVADAS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1599, 'Ecografía Abdominal (Hígado, vías biliares, pancreas, bazo, retroperitoneo, renal)', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1600, 'Test percepción del riesgo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1601, 'RADIOGRAFIA DE COLUMNA CERVICAL A/P Y LATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1602, 'RADIOGRAFIA DE COLUMNA LUMBOSACRA LATERAL Y FRONTAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1603, 'APERTURA DE HISTORIA CLÍNICA MÉDICO OCUPACIONAL FORMATO ACTUALIZADO SEGÚN R.M. 312/2011 ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1604, 'EVALUACIÓN DE VISIÓN 3D (Test de la Mosca) ', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1605, 'EVALUACIÓN PSICOLÓGICA OCUPACIONAL FORMATO ACTUALIZADO SEGÚN R.M. 312/2011 ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1606, 'TEST DERMATOLOGICO / LAMPARA WOOD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1607, 'BK EN ESPUTO (1 MUESTRA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1608, 'PARASITOLOGICO EN HECES (1 MUESTRA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1609, 'TEST DE AVERSION/PROPENSION AL RIESGO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1610, 'FICHA MEDICA OCUPACIONAL (ANEXO 16)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1611, 'EXAMEN GLOBO OCULAR EXTERNO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1612, 'TEST DE COLORES PUROS (R-A-V)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1613, 'TEST DE REACTIVIDAD AL ESTRES (IRE)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1614, 'TEST DE ESTRES (OIT)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1615, 'TEST PROYECTIVO DE ACTIVIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1616, 'CAPACIDAD EMOCIONAL E INTELIGENCIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1617, 'ENTREVISTA PSICOLABORAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1618, 'PERFIL LIPIDICO CT, HDL-C, LDL-C, TG', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1619, 'EVALUACIÓN PARA TRABAJOS DE RIESGO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1620, 'FORMATO ALAT ML2', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1621, 'TEST PROYECTIVO DE PERSONALIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1622, 'CERTIFICADO DE APTITUD ADMINISTRATIVA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1623, 'EXPLORACION FISICA COMPLETA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1624, 'ANTECEDENTE OCUPACIONALES Y USO DE EPP', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1625, 'IDENTIFICACION DE FACTORES DE RIESGO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1626, 'REGISTRO DE ACCIDENTES Y ENFERMEDADES LABORALES Y NO LABORALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1627, 'Examen clínico neurológico (Parestesias, sensación de hormigueo y frio, dolores musculares y calambres, fatiga rapida y perdida de fuerza muscular, polineuritis sensitivomotriz)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1628, 'Luz de Wood', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1629, 'Maniobra de Nikolsky', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1630, 'TEST DE LA MOSCA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1631, 'RADIOGRAFÍA DE TÓRAX PA Lectura OIT (firma de consentimiento a mujeres en edad fértil sin sospecha de gestación HCGB negativo)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1632, 'RADIOGRAFÍA DE COLUMNA LUMBAR AP (firma de consentimiento a mujeres en edad fértil sin sospecha de gestación HCGB negativo)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1633, 'Espirometría de esfuerzo - ALAT', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1634, 'Audiometria (otoscopia , vía aérea y ósea) en cabina insonorizada audiométrica', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1635, 'BENCENO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1636, 'TOLUENO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1637, 'XILENO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1638, 'SEROLOGICO VHI', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1639, 'Frotis faringeo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1640, 'HBsAg', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1641, 'EVALUACION MUSCULOESQUELETICA POR TERAPIA FISICA Y REHABILITACION (RM 313-2011 - SA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1642, 'GLUCOSA EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1643, 'INFORME PSICOLOGICO OCUPACIONAL (INC. DETERMINAR COMPORTAMIENTO Y ACTITUD FRENTE A LA SEGURIDAD, FOBIAS, ECT)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1644, 'Audiometria via aerea (además via ósea si la aérea pasa de 25dB en cualquier frecuencia) (firmado por OTL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1645, 'Radiografia de Columna Lumbo sacra (frontal-lateral)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1646, 'PERFIL LIPIDICO (COLESTEROL TOTAL Y TRIGLICERIDOS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1647, 'Radiografia de Rodilla comparativa (Proyección de Rosenberg)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1648, 'Evaluación Músculo-esquelética por Medico evaluador ', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1649, 'AGLUTINACIONES O ANTIGENOS FEBRILES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1650, 'PARASITOLOGICOS EN HECES X1', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1651, 'MUSCULO ESQUELETICO: APTITUD DE ESPALDA Y RANGO ARTICULAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1652, 'AUDIOMETRÍA BASE, MONITOREO, RETIRO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1653, 'RADIOGRAFÍA DE TÓRAX (POSTERO-ANTERIOR)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1654, 'SUFICIENCIA MÉDICA PARA TRABAJOS ALTURA ESTRUCTURAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1655, 'EVALUACIÓN PSICOLÓGICA PARA TRABAJOS EN ALTURA ESTRUCTURAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1656, 'TEST DE IDENTIFICACIÓN DE TRASTORNO RELACIONADOS AL USO DE ALCOHOL (AUDIT) - ESTANDAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1657, 'DECLARACIÓN JURADA DE NO ESTAR GESTANDO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1658, 'PARASITOLOGICO X3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1659, 'VACUNA HEPATITIS A', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1660, 'ANTECEDENTES  PATOLOGICOS PERSONALES Y FAMILIARES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1661, 'FICHA DERMATOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1662, 'EVALUACION M-ESQUELETICA COLUMNA Y EXTREMIDADES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1663, 'MARIHUANA EN ORINA (CUALITATIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1664, 'ANFETAMINA EN ORINA (CUALITATIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1665, 'METANFETAMINA EN ORINA (CUALITATIVO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1666, 'COCAINA EN ORINA (CUALITATIVO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1667, 'ALCOHOL ETILICO (SANGRE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1668, 'BENZODIACEPINAS EN ORINA (CUALITATIVA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1669, 'TEST DE ESTRES LABORAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1670, 'EVALUACION PSICOLOGICA ( HOLLOW, BARON, MINIMULT, OTROS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1671, 'FUR', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1672, 'VACUNA TIFOIDEA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1673, 'PUNTEADO DE LAHY', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1674, 'PALANCA DE LAHY', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1675, 'TEST DE REACTIMETRÍA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1676, 'TEST MINIMULT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1677, 'Prueba de Ansiedad de Goldberg', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1678, 'TOULOUSE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1679, 'TEST: PERSONA BAJO LA LLUVIA, DEPRESIÓN DE GOLDBERG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1680, 'NICTOMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1681, 'ENCANDILAMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1682, 'PB EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1683, 'ARSENICO EN ORINA DE 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1684, 'COBRE EN SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1685, 'CADMIO EN SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1686, 'CADMIO EN SUERO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1687, 'ELECTROENCEFALOGRAFÍA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1688, 'CROMO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1689, 'SEROLOGÍA VIH VHB VHC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1690, 'D/C SALMONELOSIS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1691, 'Abuso de Sustancias: Alcohol y drogas', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1692, 'Score Framingham a 10 años', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1693, 'EAE, WAIS Evaluación', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1694, 'evaluar con la tecnica Disc (En una prueba que analiza el tipo de personalidad)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1695, 'VACUNAS DE TETANO', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1696, 'EVALUACION MEDICA ( INCLUYE EXAMEN DEL APARATO LOCOMOTOR, MUSCUESQUELETICA, PARES CREANEALES)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1697, 'TRANSAMINASAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1698, 'TOXICOLOGICO (COCAINA Y MARIHUANA EN ORINA) CUALITATIVO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1699, 'EVALUACION NUTRICIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1700, 'PERFIL LIPIDICO Y RIESGO CORONARIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1701, 'TEST DE CAGE', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1702, 'EVALUACION PSICOLOGICA CONDUCTUAL, COGNITIVA Y EMOCIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1703, 'TEST DASS - 21 Y CUESTIONARIO SALUD MENTAL AUNA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1704, 'Tórax(Postero-Anterior) Convencional', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1705, 'Tórax(Postero-Anterior) / Informe OIT', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1706, 'Lumbar(Anterior-Posterior)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1707, 'ANTIGENO DE SUPERFICIE PARA HEPATITIS B (HBsAg)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1708, 'Anticuerpos de Hepatitis C', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1709, 'Anticuerpos de superficie de Hepatitis B (Anti-HBs)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1710, 'Recuento de reticulocitos', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1711, 'TGO - TGP (TRANSAMINASAS) GGT', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1712, 'EVALUACION PSICOMETRICA ( ESTRES Y OTRAS BATERIAS)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1713, 'REACCION A LUES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1714, 'ARSENICO ORINA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1715, 'MERCURIO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1716, 'SINTOMATICA DE ESTRES SEPPO ARO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1717, 'MERCURIO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1718, 'CONSULTA TRAUMATOLOGIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1719, 'EXAMEN DIRECTO DE HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1720, 'CERTIFICADO DE MANIPULADOR DE ALIMENTOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1721, 'PLACA DE RAYOS X LUMBAR', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1722, 'EXAMEN DE DROGAS (5 PARAMETROS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1723, 'CONDICIONAL - INDICE DE FRAMINGHAM', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1724, 'CAPACIDAD, COORDINACION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1725, 'TEST DE AVERSION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1726, 'AREA COGNITIVA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1727, 'AREA EMOCIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1728, 'HEMOGRAMA COMPLETO (HEMATIMETRIA SANGUINEA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1729, 'RADIOGRAFIA DE TORAX (LECTURA CLINICA)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1730, 'PARASITOLOGICO X 3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1731, 'PARASITOLOGICO SERIADO X3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1732, 'DOSAJE DE ALCOHOL Y DROGAS 2 PARAMETROS COCAINA Y MARIHUANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1733, 'DOSAJE DE METALES PESADOS PLOMO EN SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1734, 'PLOMO SERICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1735, 'MERCURIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1736, 'ARSEMICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1737, 'PLOMO EN ORINA Y SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1738, 'MERCURIO EN ORINA Y SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1739, 'ARSENICO EN ORINA Y SANGRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1740, 'CADMIO , CROMO Y MANGANESO CONDICIONAL A EVALUACION MEDICA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1741, 'PRUEBA SEROLÓGICA (ANTIGENO DE SUPERFICIE PARA HEPATITIS B HBsAg)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1742, 'VACUNA ANTIRRABICA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1743, 'VACUNA CONTRA FIEBRE TIFOIDEA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1744, 'HISOPADO DE SUPERFICIE DE MANOS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1745, 'Test de Mallampati', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1746, 'Radiografía simple de pulmones (informe)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1747, 'Rx Lumbar (Incidencias frontal y lateral)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1748, 'TEST DE ORGANICIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1749, 'EXAMEN DE THEVENON EN HECES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1750, 'SERIADO DE HECES X 3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1751, 'PERFIL LIPIDO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1752, 'INSULINA BASAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1753, 'TOXICOLOGICO 10 DROGAS(cocaína, marihuana, éxtasis, opiáceos, anfetaminas, benzodiacepinas, oxicodona, metanfetamina, barbitúricos y metadona', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1754, 'PERFIL LIPIDICO CONDICIONAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1755, 'Cuestionario Nórdico de Kuorinka', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1756, 'EVALUACIÓN PSICOLÓGICA DE FOBIAS (ACROFOBIA) DE COHEN', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1757, 'BK (ESPUTO) CON TINCION ZIEHL NEELSEN', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1758, 'CULTIVO DE SECRECION FARINGEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1759, 'EXAMEN DIRECTO DE HONGOS (KOH)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1760, 'PARASITO POR 3 SERIADO/1ERA MUESTRA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1761, 'PARASITO POR 3 SERIADO/2DA MUESTRA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1762, 'PARASITO POR 3 SERIADO/3RA MUESTRA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1763, 'Test Apnea del sueño FICHA DETECCIÓN DE S.A.S.', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1764, 'EXAMEN OCULAR  VISION OPERADOR/CHOFER (CAMPIMETRIA, ENCANDILAMIENTO Y RECUPERACION DEL ENCANDILAMIENTO, ESTEREOPSIS)', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1765, 'EVALUACIÓN PSICOLÓGICA PARA MANEJO (Test de Organicidad, Inteligencia, Psicomotricidad y Psicopatología)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1766, 'EVALUACIÓN GABINETE PSICOMÉTRICO', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1767, 'EVALUACION DE SOMNOLENCIA/TEST DE EPWORTH', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1768, 'EXAMEN FISICO DE MANEJO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1769, 'EVALUACION ERGONOMICA - CARDIACA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1770, 'RADIOGRAFIA DE COLUMNA LUMBOSACRA FRONTAL Y LATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1771, 'EXAMEN PSICOLÓGICO DE APTITUD PARA EL BUCEO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1772, 'TEST DE ATENCION Y MEMORIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1773, 'TEST MULTIAXIAL DE MILLON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1774, 'EXAMEN VESTIBULAR, ESTUDIO LABERÍNTICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1775, 'EXAMEN DE APTITUD POR COMPETENCIAS Y PUESTO DE TRABAJO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1776, 'TIEMPO DE COAGULACION SANGUINEA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1777, 'INR', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1778, 'HIV', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1779, 'TIEMPO DE TROMBOPLASTINA PARCIA (TTP)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1780, 'Suficiencia para trabajos en caliente', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1781, 'Examen ginecológico + PAP', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1782, 'RIESGOS PSICOSOCIALES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1783, 'EXAMEN DE COMPORTAMIENTO Y ACTITUD SEGURA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1784, 'CALCULO DE STS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1785, 'OCUPACIONALES MINIMO 10 AÑOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1786, 'EVALUACION FISICA POR APARATOS Y SISTEMA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1787, 'EVALUACION POSTURAL (VISTA ANTERIOR. / VISTA POSTERIOR / VISTA LATERAL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1788, 'PRUEBAS FUNCIONALES ( APLEY / FINKEISTEIN / PHALEN)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1789, 'EXAMEN FISICO OFTALMOLOGIA', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1790, 'PRESENCIA PSICOPATOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1791, 'EVALUACION NIVEL INTELECTUAL, COORDINACION VISOMOTRIZ, MEMORIA, AFECTIVIDAD, PERSONALIDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1792, 'ENCUESTA DEL SUEÑO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1793, 'CUESTIONARIO DE SOMNOLENCIA DIURNA DE EPWORDTH Y DE ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1794, 'ANTECEDENTES AUDIOMETRICOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1795, 'AUDIOMETRIA BAJO PROCEDIMIENTO COAHC', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1796, 'ANTECEDENTES RESPIRATORIOS', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1797, 'ESPIROMETRIA BAJO PROCEDIMIENTO NIOSH', (SELECT id FROM emo_categorias WHERE nombre = 'ESPIROMETRIA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1798, 'DOSAJE COCAINA Y MARIHUANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1799, 'EVALUACION DE ORGANICIDAD, PRESENCIA PSICOPATOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1800, 'VALORACION DE INTELIGENCIA (5 ESFERAS), VALORACION DE LA COORDINACION VISUAL Y MOTORA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1801, 'TRABAJO EN ESPACIO CONFINADO (TEST DE SUFICIENCIA)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1802, 'EVALUACION PSICOLOGICA PARA MANEJO (CONDUCTORES)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1803, 'RADIOGRAFIA DE TORAX PA Y LATERAL LECTURA CON CRITERIOS OIT', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1804, 'EXAMEN TOXICOLOGICO (10 DROGAS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1805, 'AGLUTINACION EN LAMINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1806, 'RADIOGRAFIA LUMBAR PA Y LATERAL', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1807, 'BHCG SUB UNIDAD BETA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1808, 'TEST DE BC4 CUESTIONARIO DE ACTITUD FRENTE AL TRANSITO TOULOUSE, BENDER', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1809, 'DOSAJE DE ANFETAMINAS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1810, 'DOSAJE DE COCAÍNA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1811, 'DOSAJE DE MARIHUANA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1812, 'Suficiencia para trabajos en espacios confinados', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1813, 'EVALUACION DE SUFICIENCIA MEDICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1814, 'ALCOHOL TEST', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1815, 'EXAMEN EXTERNO DE OJO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1816, 'TEST DE REACTIVIDAD AL ESTRES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1817, 'FACT. DE R. PSICOSOCIAL (ISTAS) CORTO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1818, 'TEST PROYECTIVO (MACHOVER / ARBOL)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1819, 'TEST DE ANSIEDAD (ZUNG)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1820, 'Conjuntivas y cámara anterior', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1821, 'HVC', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1822, 'RADIOGRAFIA DE COLUMNA LUMBOSACRA', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1823, 'ESCANDILAMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1824, 'RECUPERACION DEL ENCANDILAMIENTO', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1825, 'Radiografia de tórax (anteroposterior y lateral)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1826, 'TEST DE MORFINA EN ORINA- DESCARTE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1827, 'MOLIBDENO EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1828, 'BERILIO EN ORINA DE 24 HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1829, 'CROMO VI EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1830, 'NIQUEL EN ORINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1831, 'TEST DE AGORAFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1832, 'EXAMEN FACIAL - FASCIOGRAMA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1833, 'PARASITOLOGICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1834, 'ANTICUERPOS - VHBS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1835, 'HIV ANTIGENO-ANTICUERPO 4TA GENERACIÓN', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1836, 'TEST DASS-21', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1837, 'EVALUACIÓN MEDICA PARA BRIGADISTAS(FORMATO NEWMONT)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1838, 'TEST DE ALERTA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1839, 'ESCALA DE ESTRES ORGANIZACIONAL OIT', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1840, 'carboxihemoglobina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1841, 'Pruebas cualitativas de drogas en orina (5) Cocaína, marihuana, éxtasis, opiáceos, benzodiacepinas', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1842, 'RX DE COLUMNA VERTEBRAL LUMBAR (FRENTE Y PERFIL)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1843, 'RX DE RODILLAS (FRENTE Y PERFIL)', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1844, 'ANTIGENO PROSTATICO ESPECIFICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1845, 'Capacidad, coordinacion, competencias y personalidad', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1846, 'ANAMNESIS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN AUDIOMÉTRICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1847, 'EVALUACION MUSCULOESQUELETICA ESPECIALIZADA A CIERTO GRUPO DE COLABORADORES Y CAMILLEROS EN EMPO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1848, 'EXAMEN DE REINCORPORACION ESPECIALIDAD TRAUMATOLOGIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1849, 'EVALUACION POR MEDICINA FISICA Y REHABILITACION', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1850, 'Test de Ansiedad: STAI', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1851, 'CUESTIONARIO LATINO EXTREMIDADES', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1852, 'examen clinico rachide', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1853, 'AMA - antimitocondriales', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1854, 'ANTIGENO DE SUPERFICIE-HEPATITIS B (HBsAg)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1855, 'ANTICUERPO ANTI HEPATITIS VIRAL C (Ac HVC)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1856, 'TEST DE MILLON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1857, 'NEO-FFI', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1858, 'T4 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1859, 'INVENTARIO DE ANSIEDAD DE BECK (BAI) EVALUA ANSIEDAD', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1860, 'INVENTARIO DE DEPRESIÓN DE BECK-II (BDI-II) EVALUA SINTOMAS DEPRESIVOS, DESMOTIVACION O ALTERACIONES DEL SUEÑO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1861, 'ESCALA DE IMPACTO DEL EVENTO-REVISADA (IES-) EVALUA ESTRES POST TRAUMATICO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1862, 'PSA TOTAL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1863, 'Liderazgo, Manejo de conflictos, Personalidad,  Manejo de Estrés y Organicidad, fobias.', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1864, 'PROCESOS COGNOSCITIVOS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1865, 'Autoevaluación de propensión al riesgo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1866, 'EVALUACIÓN MÚSCULO ESQUELÉTICA ( Enfatizar Columna Vertebral)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1867, 'Score Framingham a 10 años', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1868, 'EVALUACION DE PERCEPCION DEL RIESGO Y BATERIA COMPLETA DE EVALUACION PSICOLOGICA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1869, 'Declaración Jurada de Salud para Exposición Laboral a gran altitud - Lake Louise', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1870, 'INMONOGLOBULINA E (IGE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1871, 'CALPROTECTINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1872, 'NSE (NEURON SPECIFEC ENOLASE)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1873, 'PROTEINA S 100', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1874, 'ZONULINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1875, 'RAYOS X DE MANO IZQUIERDA', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1876, 'PERFIL DE COAGULACION', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1877, 'Certificado de Trabajos en Exposición a Riesgo Eléctrico', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1878, 'INTERCONSULTA DE NEUROCIRUGÍA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1879, 'ANTI-TPO (ANTI PEROXIDASA)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1880, 'CUESTIONARIO DE SINTOMAS SRQ-18-2020', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1881, 'ESCALA SINTOMATICA DE ESTRES SEPPO ARO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1882, 'Valoracion de inteligencia 5 esferas, valoracion de habilidades sociales, evaluacion de organicidad, presencia de psicopatologia, rasgos depresivos, estrés, sind. Burnout. Evaluacion de fobias (altura estructural/espacios confinados)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1883, 'test de beck', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1884, 'test de million', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1885, 'test de malash', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1886, 'TEST DE VULNERABILIDAD AL ESTRÉS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1887, 'IGRA (PRUEBA PARA TUBERCULOSIS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1888, 'PRUEBA DE SIFILIS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1889, 'PERFIL RENAL ( CREATININA, UREA, ACIDO URICO)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1890, 'PANEL TOXICOLOGICO (METADONA, BENZODIACEPINAS, THC, COCAINA, ANFETAMINAS, OPIACEOS, BARBITURICOS)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1891, 'PRESION ARTERIAL', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1892, 'ESCALA KESSLER 10 (EVALUACION DE ESTRES PSICOLOGICO)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1893, 'EVALUACION DEL SISTEMA NERVIOSO', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1894, 'PERFIL HEPATICO (TGO TGP,FA,PT/F,BILT/F)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1895, 'CHESTER STEP TEST (EVALUACIÓN AERÓBICA) EN SUBIR Y BAJAR UN ESCALON', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1896, 'Perfil hormonal', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1897, 'Vit d', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1898, 'Ferritina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1899, 'ACIDOS BILIARES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1900, 'ACIDOS BILIARES', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1901, 'CALCIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1902, 'MICROALBUMINURIA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1903, 'PROTEINURIA DE 24HRS', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1905, 'VISIOMETRO', (SELECT id FROM emo_categorias WHERE nombre = 'VISIOMETRO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1906, 'TEST DE ANTICIPACION', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1907, 'TEST DE COORDINACION BIMANUAL', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMEN PSICOSENSOMETRICO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1908, 'SENSIBILIDAD A PENICILINA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1909, 'EVALUACIÓN CARDIOVASCULAR', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1910, 'CUESTRIONARIO PAS ESCALA DE PANICO Y AGORAFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1911, 'CUESTIONARIO AQ - ACROFOBIA', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1912, 'VISIOMETRIA', (SELECT id FROM emo_categorias WHERE nombre = 'VISIOMETRO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1913, 'VACUNA CONTRA LA FIEBRE AMARILLA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1914, 'VACUNA CONTRA LA FIEBRE AMARILLA', (SELECT id FROM emo_categorias WHERE nombre = 'EXAMENES TU SALUD' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1915, 'PROBNP', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1916, 'ALFA 1 ANTITRIPSINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1917, 'VITAMINA D', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1918, 'GGTP', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1919, 'RADIOGRAFIA DE TOBILLOS', (SELECT id FROM emo_categorias WHERE nombre = 'RAYOS X' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1920, 'ELECTROLITOS CALCIO, SOLDIO, POTASIO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1921, 'TSH 4 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1922, 'PCR ULTRASENSIBLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1923, 'MICRO ALBUMINURIA SIMPLE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1924, 'MAGNESIO SERICO', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1925, 'APOLIPO PROTEINA B', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1926, 'LIPOPROTEINA A', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1927, 'HOMOSISTEINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1928, 'VITAMINA B12', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1929, 'VITAMINA B FERRATINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1930, 'SAT TRASNGFERRINA', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1931, 'FICHA STOP-BANG', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
VALUES (1932, 'EVALUACION DE PROCESOS COGNITIVOS, EMOCIONALES, OBSERVACION DE CONDUCTAS', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN PSICOLÓGICA' LIMIT 1), 1)
  ON DUPLICATE KEY UPDATE
    `nombre`        = VALUES(`nombre`),
    `categoria_id`  = VALUES(`categoria_id`),
    `activo`        = VALUES(`activo`);

-- --- 4) Exámenes nuevos del Excel sin identificador legacy.
--     Para evitar duplicados al re-correr, primero verificamos por (nombre, categoria).
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Ev. Musculo esquelética / osteomuscular', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Ev. Musculo esquelética / osteomuscular' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Ev. Musculo esquelética / osteomuscular' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Ev. Médica para trabajos en altura > 1.8m', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Ev. Médica para trabajos en altura > 1.8m' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Ev. Médica para trabajos en altura > 1.8m' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Screening dermatológico - Luz de Wood', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Screening dermatológico - Luz de Wood' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Screening dermatológico - Luz de Wood' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Screening neurológico', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Screening neurológico' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Screening neurológico' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Anexo 16 - Ev para trabajos en altura geográfica >2500 m', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Anexo 16 - Ev para trabajos en altura geográfica >2500 m' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Anexo 16 - Ev para trabajos en altura geográfica >2500 m' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Maniobra de nikolsky', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Maniobra de nikolsky' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Maniobra de nikolsky' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Ficha SAHS (Apnea)', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Ficha SAHS (Apnea)' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN MÉDICA OCUPACIONAL' LIMIT 1)
  WHERE `nombre` = 'Ficha SAHS (Apnea)' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Agudeza visual (cerca y lejos) - Ev externa', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Agudeza visual (cerca y lejos) - Ev externa' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1)
  WHERE `nombre` = 'Agudeza visual (cerca y lejos) - Ev externa' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Campimetría por confrontación', (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Campimetría por confrontación' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'OFTALMOLOGÍA' LIMIT 1)
  WHERE `nombre` = 'Campimetría por confrontación' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Electrocardiograma', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Electrocardiograma' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1)
  WHERE `nombre` = 'Electrocardiograma' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Prueba de esfuerzo', (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Prueba de esfuerzo' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'EVALUACIÓN CARDIOVASCULAR' LIMIT 1)
  WHERE `nombre` = 'Prueba de esfuerzo' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Hemograma completo (incluye Hb y Ho)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Hemograma completo (incluye Hb y Ho)' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Hemograma completo (incluye Hb y Ho)' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Grupo sanguíneo y factor RH', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Grupo sanguíneo y factor RH' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Grupo sanguíneo y factor RH' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Examen de orina completa', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Examen de orina completa' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Examen de orina completa' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Hemoglobina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Hemoglobina' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Hemoglobina' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Reticulocitos', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Reticulocitos' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Reticulocitos' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Constantes corpusculares', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Constantes corpusculares' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Constantes corpusculares' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Colesterol', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Colesterol' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Colesterol' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Triglicéridos', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Triglicéridos' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Triglicéridos' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Perfil lipídico completo (C-T-HLD-VLDL-LDL)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Perfil lipídico completo (C-T-HLD-VLDL-LDL)' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Perfil lipídico completo (C-T-HLD-VLDL-LDL)' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Urea', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Urea' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Urea' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Creatinina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Creatinina' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Creatinina' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Fosfatasa alcalina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Fosfatasa alcalina' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Fosfatasa alcalina' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Ácido úrico', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Ácido úrico' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Ácido úrico' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Amilasa', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Amilasa' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Amilasa' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Vitamina B12', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Vitamina B12' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Vitamina B12' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Coprocultivo', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Coprocultivo' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Coprocultivo' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'T3', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'T3' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'T3' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'T4', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'T4' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'T4' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'T4 LIBRE', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'T4 LIBRE' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'T4 LIBRE' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Tiempo de coagulación y sangría', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Tiempo de coagulación y sangría' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Tiempo de coagulación y sangría' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Fibrinógeno', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Fibrinógeno' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Fibrinógeno' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'KOH en uñas', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'KOH en uñas' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'KOH en uñas' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'RPR/VDRL', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'RPR/VDRL' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'RPR/VDRL' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Prueba de embarazo cualitativo ( BHCG cualitativo)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Prueba de embarazo cualitativo ( BHCG cualitativo)' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Prueba de embarazo cualitativo ( BHCG cualitativo)' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Factor reumatoide', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Factor reumatoide' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Factor reumatoide' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Hemoglobina glicosilada', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Hemoglobina glicosilada' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Hemoglobina glicosilada' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Insulina basal', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Insulina basal' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Insulina basal' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Proteína C reactiva', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Proteína C reactiva' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Proteína C reactiva' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Test de Graham', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Test de Graham' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Test de Graham' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Cocaína - marihuana (2 drogas)', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Cocaína - marihuana (2 drogas)' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Cocaína - marihuana (2 drogas)' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Cromo en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Cromo en orina' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Cromo en orina' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Cromo en orina', (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Cromo en orina' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'LABORATORIO' LIMIT 1)
  WHERE `nombre` = 'Cromo en orina' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Influenza cepa 2024', (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Influenza cepa 2024' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1)
  WHERE `nombre` = 'Influenza cepa 2024' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Tetanos', (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Tetanos' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1)
  WHERE `nombre` = 'Tetanos' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'FIEBRE AMARILLA', (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'FIEBRE AMARILLA' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1)
  WHERE `nombre` = 'FIEBRE AMARILLA' AND `identificador` IS NULL;
INSERT INTO `examenes` (`identificador`, `nombre`, `categoria_id`, `activo`)
SELECT NULL, 'Hepatitis A', (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1), 1
  FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM `examenes` WHERE `nombre` = 'Hepatitis A' AND `identificador` IS NULL);
UPDATE `examenes` SET `activo` = 1, `categoria_id` = (SELECT id FROM emo_categorias WHERE nombre = 'VACUNAS' LIMIT 1)
  WHERE `nombre` = 'Hepatitis A' AND `identificador` IS NULL;

-- --- 5) Precios base globales (sede_id NULL): upsert por (examen_id, sede_id).
--     `precio` (col legacy) = `precio_desde_16`; si no hay precio_desde_16, usa precio_hasta_15.
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 424 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 425 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 427 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 429 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 465 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 466 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 14.00, 14.00, 14.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 473 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 481 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 1.80, 1.80, 1.80, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 482 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 491 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 492 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 497 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 498 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 505 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 513 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 12.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 523 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 32.00, 32.00, 32.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 534 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 569 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 570 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 603 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 6.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 614 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 6.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 615 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 634 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 635 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 651 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 660 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 669 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 6.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 677 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 695 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 4.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 725 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 744 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 749 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 771 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 833 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 2.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 836 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 15.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 898 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 5.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 899 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 2.00, 4.00, 2.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 900 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 901 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 902 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 6.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 903 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 904 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 905 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 906 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 907 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 15.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 908 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 909 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 910 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 15.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 911 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 912 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 913 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 914 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 15.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 915 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 15.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 916 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 917 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 65.00, 50.00, 65.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 918 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 65.00, 50.00, 65.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 919 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 65.00, 55.00, 65.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 920 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 65.00, 55.00, 65.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 921 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 922 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 36.00, 36.00, 36.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 923 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 54.00, 54.00, 54.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 924 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 48.00, 54.00, 48.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 925 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 30.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 926 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 14.00, 14.00, 14.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 927 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 14.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 928 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 120.00, 120.00, 120.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 929 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 5.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 930 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 931 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 932 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 933 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 934 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 935 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 6.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 936 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 937 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 7.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 938 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 939 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 9.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 940 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 13.00, 8.00, 13.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 941 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 39.00, 39.00, 39.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 942 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 943 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 22.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 944 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 9.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 945 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.00, 22.00, 22.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 946 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 48.00, 48.00, 48.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 947 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 948 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 949 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 950 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 951 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 952 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 953 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 954 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 9.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 955 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 14.00, 12.00, 14.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 956 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 957 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 6.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 958 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.00, 20.00, 22.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 959 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 68.00, 68.00, 68.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 960 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 9.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 961 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 962 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 30.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 963 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 30.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 964 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 30.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 965 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 30.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 966 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.00, 22.00, 22.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 967 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.00, 22.00, 22.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 968 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 34.00, 30.00, 34.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 969 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 245.00, 250.00, 245.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 970 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 14.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 971 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 972 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 973 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 974 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 975 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 26.00, 26.00, 26.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 976 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 36.00, 40.00, 36.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 977 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 38.00, 50.00, 38.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 979 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 115.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 980 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 175.00, 180.00, 175.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 982 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 115.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 983 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 175.00, 180.00, 175.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 984 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 105.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 985 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 125.00, 130.00, 125.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 986 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 175.00, 180.00, 175.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 987 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 130.00, 130.00, 130.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 994 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 115.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 995 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 175.00, 180.00, 175.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 996 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 60.00, 60.00, 60.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 997 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 10.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 998 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 999 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1000 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 8.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1001 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1002 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1003 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1004 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1005 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1006 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1007 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1008 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 10.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1009 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1010 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1011 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1012 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1013 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 4.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1014 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1015 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1016 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1017 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1018 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1019 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1020 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1021 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1022 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1023 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1024 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1025 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 6.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1026 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1027 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1028 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1029 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1030 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1031 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1032 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1033 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 4.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1034 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1035 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1036 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1037 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1038 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1039 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1040 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1041 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1042 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1043 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1044 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1045 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1046 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1047 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1048 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1049 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1050 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1051 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1052 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1053 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1054 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1055 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1056 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1057 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1058 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1059 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1060 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1061 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1062 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1063 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1064 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1065 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1066 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1067 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1068 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1069 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1070 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1071 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1072 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1073 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1074 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1075 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1076 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1077 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1078 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 59.00, 59.00, 59.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1079 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1080 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1081 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1082 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1083 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1084 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1085 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1086 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1087 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 27.00, 27.00, 27.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1088 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 27.00, 27.00, 27.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1089 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 27.00, 27.00, 27.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1090 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1091 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1092 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1093 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1094 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1095 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1096 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1097 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1098 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1099 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1100 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1101 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1102 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1103 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1104 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1105 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1106 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1107 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1108 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1109 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1110 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1111 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1112 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1113 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1114 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1115 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1116 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1117 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1118 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1119 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 27.00, 27.00, 27.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1120 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 27.00, 27.00, 27.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1121 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1122 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1123 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1124 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1125 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1126 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1127 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1128 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1129 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1130 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1131 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1132 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 50.00, 50.00, 50.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1133 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1134 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1135 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1136 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1137 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1138 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1139 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1140 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1141 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1142 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1143 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1144 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1145 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1146 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1147 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1148 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1149 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1150 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1151 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1152 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1153 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1154 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1155 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1156 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1157 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1158 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1159 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1160 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1161 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1162 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1163 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1164 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1165 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1166 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1167 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 21.00, 21.00, 21.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1168 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1169 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1170 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1171 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1172 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 180.00, 180.00, 180.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1173 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1174 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1175 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1176 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1177 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1178 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1179 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1180 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 32.00, 32.00, 32.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1181 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1182 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1183 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1184 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1185 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1186 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1187 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1188 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1189 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1190 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1191 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1192 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1193 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1194 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1195 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1196 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1197 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 19.00, 19.00, 19.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1198 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1199 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 60.00, 60.00, 60.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1200 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1201 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 40.00, 40.00, 40.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1202 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 60.00, 60.00, 60.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1203 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1204 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1205 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1206 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1207 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1208 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1209 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1210 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1211 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1212 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1213 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1214 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1215 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.00, 7.00, 7.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1216 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1217 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1218 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1219 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1220 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1221 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1222 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1223 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1224 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1225 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1226 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1227 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1228 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1229 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1230 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1231 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 40.00, 40.00, 40.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1232 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1233 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 50.00, 50.00, 50.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1234 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1235 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1236 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1237 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1238 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1239 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1240 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1241 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1242 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1243 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 40.00, 40.00, 40.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1244 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1245 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 58.00, 58.00, 58.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1246 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1247 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1248 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1249 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1250 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 15.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1251 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1252 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1253 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1254 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.75, 3.75, 3.75, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1255 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.72, 4.72, 4.72, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1256 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.72, 4.72, 4.72, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1257 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.50, 6.50, 6.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1258 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1259 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.50, 6.50, 6.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1260 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1261 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1262 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.72, 4.72, 4.72, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1263 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1264 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1265 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1266 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 2.00, 2.00, 2.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1267 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1268 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 180.00, 180.00, 180.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1269 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1270 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1271 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1272 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 30.00, 30.00, 30.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1273 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1274 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1275 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 60.00, 60.00, 60.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1276 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 145.00, 145.00, 145.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1277 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1278 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1279 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1280 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1281 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1282 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1283 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 50.00, 50.00, 50.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1284 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 50.00, 50.00, 50.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1285 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 3.50, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1286 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1287 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1288 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1289 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1290 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1291 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1292 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1293 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1294 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1295 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 59.00, 59.00, 59.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1296 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1297 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 70.00, 70.00, 70.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1298 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1299 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1300 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 35.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1301 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1302 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1303 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 26.00, 26.00, 26.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1304 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 26.00, 26.00, 26.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1305 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 480.00, 480.00, 480.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1306 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 480.00, 480.00, 480.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1307 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 480.00, 480.00, 480.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1308 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 480.00, 480.00, 480.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1309 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 480.00, 480.00, 480.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1310 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1311 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1312 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1313 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1314 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1315 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1316 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1317 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1318 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1319 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1320 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1321 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1322 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 28.00, 28.00, 28.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1323 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 75.00, 75.00, 75.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1324 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1325 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 250.00, 250.00, 250.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1326 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 100.00, 100.00, 100.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1327 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 100.00, 100.00, 100.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1328 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1329 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1330 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1331 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1332 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1333 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1334 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1335 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 22.50, 22.50, 22.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1336 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1337 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1338 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1339 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1340 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1341 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1342 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 9.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1343 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 40.00, 40.00, 40.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1344 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 130.00, 130.00, 130.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1345 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1346 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1347 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1348 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1349 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1350 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1351 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1352 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1353 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 2.50, 2.50, 2.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1354 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 3.50, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1355 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1356 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1357 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1358 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1359 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1360 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1361 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1362 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1363 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1364 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1365 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1366 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1367 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1368 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1369 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1370 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1371 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1372 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1373 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1374 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1375 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1376 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1377 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1378 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1379 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1380 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1381 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1382 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1383 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1384 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1385 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1386 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1387 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1388 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1389 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1390 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1391 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1392 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1393 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1394 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1395 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1396 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1397 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1398 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1399 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1400 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1401 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 5.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1402 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1403 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 7.50, 7.50, 7.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1404 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1405 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1406 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1407 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1408 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1409 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1410 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1411 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.00, 17.00, 17.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1412 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1413 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1414 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1415 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1416 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1417 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1418 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 17.50, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1419 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1420 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1421 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1422 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1423 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1424 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1425 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1426 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1427 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1428 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1429 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1430 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1431 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1432 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1433 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1434 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1435 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1436 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1437 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1438 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1439 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 20.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1440 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1441 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.50, 8.50, 8.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1442 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1443 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.00, 3.00, 3.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1444 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1445 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 25.00, 25.00, 25.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1446 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.90, 5.90, 5.90, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1447 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1448 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1449 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.50, 12.50, 12.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1450 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1451 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 12.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1452 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 10.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1453 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 45.00, 45.00, 45.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1454 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 50.00, 50.00, 50.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1455 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 55.00, 55.00, 55.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1456 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 80.00, 80.00, 80.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1457 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 16.00, 16.00, 16.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1515 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 80.00, 80.00, 80.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE identificador = 1533 LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 5.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Ev. Musculo esquelética / osteomuscular' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 8.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Ev. Médica para trabajos en altura > 1.8m' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 4.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Screening dermatológico - Luz de Wood' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 7.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Screening neurológico' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 8.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Anexo 16 - Ev para trabajos en altura geográfica >2500 m' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 4.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Maniobra de nikolsky' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 6.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Ficha SAHS (Apnea)' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 4.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Agudeza visual (cerca y lejos) - Ev externa' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 0.00, 4.00, 0.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Campimetría por confrontación' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 14.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Electrocardiograma' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 120.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Prueba de esfuerzo' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 9.00, 10.00, 9.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Hemograma completo (incluye Hb y Ho)' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 5.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Grupo sanguíneo y factor RH' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 4.00, 5.00, 4.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Examen de orina completa' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Hemoglobina' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Reticulocitos' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Constantes corpusculares' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Colesterol' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 4.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Triglicéridos' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 17.50, 20.00, 17.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Perfil lipídico completo (C-T-HLD-VLDL-LDL)' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 5.00, 6.00, 5.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Urea' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 5.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Creatinina' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 8.00, 6.00, 8.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Fosfatasa alcalina' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 6.00, 6.00, 6.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Ácido úrico' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 8.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Amilasa' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 45.00, 39.00, 45.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Vitamina B12' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 20.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Coprocultivo' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 29.00, 28.00, 29.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'T3' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 29.00, 28.00, 29.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'T4' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 29.00, 28.00, 29.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'T4 LIBRE' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 8.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Tiempo de coagulación y sangría' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 10.00, 9.00, 10.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Fibrinógeno' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 3.50, 8.00, 3.50, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'KOH en uñas' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 12.00, 9.00, 12.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'RPR/VDRL' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 20.00, 12.00, 20.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Prueba de embarazo cualitativo ( BHCG cualitativo)' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 14.00, 14.00, 14.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Factor reumatoide' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 30.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Hemoglobina glicosilada' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 30.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Insulina basal' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 35.00, 32.00, 35.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Proteína C reactiva' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 15.00, 10.00, 15.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Test de Graham' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 18.00, 18.00, 18.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Cocaína - marihuana (2 drogas)' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 110.00, 115.00, 110.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Cromo en orina' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 125.00, 130.00, 125.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Cromo en orina' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 165.00, 170.00, 165.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Influenza cepa 2024' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 70.00, 70.00, 70.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Tetanos' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 145.00, 145.00, 145.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'FIEBRE AMARILLA' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);
INSERT INTO `examen_precio` (`examen_id`, `sede_id`, `precio`, `precio_hasta_15`, `precio_desde_16`, `vigente_desde`)
SELECT id, NULL, 155.00, 145.00, 155.00, @vigente FROM examenes WHERE id = (SELECT id FROM examenes WHERE nombre = 'Hepatitis A' AND identificador IS NULL LIMIT 1) LIMIT 1
  ON DUPLICATE KEY UPDATE
    `precio`           = VALUES(`precio`),
    `precio_hasta_15`  = VALUES(`precio_hasta_15`),
    `precio_desde_16`  = VALUES(`precio_desde_16`),
    `vigente_desde`    = VALUES(`vigente_desde`);

COMMIT;

-- Verificación rápida (no rompe la transacción):
-- SELECT (SELECT COUNT(*) FROM examenes WHERE activo=1) AS activos,
--        (SELECT COUNT(*) FROM examenes) AS totales,
--        (SELECT COUNT(*) FROM examen_precio WHERE sede_id IS NULL) AS precios_base,
--        (SELECT COUNT(*) FROM emo_categorias) AS categorias;
