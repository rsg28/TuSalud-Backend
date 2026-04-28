-- Agrega campo grupo_empresarial a la tabla empresas.
-- Un texto libre (ej. "Grupo Hochschild", "Corporación Pesquera Inca") que permite
-- agrupar varias empresas bajo un nombre compartido en el flujo de cotizaciones.
ALTER TABLE `empresas`
  ADD COLUMN `grupo_empresarial` varchar(255) DEFAULT NULL
    COMMENT 'Nombre del grupo o holding al que pertenece esta empresa (opcional)'
  AFTER `razon_social`;
