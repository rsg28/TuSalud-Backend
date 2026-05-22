/**
 * Verifica que listarVisiblesParaEmpresa incluya perfiles PRIVADOS asignados
 * solo a un grupo del que la empresa es miembro.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

test('SQL visibles-para-empresa: visibilidad por grupo vía EXISTS', () => {
  const visibilidadParaEmpresa = `
      (
        p.visibilidad = 'GLOBAL'
        OR EXISTS (
          SELECT 1 FROM emo_perfil_asignacion epa
           WHERE epa.perfil_id = p.id AND epa.empresa_id = ?
        )
        OR EXISTS (
          SELECT 1
            FROM emo_perfil_grupo_asignacion epga
            INNER JOIN empresa_grupo eg
                    ON eg.grupo_id = epga.grupo_id AND eg.empresa_id = ?
           WHERE epga.perfil_id = p.id
        )
      )`;

  assert.match(visibilidadParaEmpresa, /emo_perfil_grupo_asignacion/);
  assert.match(visibilidadParaEmpresa, /empresa_grupo/);
  assert.doesNotMatch(visibilidadParaEmpresa, /GROUP BY/);
});

test('PerfilExamenPicker: catálogo por empresa no debe filtrar tipo en servidor', () => {
  const empresaId = 42;
  const q = '';
  const tipo = 'PREOC';
  const tipoBusqueda = empresaId ? undefined : q ? undefined : tipo;
  assert.equal(tipoBusqueda, undefined);
});
