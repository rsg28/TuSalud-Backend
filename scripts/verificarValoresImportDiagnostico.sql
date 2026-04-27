-- Comprueba en MySQL (RDS) los perfiles y exámenes típicos del import de prueba.
-- Sustituye :termino1 o edita las cadenas entre comillas. Charset utf8mb4.

-- --- Perfiles (nombres que vienen en el Excel de prueba) ---

-- Perfil 100% inventado: no debería existir
SELECT id, nombre, tipo
FROM emo_perfiles
WHERE INSTR(LOWER(nombre), LOWER('ZZZ_PERFIL_TOTALMENTE_INEXISTENTE_EN_BD')) > 0
ORDER BY id;

-- Conserje / inventariadores: debería existir si lo cargaste
SELECT id, nombre, tipo
FROM emo_perfiles
WHERE INSTR(LOWER(nombre), LOWER('ADMINISTRATIVOS CONSERJE INVENTARIADORES')) > 0
ORDER BY id;

-- Cuenta de mapeo por tipo EMO para un perfil concreto (cambia 123 por el id devuelto arriba)
-- SELECT m.tipo_emo, COUNT(*) AS n, GROUP_CONCAT(e.nombre ORDER BY e.nombre SEPARATOR ' | ') AS examenes
-- FROM emo_perfil_examenes m
-- JOIN examenes e ON e.id = m.examen_id
-- WHERE m.perfil_id = 123
-- GROUP BY m.tipo_emo
-- ORDER BY m.tipo_emo;

-- --- Exámenes (adicionales en columna) ---

-- Triaje con detalle en paréntesis: busca por subcadena (misma idea que el API)
SELECT id, nombre, codigo, activo
FROM examenes
WHERE activo = 1
  AND (INSTR(LOWER(nombre), LOWER('TRIAJE')) > 0 OR INSTR(LOWER(IFNULL(codigo, '')), LOWER('TRIAJE')) > 0)
ORDER BY nombre
LIMIT 40;

-- Código de prueba negativa (ficticio)
SELECT id, nombre, codigo, activo
FROM examenes
WHERE activo = 1
  AND (INSTR(LOWER(nombre), LOWER('XXX_ESTUDIO_FICTICIO')) > 0 OR INSTR(LOWER(IFNULL(codigo, '')), LOWER('XXX_ESTUDIO_FICTICIO')) > 0)
ORDER BY nombre
LIMIT 40;
