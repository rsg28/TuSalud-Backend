/**
 * Busca una empresa existente por RUC o razón social, o crea una nueva fila.
 * Devuelve el id de empresa o lanza Error con mensaje para el cliente HTTP.
 */
async function resolveEmpresaId(connection, { razon_social, ruc, direccion, contacto }) {
  const rucSoloDigitos = (v) => String(v ?? '').replace(/\D/g, '');
  const rucValidoLongitud = (v) => {
    const d = rucSoloDigitos(v);
    return d.length >= 9 && d.length <= 11;
  };

  const razon = razon_social && String(razon_social).trim() ? String(razon_social).trim() : null;
  const rucVal = ruc && String(ruc).trim() ? rucSoloDigitos(ruc) : null;

  if (!razon) {
    const err = new Error('La razón social de la empresa es obligatoria');
    err.status = 400;
    throw err;
  }
  if (rucVal && !rucValidoLongitud(rucVal)) {
    const err = new Error('El RUC debe tener entre 9 y 11 dígitos');
    err.status = 400;
    throw err;
  }

  let empresaIdToSet = null;

  if (rucVal) {
    const [byRuc] = await connection.execute('SELECT id FROM empresas WHERE ruc = ?', [rucVal]);
    if (byRuc.length > 0) {
      empresaIdToSet = byRuc[0].id;
    }
  }
  if (empresaIdToSet == null) {
    const [byNombre] = await connection.execute(
      'SELECT id FROM empresas WHERE LOWER(TRIM(razon_social)) = LOWER(?)',
      [razon]
    );
    if (byNombre.length > 0) {
      empresaIdToSet = byNombre[0].id;
    }
  }
  if (empresaIdToSet == null) {
    const [result] = await connection.execute(
      `INSERT INTO empresas (razon_social, ruc, direccion, contacto) VALUES (?, ?, ?, ?)`,
      [
        razon,
        rucVal,
        direccion && String(direccion).trim() ? String(direccion).trim() : null,
        contacto && String(contacto).trim() ? String(contacto).trim() : null,
      ]
    );
    empresaIdToSet = result.insertId;
  }

  return empresaIdToSet;
}

module.exports = { resolveEmpresaId, rucSoloDigitos: (v) => String(v ?? '').replace(/\D/g, '') };
