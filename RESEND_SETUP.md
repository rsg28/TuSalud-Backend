# Configuración de Resend para recuperar contraseña

El backend usa **Resend** para enviar el correo con el enlace de “Restablecer contraseña”. Sigue estos pasos para tenerlo operativo.

---

## 1. Crear cuenta en Resend

1. Entra en **[resend.com](https://resend.com)** y haz clic en **Sign up**.
2. Regístrate con tu email (o con Google/GitHub si lo ofrecen).
3. Verifica tu correo si te lo piden.

---

## 2. Obtener la API Key

1. En el panel de Resend, ve a **API Keys** (o **Developers → API Keys**).
2. Haz clic en **Create API Key**.
3. Pon un nombre (ej. `TuSalud producción`) y elige el permiso **Sending access** (o **Full access** si solo vas a enviar).
4. Copia la clave que te muestran (solo se muestra una vez).  
   Tiene forma: `re_xxxxxxxxxxxx`.

---

## 3. Dominio desde el que envías (remitente)

Resend exige un **dominio verificado** para enviar a direcciones que no sean la de prueba.

### Opción A: Usar el dominio de prueba (solo desarrollo)

- **From:** `onboarding@resend.dev`
- No hace falta verificar dominio.
- Solo recibirás correos en la dirección con la que te registraste en Resend.
- Útil para probar el flujo en local.

En tu `.env`:

```env
RESEND_API_KEY=re_tu_api_key
# No pongas RESEND_FROM_EMAIL; por defecto se usa onboarding@resend.dev
```

### Opción B: Tu propio dominio (producción)

1. En Resend: **Domains → Add Domain**.
2. Indica tu dominio (ej. `tusalud.com`).
3. Resend te dará registros DNS (SPF, DKIM, etc.). Añádelos en tu proveedor de dominio (donde gestionas el DNS).
4. Espera a que Resend marque el dominio como **Verified**.
5. El “from” será algo como: `TuSalud <noreply@tusalud.com>`.

En tu `.env`:

```env
RESEND_API_KEY=re_tu_api_key
RESEND_FROM_EMAIL=TuSalud <noreply@tusalud.com>
```

---

## 4. Variables de entorno en el backend

En el `.env` del backend (raíz del proyecto TuSalud-Backend) define:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `RESEND_API_KEY` | API Key de Resend (obligatoria para enviar) | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | (Opcional) Remitente del correo. Si no se pone, se usa `TuSalud <onboarding@resend.dev>`. | `TuSalud <noreply@tusalud.com>` |
| `FRONTEND_URL` | URL base de la app web/móvil (para armar el enlace de “Restablecer contraseña”). | `https://tu-salud.vercel.app` o `https://app.tusalud.com` |

Ejemplo mínimo:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://tu-salud.vercel.app
```

Si no pones `RESEND_API_KEY`, el endpoint `POST /api/auth/forgot-password` responderá **503** con el mensaje “Servicio de correo no disponible”.

---

## 5. Flujo en la aplicación

1. **Usuario en Login** → hace clic en “¿Olvidaste tu contraseña?”.
2. **Pantalla “Restablecer contraseña”** → escribe su email y pulsa “Enviar enlace”.
3. **Backend** (`POST /api/auth/forgot-password`):
   - Busca el usuario por email.
   - Genera un token JWT (válido 1 hora) con `userId` y `purpose: 'password_reset'`.
   - Construye la URL: `FRONTEND_URL/resetear-contrasena?token=...`
   - Envía un correo con Resend con ese enlace.
4. **Usuario** abre el correo y hace clic en el enlace → abre la app en **Nueva contraseña** con el `token` en la URL.
5. **Usuario** escribe la nueva contraseña y confirma → **Backend** (`POST /api/auth/reset-password`) valida el token y actualiza la contraseña.
6. Usuario puede **iniciar sesión** con la nueva contraseña.

---

## 6. Límites y buenas prácticas

- En el plan gratuito de Resend suele haber un **límite de envíos al día** (p. ej. 100). Revisa la web actual.
- No compartas `RESEND_API_KEY` ni la subas al repositorio (usa `.env` y mantén `.env` en `.gitignore`).
- En producción usa siempre un **dominio verificado** y un remitente claro (ej. `noreply@tusalud.com`).

Si algo falla, revisa los logs del backend (errores de Resend se registran con `console.error`) y en el panel de Resend la pestaña **Logs** para ver el estado de cada envío.
