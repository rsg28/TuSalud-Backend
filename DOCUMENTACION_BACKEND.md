# Documentación del Backend TuSalud

API REST para el **Sistema de Gestión Médica Ocupacional TuSalud**. Desarrollada con **Node.js**, **Express** y **MySQL**. El servidor está desplegado en una instancia **EC2** en la IP **54.235.48.67**.

---

## Autenticación JWT

Para usar la API es necesario **iniciar sesión** y obtener un **token JWT**. Sin ese token no podrás acceder al resto de rutas (recibirás error 401 o 403).

1. **Obtener el token:**  
   - **Registro:** `POST http://54.235.48.67:3000/api/auth/register` (body: `nombre_usuario`, `email`, `password`, `nombre_completo`, etc.)  
   - **Login:** `POST http://54.235.48.67:3000/api/auth/login` (body: `email`, `password`)  
   La respuesta incluye un `token`. Guárdalo.

2. **Usar las rutas:**  
   En cada petición a cualquier ruta protegida debes enviar el header:  
   `Authorization: Bearer <tu_token>`

Solo las rutas de registro, login y el health check son públicas; el resto requieren este header con un token válido.

### Requisitos de seguridad (leyenda)

En las tablas de rutas se indica para cada endpoint:

- **Público** — No requiere JWT ni rol. Cualquiera puede llamar.
- **JWT** — Requiere header `Authorization: Bearer <token>`. Cualquier usuario autenticado (cualquier rol) puede llamar.
- **JWT + Rol** — Requiere JWT y además que el usuario tenga uno de los roles indicados (p. ej. `manager`, `vendedor`, `cliente`). Si el token es válido pero el rol no coincide, recibirás 403.

Roles en el sistema: `manager`, `vendedor`, `cliente`.

**De dónde sale el rol:** El middleware no usa el rol guardado dentro del JWT. Primero verifica el token, obtiene el `userId`, carga el usuario desde la base de datos (incluido su `rol` actual) y lo pone en `req.user`. `requireRole` comprueba `req.user.rol`.

## Rutas (endpoints)

**URL base:** `http://54.235.48.67:3000`

### Probar conexión

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/health` | **Público** |

Usa este endpoint para comprobar que el servidor está activo y puedes conectarte. No requiere token.

---

### Raíz

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/` | **Público** |

---

### Auth — `/api/auth`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| POST | `http://54.235.48.67:3000/api/auth/register` | **Público** |
| POST | `http://54.235.48.67:3000/api/auth/login` | **Público** |
| GET | `http://54.235.48.67:3000/api/auth/me` | **JWT** |

---

### Empresas — `/api/empresas`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/empresas` | **JWT** |
| GET | `http://54.235.48.67:3000/api/empresas/mias` | **JWT** |
| GET | `http://54.235.48.67:3000/api/empresas/:id` | **JWT** |
| POST | `http://54.235.48.67:3000/api/empresas` | **JWT +** rol: manager, vendedor o cliente |
| PUT | `http://54.235.48.67:3000/api/empresas/:id` | **JWT +** rol: manager o vendedor |
| DELETE | `http://54.235.48.67:3000/api/empresas/:id` | **JWT +** rol: manager |

---

### Sedes — `/api/sedes`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/sedes` | **JWT** |

---

### Pacientes — `/api/pacientes` 
---- No terminado. Se implementara cuando el rol de medico este listo

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/pacientes` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pacientes/:id` | **JWT** |
| POST | `http://54.235.48.67:3000/api/pacientes` | **JWT +** rol: manager, vendedor o cliente |
| PUT | `http://54.235.48.67:3000/api/pacientes/:id` | **JWT +** rol: manager, vendedor o cliente |
| PUT | `http://54.235.48.67:3000/api/pacientes/:id/examen` | **JWT +** rol: manager, vendedor o cliente |
| DELETE | `http://54.235.48.67:3000/api/pacientes/:id` | **JWT +** rol: manager o vendedor |

---

### Usuarios — `/api/usuarios`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/usuarios` | **JWT +** rol: manager |
| PUT | `http://54.235.48.67:3000/api/usuarios/:id/rol` | **JWT +** rol: manager |
| PUT | `http://54.235.48.67:3000/api/usuarios/:id/activo` | **JWT +** rol: manager |

---

