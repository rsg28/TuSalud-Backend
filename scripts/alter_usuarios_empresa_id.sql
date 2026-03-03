-- =============================================================================
-- Migración: agregar usuarios.empresa_id (solo cliente tiene una empresa)
-- Solo rol cliente usa esta columna; vendedor/manager la tienen en NULL.
-- Ejecutar en bases que ya tienen el esquema sin esta columna.
-- =============================================================================

-- 1. Agregar columna (NULL: vendedor/manager no tienen empresa; cliente puede tener NULL hasta que cree una)
ALTER TABLE usuarios
  ADD COLUMN empresa_id INT NULL COMMENT 'Empresa del cliente (1:1). Solo para rol cliente; vendedor/manager = NULL.'
  AFTER activo;

-- 2. FK a empresas (ON DELETE SET NULL para no borrar el usuario si se elimina la empresa)
ALTER TABLE usuarios
  ADD CONSTRAINT fk_usuarios_empresa
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL;

-- Listo. Todas las filas quedan con empresa_id = NULL.
-- Cuando un cliente cree una empresa desde la app, el backend hará UPDATE usuarios SET empresa_id = ? WHERE id = ?.

-- -----------------------------------------------------------------------------
-- (Opcional) Si más adelante quieres rellenar empresa_id desde usuario_empresa:
--
-- UPDATE usuarios u
-- INNER JOIN (
--   SELECT ue.usuario_id,
--          COALESCE(
--            MAX(CASE WHEN ue.es_principal = 1 THEN ue.empresa_id END),
--            MIN(ue.empresa_id)
--          ) AS empresa_id
--   FROM usuario_empresa ue
--   GROUP BY ue.usuario_id
-- ) sel ON u.id = sel.usuario_id
-- SET u.empresa_id = sel.empresa_id;
-- -----------------------------------------------------------------------------
