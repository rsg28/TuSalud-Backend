# TuSalud Backend API

Backend API para el sistema de gestión médica ocupacional TuSalud.

## Requisitos

- Node.js (v14 o superior)
- MySQL (v8.0 o superior)
- npm o yarn

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:

Crear el archivo `.env` en la raíz del proyecto con el siguiente contenido:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=          # Tu contraseña de MySQL (dejar vacío si no tiene)
DB_NAME=tusalud
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Solo desarrollo: desactivar JWT (no exige Authorization). Quitar o false en producción.
# DISABLE_JWT_AUTH=true
# AUTH_BYPASS_USER_ID=1
# AUTH_BYPASS_ROL=manager

# CORS Configuration
CORS_ORIGIN=http://localhost:8081
```

**Nota:** Si tu MySQL no tiene contraseña, deja `DB_PASSWORD` vacío. Si tiene contraseña, escríbela sin comillas.

3. Crear la base de datos:

El esquema oficial está en la carpeta `database/` del monorepo (raíz del proyecto TuSalud):

```bash
# Crear la base (si no existe)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tusalud;"

# Cargar el esquema MySQL (desde la raíz TuSalud, no desde TuSalud-Backend)
mysql -u root -p tusalud < database/tusalud_schema_mysql.sql
```

En servidor Linux (ej. EC2) con MySQL sin contraseña para root:
```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS tusalud;"
sudo mysql tusalud < /ruta/completa/database/tusalud_schema_mysql.sql
```

El archivo `database_schema.sql` en este backend solo contiene la referencia al script anterior.

4. Probar la conexión a la base de datos:
```bash
npm run test-db
```

Este comando verificará que la conexión a MySQL funcione correctamente. Si hay errores, te dará sugerencias para solucionarlos.

5. Iniciar el servidor:
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## Estructura del Proyecto

```
TuSalud-Backend/
├── config/
│   └── database.js          # Configuración de la base de datos
├── controllers/
│   ├── authController.js    # Autenticación y registro
│   ├── empresasController.js # CRUD de empresas
│   └── pacientesController.js # CRUD de pacientes
├── middleware/
│   └── auth.js              # Middleware de autenticación y autorización
├── routes/
│   ├── authRoutes.js        # Rutas de autenticación
│   ├── empresasRoutes.js     # Rutas de empresas
│   ├── pacientesRoutes.js    # Rutas de pacientes
│   └── usuariosRoutes.js     # Rutas de gestión de usuarios
├── database_schema.sql       # Esquema de la base de datos
├── server.js                 # Servidor principal
├── package.json
└── README.md
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuario
  - Body: `{ nombre_usuario, email, password, nombre_completo, telefono?, ruc?, tipo_ruc? }`
- `POST /api/auth/login` - Inicio de sesión
  - Body: `{ email, password }`
  - Returns: `{ token, user }`
- `GET /api/auth/me` - Obtener usuario actual (requiere autenticación)

### Empresas
- `GET /api/empresas` - Listar empresas (con filtros: `?search=`, `?estado=`, `?tipo_persona=`)
- `GET /api/empresas/:id` - Obtener empresa por ID
- `POST /api/empresas` - Crear empresa (requiere rol: manager, vendedor)
- `PUT /api/empresas/:id` - Actualizar empresa (requiere rol: manager, vendedor)
- `DELETE /api/empresas/:id` - Eliminar empresa (requiere rol: manager)

### Pacientes
- `GET /api/pacientes` - Listar pacientes (con filtros: `?search=`, `?empresa_id=`, `?estado=`)
- `GET /api/pacientes/:id` - Obtener paciente por ID
- `POST /api/pacientes` - Crear paciente por pedido (requiere rol: manager, vendedor, cliente)
- `PUT /api/pacientes/:id` - Actualizar paciente
- `PUT /api/pacientes/:id/examen` - Marcar examen completado
- `DELETE /api/pacientes/:id` - Eliminar paciente (requiere rol: manager, vendedor)

### Pedidos
- `GET /api/pedidos` - Listar pedidos (filtros: `?estado=`, `?empresa_id=`, `?vendedor_id=`, `?page=`, `?limit=`)
- `GET /api/pedidos/:pedido_id` - Obtener pedido (exámenes, cotizaciones, factura, pacientes, historial)
- `POST /api/pedidos` - Crear pedido (body: empresa_id, sede_id, observaciones, condiciones_pago, examenes: [{ examen_id, cantidad }])
- `GET /api/pedidos/:pedido_id/historial` - Historial del pedido
- `POST /api/pedidos/:pedido_id/examenes` - Agregar examen al pedido (estado PENDIENTE)
- `POST /api/pedidos/:pedido_id/listo-cotizacion` - Marcar listo para cotización
- `POST /api/pedidos/:pedido_id/empleados` - Cargar empleados (body: empleados: [{ dni, nombre_completo, cargo?, area?, examenes? }])
- `POST /api/pedidos/:pedido_id/completado` - Marcar pedido completado