### Pedidos — `/api/pedidos`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/pedidos` | **JWT +** rol: vendedor o manager |
| GET | `http://54.235.48.67:3000/api/pedidos/mios` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/pendientes-aprobacion` | **JWT +** rol: manager |
| GET | `http://54.235.48.67:3000/api/pedidos/con-cotizacion-aprobada` | **JWT +** rol: vendedor o manager |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/estado` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/historial` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/cotizaciones` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/facturas` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/pacientes-examenes` | **JWT** |
| GET | `http://54.235.48.67:3000/api/pedidos/:pedido_id/pacientes-completados` | **JWT** |
| POST | `http://54.235.48.67:3000/api/pedidos` | **JWT +** rol: vendedor, manager o cliente |
| PATCH | `http://54.235.48.67:3000/api/pedidos/:pedido_id/estado` | **JWT +** rol: vendedor o manager |
| POST | `http://54.235.48.67:3000/api/pedidos/:pedido_id/examenes` | **JWT +** rol: vendedor o manager |
| POST | `http://54.235.48.67:3000/api/pedidos/:pedido_id/cancelar` | **JWT +** rol: vendedor, manager o cliente |

---

### Cotizaciones — `/api/cotizaciones`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/cotizaciones` | **JWT** |
| GET | `http://54.235.48.67:3000/api/cotizaciones/enviadas-al-manager` | **JWT +** rol: manager |
| GET | `http://54.235.48.67:3000/api/cotizaciones/:id` | **JWT** |
| GET | `http://54.235.48.67:3000/api/cotizaciones/:id/items` | **JWT** |
| POST | `http://54.235.48.67:3000/api/cotizaciones` | **JWT +** rol: manager, vendedor o cliente |
| PUT | `http://54.235.48.67:3000/api/cotizaciones/:id` | **JWT +** rol: manager, vendedor o cliente |
| PATCH | `http://54.235.48.67:3000/api/cotizaciones/:id/estado` | **JWT +** rol: manager, vendedor o cliente |
| DELETE | `http://54.235.48.67:3000/api/cotizaciones/:id` | **JWT +** rol: manager o vendedor |

---

### Facturas — `/api/facturas`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/facturas` | **JWT** |
| GET | `http://54.235.48.67:3000/api/facturas/:id` | **JWT** |
| POST | `http://54.235.48.67:3000/api/facturas` | **JWT +** rol: manager o vendedor |
| PUT | `http://54.235.48.67:3000/api/facturas/:id` | **JWT +** rol: manager o vendedor |
| POST | `http://54.235.48.67:3000/api/facturas/:id/enviar-cliente` | **JWT +** rol: manager o vendedor |
| DELETE | `http://54.235.48.67:3000/api/facturas/:id` | **JWT +** rol: vendedor |

---

### Precios — `/api/precios`

| Método | Endpoint | Requisitos |
|--------|----------|------------|
| GET | `http://54.235.48.67:3000/api/precios/matriz` | **JWT** |
| GET | `http://54.235.48.67:3000/api/precios/categorias` | **JWT** |
| GET | `http://54.235.48.67:3000/api/precios/categorias/:categoria/examenes` | **JWT** |
| GET | `http://54.235.48.67:3000/api/precios/buscar` | **JWT** |
| GET | `http://54.235.48.67:3000/api/precios/sede/:sede_id` | **JWT** |
| POST | `http://54.235.48.67:3000/api/precios/:solicitud_id/aprobar` | **JWT +** rol: manager |

---

## Ejemplo: probar con Postman (de cero a una ruta protegida)

Objetivo: llamar a **GET** `http://54.235.48.67:3000/api/usuarios` (solo permitido para rol **manager**). Hay que obtener antes un JWT con una cuenta que tenga ese rol.

### Paso 1 — Obtener el JWT (login)

1. En Postman, crea una petición **POST**.
2. URL: `http://54.235.48.67:3000/api/auth/login`
3. Pestaña **Body** → **raw** → tipo **JSON**. Cuerpo:
   ```json
   {
     "email": "manager@ejemplo.com",
     "password": "tu_contraseña"
   }
   ```
   (Sustituye por las credenciales de un usuario con rol manager que te haya dado el administrador.)
4. **Send**. En la respuesta verás algo como:
   ```json
   {
     "message": "Login exitoso",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
     "user": { "id": 1, "email": "...", "rol": "manager", ... }
   }
   ```
5. **Copia** el valor completo de `token` (el string largo).

### Paso 2 — Llamar a GET /api/usuarios con el token

1. Crea una petición **GET**.
2. URL: `http://54.235.48.67:3000/api/usuarios`
3. Pestaña **Authorization** → Type: **Bearer Token** → en **Token** pega el valor que copiaste en el paso 1.  
   (O en **Headers** añade: `Authorization` = `Bearer <tu_token>`.)
4. **Send**. Deberías recibir la lista de usuarios en JSON.

Si obtienes **401**: no enviaste el header o el token es inválido. Si obtienes **403**: el usuario no tiene rol manager.