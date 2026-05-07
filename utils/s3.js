/**
 * TuSalud — Cliente S3 para respaldo de archivos subidos.
 *
 * Configuración por env:
 *   AWS_REGION             ej. us-east-1 (debe coincidir con la región del bucket).
 *   AWS_S3_BUCKET          nombre del bucket; sin esta variable el respaldo S3
 *                          queda desactivado (modo legacy).
 *   AWS_S3_KEY_PREFIX      prefijo opcional dentro del bucket (ej. "uploads/").
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY  Si la app corre en EC2 con un IAM role attached,
 *                          puedes omitirlas: el SDK usa el role automáticamente.
 *
 * Uso:
 *   const { isEnabled, uploadBuffer, getPresignedDownloadUrl } = require('./utils/s3');
 *   if (isEnabled()) {
 *     const r = await uploadBuffer(buf, { keyHint: 'pdf-perfil-tablas/foo.pdf', contentType: 'application/pdf' });
 *     // r => { key, etag, versionId, bucket, region }
 *   }
 */

const crypto = require('crypto');
const path = require('path');

let s3ClientSingleton = null;
let presignerSingleton = null;
let _aws = null; // require diferido para que el módulo sea cargable aunque falte el paquete

function loadAwsLazily() {
  if (_aws) return _aws;
  try {
    const s3 = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    _aws = { s3, presigner };
    return _aws;
  } catch (e) {
    const msg = String(e?.message || e);
    if (e?.code === 'MODULE_NOT_FOUND') {
      console.warn(
        '[s3] @aws-sdk/client-s3 no instalado. Backups a S3 desactivados. ' +
          'En el servidor: cd TuSalud-Backend && npm install && reiniciar Node.'
      );
      return null;
    }
    throw e;
  }
}

function getRegion() {
  return (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '').trim() || null;
}

function getBucket() {
  return (process.env.AWS_S3_BUCKET || '').trim() || null;
}

function getKeyPrefix() {
  let p = (process.env.AWS_S3_KEY_PREFIX || 'uploads/').trim();
  if (!p) return '';
  if (!p.endsWith('/')) p = `${p}/`;
  return p.replace(/^\/+/, '');
}

/** ¿Está configurado el respaldo a S3 en este entorno? */
function isEnabled() {
  if (!getBucket() || !getRegion()) return false;
  return !!loadAwsLazily();
}

function getClient() {
  if (s3ClientSingleton) return s3ClientSingleton;
  const aws = loadAwsLazily();
  if (!aws) return null;
  const region = getRegion();
  if (!region) return null;
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  // Si no hay keys explícitas, dejamos que el SDK use el credential provider
  // chain (perfecto para EC2 con IAM role).
  const cfg = { region };
  if (accessKeyId && secretAccessKey) {
    cfg.credentials = { accessKeyId, secretAccessKey };
  }
  s3ClientSingleton = new aws.s3.S3Client(cfg);
  return s3ClientSingleton;
}

/**
 * Genera un key seguro para S3 a partir de un nombre original. Mantiene la
 * extensión, sanitiza el nombre, antepone fecha y un sufijo aleatorio para
 * evitar colisiones.
 *
 * @param {string} [keyHint]  Nombre original del archivo o subdirectorio sugerido.
 * @returns {string}
 */
function buildSafeKey(keyHint) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const fechaPrefix = `${yyyy}/${mm}/${dd}`;
  const nonce = crypto.randomBytes(6).toString('hex');

  let original = String(keyHint || '').trim();
  let dirHint = '';
  // Si el hint trae carpetas (ej. "import/foo.pdf"), preservamos la primera carpeta.
  if (original.includes('/')) {
    const parts = original.split('/').filter(Boolean);
    dirHint = parts.slice(0, parts.length - 1).join('/');
    original = parts[parts.length - 1];
  }
  const ext = path.extname(original).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
  let base = path.basename(original, ext);
  base = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'archivo';
  const prefijo = getKeyPrefix();
  const carpeta = [prefijo + fechaPrefix, dirHint].filter(Boolean).join('/');
  return `${carpeta}/${base}_${nonce}${ext}`;
}

/** SHA-256 hex del buffer. */
function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Sube un Buffer a S3 y devuelve metadatos.
 *
 * @param {Buffer} buffer
 * @param {object} [opts]
 * @param {string} [opts.keyHint]      Pista para construir el key.
 * @param {string} [opts.contentType]  ej. 'application/pdf'.
 * @param {Record<string,string>} [opts.metadata]  Pares clave→valor que se
 *   guardan como metadata del objeto S3 (visibles desde la consola).
 * @returns {Promise<{ key:string, bucket:string, region:string, etag:string|null, versionId:string|null, sha256:string, size:number }>}
 */
async function uploadBuffer(buffer, opts = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('uploadBuffer: buffer vacío o inválido');
  }
  const aws = loadAwsLazily();
  if (!aws) throw new Error('AWS SDK no instalado en el backend');
  const bucket = getBucket();
  const region = getRegion();
  if (!bucket || !region) throw new Error('AWS_S3_BUCKET / AWS_REGION no configurados');

  const client = getClient();
  if (!client) throw new Error('No se pudo construir el cliente S3');

  const key = buildSafeKey(opts.keyHint);
  const sha = sha256Hex(buffer);

  const cmd = new aws.s3.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: opts.contentType || 'application/octet-stream',
    Metadata: {
      sha256: sha,
      ...(opts.metadata || {}),
    },
    ServerSideEncryption: 'AES256',
  });

  const out = await client.send(cmd);
  return {
    key,
    bucket,
    region,
    etag: out?.ETag ? String(out.ETag).replace(/"/g, '') : null,
    versionId: out?.VersionId || null,
    sha256: sha,
    size: buffer.length,
  };
}

/**
 * Genera una URL firmada (HTTP GET) para descargar un objeto. Útil para el
 * panel de auditoría: el manager puede ver el archivo original que subió el
 * cliente sin exponer el bucket públicamente.
 *
 * @param {string} key
 * @param {object} [opts]
 * @param {number} [opts.expiresSeconds=300]  Validez de la URL (segundos).
 * @returns {Promise<string>}
 */
async function getPresignedDownloadUrl(key, opts = {}) {
  const aws = loadAwsLazily();
  if (!aws) throw new Error('AWS SDK no instalado en el backend');
  const bucket = getBucket();
  if (!bucket) throw new Error('AWS_S3_BUCKET no configurado');
  const client = getClient();
  if (!client) throw new Error('No se pudo construir el cliente S3');

  if (!presignerSingleton) presignerSingleton = aws.presigner;

  const cmd = new aws.s3.GetObjectCommand({ Bucket: bucket, Key: key });
  const expiresIn = Math.max(60, Math.min(3600, Number(opts.expiresSeconds || 300) || 300));
  return presignerSingleton.getSignedUrl(client, cmd, { expiresIn });
}

module.exports = {
  isEnabled,
  uploadBuffer,
  getPresignedDownloadUrl,
  buildSafeKey,
  sha256Hex,
  getBucket,
  getRegion,
};