### Cotizaciones (por pedido)
- `GET /api/cotizaciones` - Listar (filtros: `?pedido_id=`, `?estado=`, `?empresa_id=`)
- `GET /api/cotizaciones/:id` - Obtener cotización con items
- `POST /api/cotizaciones` - Crear (body: pedido_id, items: [{ examen_id, nombre, cantidad, precio_base, precio_final }], es_complementaria?, cotizacion_base_id?)
- `PUT /api/cotizaciones/:id` - Actualizar (estado, items si BORRADOR)
- `DELETE /api/cotizaciones/:id` - Eliminar (solo BORRADOR)

### Seguimiento clínico de pacientes (tracking de exámenes tomados)

A cada paciente de un pedido se le asignan N exámenes (vía `paciente_examen_asignado`). El manager y el vendedor pueden ir marcando, examen por examen, el resultado real: **COMPLETADO**, **AUSENTE**, **NO_REALIZADO** o **POSPUESTO**. La columna `estado` vive en `paciente_examen_asignado` y todo cambio queda auditado en `paciente_examen_historial`.

La cotización facturada **no se modifica automáticamente** ante ausencias: el backend solo expone un endpoint de *ajustes sugeridos* y el manager decide si genera una cotización complementaria negativa.

#### Endpoints

| Método | Ruta | Rol | Notas |
|---|---|---|---|
| GET | `/api/pedidos/:pedido_id/pacientes-examenes` | autenticado | Lista pacientes con exámenes y conteos por estado |
| GET | `/api/pedidos/:pedido_id/ajustes-sugeridos` | manager / vendedor | Monto sugerido por los exámenes no realizados |
| PUT | `/api/pacientes/:id/examen` | manager / vendedor | Cambia el estado de un examen (`{ examen_id, estado, motivo? }`) |
| POST | `/api/pacientes/:id/estado-masivo` | manager / vendedor | Aplica un estado a TODOS los exámenes pendientes (típico: `AUSENTE`) |
| GET | `/api/pacientes/:id/historial-examenes` | manager / vendedor | Timeline de transiciones de estado del paciente |
| POST | `/api/integraciones/examen-evento` | API key | Webhook para sistemas externos (laboratorio del jefe). Idempotente por `referencia_externa` |

#### Integración con sistema externo (API del jefe)

El endpoint `POST /api/integraciones/examen-evento` está pensado para que un laboratorio o ERP nos empuje eventos de toma de muestras sin pasar por la UI.

- **Autenticación**: `Authorization: Bearer <token>` o `X-API-Key: <token>`. El token se guarda hasheado en `integraciones_api_keys`; el plano nunca se almacena.
- **Idempotencia**: si llega el mismo `referencia_externa` dos veces, la segunda llamada no hace nada (devuelve `idempotent: true`).
- **Payload mínimo**:

```jsonc
{
  "referencia_externa": "evt-2026-05-25-001",
  "evento": "EXAMEN_TOMADO",      // o "PACIENTE_AUSENTE", "EXAMEN_NO_REALIZADO", ...
  "paciente": { "dni": "12345678" },   // alternativa: { "id": 42 }
  "examen":   { "codigo": "AUD-01" },  // alternativa: { "id": 78 } o { "nombre": "Audiometría" }
  "motivo": "Tomado en sede norte"     // opcional
}
```

Para dar de alta una API key:

```sql
-- Generar token aleatorio de 32 chars y guardar su SHA-256:
INSERT INTO integraciones_api_keys (nombre, token_hash, scope)
VALUES ('Sistema laboratorio jefe', SHA2('TOKEN_PLANO_AQUI', 256), 'examen-evento');
```

El token plano se entrega una sola vez al sistema externo; el backend solo guarda el hash.

#### Migración

```bash
node scripts/run-migration.cjs scripts/migration_seguimiento_examenes.sql
```

Crea: columna `estado` + metadata en `paciente_examen_asignado`, tabla `paciente_examen_historial`, tabla `integraciones_api_keys`. Hace backfill de las filas ya `COMPLETADO` desde `paciente_examen_completado` (que se mantiene como mirror legacy).

---

### WhatsApp (aprobación de cotizaciones)

Cuando un cliente sube un pedido con cotización (estado `ENVIADA`, creador `CLIENTE`), el backend notifica al WhatsApp del vendedor asignado (o al manager fallback) y espera una palabra clave. El vendedor responde `APROBAR` / `SI` / `OK` o `RECHAZAR` / `NO`; tras `RECHAZAR` el bot pide el motivo.

#### Proveedores soportados

| Provider | `WHATSAPP_PROVIDER` | Notas |
|---|---|---|
| **Meta Cloud API** (recomendado) | `meta` | Oficial, escalable a miles de números, sin alquiler de números. Costo aprox. $0.005-0.015 por conversación en Perú; primeras 1000 service/mes gratis. |
| **Twilio** | `twilio` | Sandbox gratis para pruebas. Permite fallback automático a SMS si el WhatsApp no se entrega (`undelivered`/`failed`). |
| **null** | `null` | Solo loggea, no envía. Útil en dev/tests. |

