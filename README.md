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
DB_NAME=tusaludDB
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:8081
```

**Nota:** Si tu MySQL no tiene contraseña, deja `DB_PASSWORD` vacío. Si tiene contraseña, escríbela sin comillas.

3. Crear la base de datos:
```bash
# Opción 1: Desde la línea de comandos
mysql -u root -p < database_schema.sql

# Opción 2: Si no tienes contraseña
mysql -u root < database_schema.sql

# Opción 3: Desde MySQL Workbench o phpMyAdmin
# Abre database_schema.sql y ejecuta todo el script
```

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
- `POST /api/empresas` - Crear empresa (requiere rol: manager, vendedor, medico)
- `PUT /api/empresas/:id` - Actualizar empresa (requiere rol: manager, vendedor, medico)
- `DELETE /api/empresas/:id` - Eliminar empresa (requiere rol: manager)

### Pacientes
- `GET /api/pacientes` - Listar pacientes (con filtros: `?search=`, `?empresa_id=`, `?estado=`)
- `GET /api/pacientes/:id` - Obtener paciente por ID
- `POST /api/pacientes` - Crear paciente (requiere rol: manager, vendedor, medico)
- `PUT /api/pacientes/:id` - Actualizar paciente (requiere rol: manager, vendedor, medico)
- `DELETE /api/pacientes/:id` - Eliminar paciente (requiere rol: manager)

### Cotizaciones
- `GET /api/cotizaciones` - Listar cotizaciones (con filtros: `?search=`, `?estado=`, `?empresa_id=`, `?paciente_id=`, `?fecha_desde=`, `?fecha_hasta=`)
- `GET /api/cotizaciones/:id` - Obtener cotización por ID (incluye detalles)
- `POST /api/cotizaciones` - Crear cotización (requiere rol: manager, vendedor)
- `PUT /api/cotizaciones/:id` - Actualizar cotización (requiere rol: manager, vendedor)
- `DELETE /api/cotizaciones/:id` - Eliminar cotización (requiere rol: manager, vendedor)

### Facturas
- `GET /api/facturas` - Listar facturas (con filtros: `?search=`, `?estado=`, `?empresa_id=`, `?paciente_id=`, `?fecha_desde=`, `?fecha_hasta=`)
- `GET /api/facturas/:id` - Obtener factura por ID (incluye detalles)
- `POST /api/facturas` - Crear factura (requiere rol: manager, vendedor)
- `PUT /api/facturas/:id` - Actualizar factura (requiere rol: manager, vendedor)
- `DELETE /api/facturas/:id` - Eliminar factura (requiere rol: manager, vendedor)

### Usuarios (Solo Manager)
- `GET /api/usuarios` - Listar usuarios (con filtros: `?search=`, `?rol=`, `?activo=`, `?fecha_creacion=today|recent`)
- `PUT /api/usuarios/:id/rol` - Actualizar rol de usuario
  - Body: `{ rol: 'medico' | 'manager' | 'vendedor' | 'cliente' }`
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