#### Endpoints

- `GET /api/whatsapp/webhook` — Handshake de verificación de Meta (responde con `hub.challenge` si el `verify_token` coincide). Twilio no lo usa.
- `POST /api/whatsapp/webhook` — Mensajes entrantes (y, para Meta, también status updates en el mismo POST). Verifica firma del proveedor (Meta: HMAC-SHA256; Twilio: HMAC-SHA1).
- `POST /api/whatsapp/status-callback` — Status callbacks separados de Twilio (no aplica a Meta). Dispara el fallback a SMS.
- `GET /api/whatsapp/archivo/:token` — Sirve el XLSX al proveedor para adjuntarlo (token con expiración).
- `POST /api/whatsapp/reenviar/:cotizacionId` — Reenvío manual (requiere rol manager o vendedor).

#### Pasos para Meta (recomendado)

1. Crear app en <https://developers.facebook.com> → tipo Business → Agregar producto **WhatsApp**.
2. Copiar `WHATSAPP_PHONE_NUMBER_ID` y un `WHATSAPP_ACCESS_TOKEN` permanente (System User).
3. En **App Settings → Basic** copiar el **App Secret** → `WHATSAPP_APP_SECRET`.
4. En **WhatsApp → Configuration → Webhooks**: callback `https://<dominio>/api/whatsapp/webhook`, verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Suscribirse a `messages`.
5. (Producción) Crear y aprobar una plantilla con 5 variables (nº cotización, empresa, nº pedido, ítems, total) y poner el nombre en `WHATSAPP_TEMPLATE_NUEVA_COTIZACION`.
6. Setear todas las variables en `.env` y reiniciar el backend.

#### Pasos para Twilio (alternativa con sandbox y SMS fallback)

1. Crear cuenta Twilio, copiar `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`.
2. Activar sandbox WhatsApp (`TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`).
3. Cada destinatario envía la palabra de "join" al sandbox.
4. (Opcional) Comprar un número SMS y ponerlo en `TWILIO_SMS_FROM` para habilitar el fallback automático.

#### Migraciones de base de datos (en orden)

```bash
node scripts/run-migration.cjs scripts/migration_whatsapp_aprobaciones.sql
node scripts/run-migration.cjs scripts/migration_whatsapp_sms_fallback.sql
```

Con `WHATSAPP_PROVIDER=null` o sin credenciales, el envío queda desactivado y las cotizaciones siguen aprobándose desde la app sin cambios.

### Facturas (por pedido)
- `GET /api/facturas` - Listar (filtros: `?pedido_id=`, `?estado=`, `?empresa_id=`)
- `GET /api/facturas/:id` - Obtener factura con cotizaciones y detalle
- `POST /api/facturas` - Crear factura para pedido (body: pedido_id) — incluye cotización principal y complementarias aprobadas
- `PUT /api/facturas/:id` - Actualizar (estado, fecha_pago)
- `DELETE /api/facturas/:id` - Eliminar (solo si no PAGADA)

### Usuarios (Solo Manager)
- `GET /api/usuarios` - Listar usuarios (con filtros: `?search=`, `?rol=`, `?activo=`, `?fecha_creacion=today|recent`)
- `PUT /api/usuarios/:id/rol` - Actualizar rol de usuario
  - Body: `{ rol: 'manager' | 'vendedor' | 'cliente' }`
- `PUT /api/usuarios/:id/activo` - Activar/desactivar usuario
  - Body: `{ activo: true | false }`

## Autenticación

Todas las rutas protegidas requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

## Ejemplo de Uso

### Registro
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_usuario": "juan.perez",
    "email": "juan@example.com",
    "password": "password123",
    "nombre_completo": "Juan Pérez"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Obtener Empresas
```bash
curl -X GET http://localhost:3000/api/empresas \
  -H "Authorization: Bearer <token>"
```

## Próximos Pasos

El backend actual incluye las funcionalidades básicas. Para completar el sistema, se pueden agregar:

- **Citas y Reservas**: Controladores y rutas para gestionar citas de pacientes
- **Evaluaciones Médicas**: Controladores para todas las tablas de evaluaciones (triaje, odontología, laboratorios, etc.)
- **Exámenes y Sedes**: Gestión del catálogo de exámenes y sedes
- **Expedientes**: Gestión de expedientes de pacientes
- **Reportes y Estadísticas**: Endpoints para generar reportes y estadísticas

## Notas

- El backend está diseñado para trabajar con el frontend React Native
- Todas las contraseñas se hashean con bcrypt
- Los tokens JWT expiran en 7 días por defecto
- La base de datos debe estar creada y configurada antes de iniciar el servidor
- Las transacciones se usan para operaciones que involucran múltiples tablas (cotizaciones, facturas)
- Los detalles de cotizaciones y facturas se eliminan automáticamente por CASCADE cuando se elimina el registro principal
