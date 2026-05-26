# Comparativa de costos — Mensajería saliente TuSalud (2026)

> Caso de uso: notificar al vendedor que un cliente subió una cotización y
> esperar `APROBAR` / `RECHAZAR` por la misma vía. Volumen estimado: cientos
> de clientes activos, ~1 a 5 cotizaciones por día por vendedor, picos
> mensuales de 500 – 5 000 conversaciones salientes.

Todas las cifras son **referenciales (USD)**, tomadas de los pricing oficiales
en mayo 2026. Conviene reconfirmarlas en la página del proveedor justo antes
de firmar el contrato, porque los precios de WhatsApp cambian con frecuencia y
varían por país de destino.

---

## 1. Tabla resumen — costo por mensaje en Perú (destino +51)

| Proveedor | Canal | Costo por mensaje/conversación (PE) | Costo emisor mensual | Setup mínimo |
|---|---|---|---|---|
| **Meta WhatsApp Cloud API** (directo) | WhatsApp | **$0.0146** por conversación marketing · **$0.005** utility · gratis las primeras 1 000 service/mes | $0 | App en developers.facebook.com + número verificado (puede ser un fijo o un móvil) |
| **Twilio WhatsApp** | WhatsApp | **~$0.0094** Twilio fee + el costo de conversación de Meta (~$0.005-0.0146) ≈ **$0.014 – $0.024** | $0 (sandbox) o ~$2.5 (número) | Cuenta Twilio + cuenta Meta WhatsApp |
| **Twilio SMS** | SMS | **$0.0500** por segmento (160 chars GSM) hacia Perú | ~$1.00/mes por número (long code) o ~$2/mes (short code US) | Número SMS con caps internacionales habilitados |
| **Telegram Bot API** | Telegram | **$0** | $0 | Crear bot con @BotFather; el vendedor inicia chat con el bot |
| **Email transaccional (Resend)** | Email | $0 hasta 3 000/mes, luego $0.0004 | $20/mes Pro plan opcional | Dominio verificado (ya lo tenemos) |
| **Baileys (WhatsApp no oficial)** | WhatsApp | $0 | $0 | Servidor con sesión QR + riesgo de baneo |

> **Conversación** = ventana de 24h entre tu número y el destinatario para el
> mismo "category" (marketing, utility o service). Si en esa ventana mandas
> 1 o 50 mensajes, te cobran 1 sola conversación.

---

## 2. Costo mensual estimado por volumen

Asumiendo que cada solicitud de cotización abre **una sola conversación**
(el bot envía el aviso + el vendedor responde APROBAR/RECHAZAR + bot
confirma). Si la conversación es la primera del mes con ese vendedor cuenta
como `utility`; ese es el escenario más común en nuestro flujo.

### Volumen bajo: 400 mensajes/mes (≈ 13 cotizaciones por día)

| Proveedor | Cálculo | **Total / mes** |
|---|---|---|
| Meta Cloud API (utility, sin pasar 1 000 service free) | 400 × $0.005 | **$2.00** |
| Twilio WhatsApp | 400 × $0.014 | $5.60 |
| Twilio SMS | 400 × $0.05 + $1 número | $21.00 |
| Telegram | 400 × $0 | $0 |
| Email | 400 × $0 | $0 |

### Volumen medio: 1 500 mensajes/mes (≈ 50 / día)

| Proveedor | Cálculo | **Total / mes** |
|---|---|---|
| Meta Cloud API | 1 500 × $0.005 | **$7.50** |
| Twilio WhatsApp | 1 500 × $0.014 | $21.00 |
| Twilio SMS | 1 500 × $0.05 + $1 | $76.00 |
| Telegram | gratis | $0 |
| Email | gratis (dentro del plan free) | $0 |

### Volumen alto: 5 000 mensajes/mes (≈ 165 / día)

| Proveedor | Cálculo | **Total / mes** |
|---|---|---|
| Meta Cloud API | 5 000 × $0.005 | **$25.00** |
| Twilio WhatsApp | 5 000 × $0.014 | $70.00 |
| Twilio SMS | 5 000 × $0.05 + $1 | $251.00 |
| Telegram | gratis | $0 |
| Email | 3 000 free + 2 000 × $0.0004 + $20 plan Pro (opcional) | $0.80 – $20.80 |

### Volumen muy alto: 20 000 mensajes/mes (escenario futuro)

| Proveedor | Cálculo | **Total / mes** |
|---|---|---|
| Meta Cloud API | 20 000 × $0.005 | **$100.00** |
| Twilio WhatsApp | 20 000 × $0.014 | $280.00 |
| Twilio SMS | 20 000 × $0.05 + $1 | $1 001.00 |
| Telegram | gratis | $0 |

---

## 3. Comparativa cualitativa

| Criterio | Meta Cloud API | Twilio WhatsApp | Twilio SMS | Telegram | Baileys |
|---|---|---|---|---|---|
| **Costo a 5 000 msg/mes** | $25 | $70 | $251 | $0 | $0 (+ servidor) |
| **Soporte oficial** | Directo Meta | Sí | Sí | Sí (no comercial) | **No** |
| **Riesgo de baneo** | Bajo | Bajo | N/A | Bajo | **Alto** |
| **Multinumero (varios vendedores con número propio)** | Sí, ilimitado | Sí, $1-3/número/mes | Sí, $1+/número/mes | Sí | Sí, 1 sesión por dispositivo |
| **Plantillas pre-aprobadas obligatorias** | Sí (primer mensaje fuera de 24h) | Sí | No | No | No |
| **Recibe documentos / fotos** | Sí | Sí | No | Sí | Sí |
| **Adjuntar XLSX en el mensaje** | Sí (link público hasta 100 MB) | Sí | **No** (solo MMS, $0.10+ y sin Perú) | Sí | Sí |
| **Latencia entrega** | Segundos | Segundos | 5-30 s en intl. | Segundos | Segundos |
| **Webhook unificado** | Sí (mensajes + statuses en una URL) | No (URLs separadas) | No | Sí | Sí |
| **Idoneidad enterprise** | Alta | Alta | Media | Media (no oficial WA) | **Baja** |

---

## 4. Análisis para TuSalud

### Por qué arrancamos con Meta Cloud API

1. **Costo absoluto más bajo entre proveedores oficiales.** A 5 000
   mensajes/mes Meta cuesta `$25` vs `$70` de Twilio WhatsApp — un ahorro
   de **64 %** y la diferencia escala linealmente.
2. **No exige alquilar un "from number".** Twilio cobra alquiler por cada
   número adicional; Meta no.
3. **Escalable a N vendedores:** podés registrar tantos números como
   vendedores quieras dentro de la misma WhatsApp Business Account
   (limita Meta solo por cuotas de mensajería, que se pueden subir).
4. **Webhook único** para mensajes entrantes y status de delivery → menos
   superficie de integración.
5. El cliente final no necesita instalar nada nuevo: ya tiene WhatsApp.

### Cuándo conviene mantener Twilio (futuro, no ahora)

- Si decidimos volver a habilitar el **fallback automático a SMS** cuando
  un vendedor pierde conexión: Twilio SMS sigue siendo el camino más
  simple. Hoy ya lo dejamos cableado en código (`provider=twilio`), solo
  hay que setear `TWILIO_SMS_FROM`. Lo postergamos por costo.
- Si en algún momento queremos enviar a usuarios fuera de Perú/USA con
  reglas locales especiales (LATAM, Asia) y queremos delegar
  compliance/numeración a un solo proveedor.

### Cuándo NO conviene Baileys

- Es WhatsApp **no oficial** (lib basada en ingeniería inversa). Una sola
  campaña agresiva puede tumbar el número y, peor, el celular del vendedor
  asociado. No es opción para una empresa con cientos de clientes.

### Email/Telegram como complemento

- **Email**: lo seguimos enviando para confirmaciones y para clientes que
  no quieren WhatsApp.
- **Telegram**: opción "gratis total" si algún vendedor prefiere ese canal.
  Requiere que el vendedor inicie el chat con el bot. Si más adelante
  vemos que los vendedores la pasan bien con Telegram, podemos agregar
  un provider `telegram` con la misma interfaz que `meta.js` (es trivial,
  la API también es HTTP/JSON).

---

## 5. Recomendación final

| Etapa | Provider primario | Provider secundario | Costo aprox. |
|---|---|---|---|
| **Hoy** (lo que dejamos implementado) | Meta Cloud API | — (SMS apagado) | ~$2 – $25/mes |
| **Cuando haya quejas de "no llegó"** | Meta Cloud API | Twilio SMS fallback (cableado, solo habilitar `TWILIO_SMS_FROM` y `WHATSAPP_SMS_FALLBACK_ENABLED=true`) | ~$5 – $40/mes |
| **Escala 20 k+ msg/mes** | Meta Cloud API con plantillas marketing optimizadas | Mantener SMS solo para vendedores en zonas sin internet | ~$100 – $150/mes |

---

## 6. Cómo cambiar de proveedor en el código

La capa `services/whatsapp/index.js` selecciona el proveedor según
`WHATSAPP_PROVIDER`:

```bash
# Producción (recomendado):
WHATSAPP_PROVIDER=meta

# Sandbox de Twilio para probar:
WHATSAPP_PROVIDER=twilio

# Apagar envío real (dev):
WHATSAPP_PROVIDER=null
```

No hay otra parte del backend que necesite cambiar; toda la lógica de
cotizaciones llama a `getProvider().sendMessage()` o `.sendTemplate()` y
recibe webhooks por la misma ruta `/api/whatsapp/webhook`.

---

## 7. Cómo agregar más números (paso a paso)

La pregunta clave es: ¿qué número aparece como **remitente** del WhatsApp que reciben los vendedores/clientes? Hoy es un número único (sandbox de Twilio en pruebas, o un número de empresa cuando produzcamos). Si quieres tener varios — por ejemplo un número por sede, un número por línea de negocio, o un número distinto para mensajes administrativos vs. comerciales — depende del provider.

### 7.1 Mientras estés en Twilio Sandbox (estado actual)

El sandbox es **un único número compartido por Twilio para todos los desarrolladores** (`+1 415 523 8886`). No se puede cambiar ni agregar números en sandbox. Lo que sí puedes hacer:

**Agregar más destinatarios al sandbox (cada usuario de prueba se auto-suscribe):**

1. El usuario abre WhatsApp y envía `join <dos-palabras>` al `+1 415 523 8886`.
2. El código `<dos-palabras>` lo ves en la consola: <https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn>.
3. Twilio responde *"You are all set!"* y queda suscrito por 72 h sin actividad (ó indefinidamente si sigue chateando con el sandbox).
4. Verifica el cel registrado en "Sandbox Participants" en la misma consola.

> **Limitaciones del sandbox**: solo soporta plantillas de Twilio pre-aprobadas para iniciar conversación, y los mensajes salen con prefijo *"Sandbox:"*. Para producción real, salta al punto 7.2.

### 7.2 Agregar números en Twilio (producción)

Cada número Twilio se compra/asigna a la cuenta y se asocia a un **WhatsApp Sender** vía Twilio + Meta. Cuesta dinero **por cada número** que sumes (no se comparte un único número entre varias líneas):

| Concepto | Costo |
|---|---|
| Alta del número WhatsApp en Twilio (one-time) | ~$25 USD |
| Renta mensual del número WhatsApp | ~$5 USD/mes |
| Mensajes (conversation pricing) | igual que cualquier provider Meta |

**Pasos para agregar un número adicional en Twilio:**

1. **Comprar/registrar el número** en Twilio Console → *Phone Numbers* → *Buy a Number* (o `Verified Caller IDs` si es un número tuyo propio).
2. **Crear un WhatsApp Sender** en *Messaging* → *Senders* → *WhatsApp Senders* → *Create new Sender*. Twilio te guía con un wizard que te conecta con Meta Business Manager para verificar la titularidad del número.
3. **Configurar el webhook** del nuevo sender apuntando a `https://api.tu-salud.xyz/api/whatsapp/webhook` y `https://api.tu-salud.xyz/api/whatsapp/status-callback` (igual que el del sandbox actual).
4. **Esperar la aprobación de Meta** (24-72 h normalmente).
5. **Cambiar la variable de entorno** en el backend para usar el nuevo número:

   ```ini
   TWILIO_WHATSAPP_FROM=whatsapp:+51XXXXXXXXX
   ```

   Reinicias el proceso con `pm2 restart all --update-env` y listo.

> Si quieres usar **varios números en paralelo** (no solo uno a la vez), no basta con cambiar la env var: hay que extender el provider (`services/whatsapp/twilio.js`) para que reciba el `from` por argumento. Ver punto 7.5.

### 7.3 Agregar números en Meta WhatsApp Cloud API

Meta es más permisivo: hasta **25 números por WhatsApp Business Account (WABA)** sin costo adicional por número (solo pagas conversation pricing). Cada número tiene su propio `phone_number_id`.

**Pasos:**

1. Entra a Meta Business Manager → *WhatsApp Manager* → *Phone Numbers* → *Add phone number*.
2. Verifica el número (SMS o llamada). El número **NO** debe estar registrado actualmente en la app de WhatsApp normal — Meta lo absorbe en su plataforma.
3. Te da un nuevo `WHATSAPP_PHONE_NUMBER_ID` que copias.
4. Si vas a usar plantillas de iniciación, solicita aprobación en *Message templates* (24-72 h por plantilla, por número).
5. Configura el webhook en *Configuration* → *Webhook* → *Edit* apuntando a `https://api.tu-salud.xyz/api/whatsapp/webhook`. El verify token es el mismo (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
6. En el backend, para alternar entre números, cambias:

   ```ini
   WHATSAPP_PHONE_NUMBER_ID=<id-del-nuevo-numero>
   WHATSAPP_ACCESS_TOKEN=<mismo-token-de-la-WABA>
   ```

   Reinicias y listo.

### 7.4 Verificar el número del negocio (Business Verification)

Para producción Meta exige verificar el negocio (no solo el número). Sin esto el límite de mensajes es 250/día y no puedes desbloquear plantillas marketing. Pasos:

1. *Business Manager* → *Settings* → *Business Info* → *Start Verification*.
2. Subes: ficha RUC SUNAT (Perú), comprobante de domicilio fiscal y, opcionalmente, un correo corporativo del dominio.
3. Meta verifica en 1-5 días hábiles. Si falla, lees el motivo en el inbox de Business Manager y corriges.
4. Una vez verificado, puedes solicitar el **Green Tick** (insignia verde de cuenta oficial) por separado — útil para clientes B2C porque transmite confianza.

### 7.5 Multi-from en el backend (si necesitas elegir número por contexto)

Hoy `services/whatsapp/twilio.js` y `services/whatsapp/meta.js` usan **un único número** leído de las env vars. Si en el futuro quieres elegir el número según la sede, el rol o la empresa, hay que extender la firma:

```js
provider.sendMessage({
  from: 'whatsapp:+51999111222', // ← nuevo
  to: 'whatsapp:+51987654321',
  body: '…',
});
```

Y el lookup del número correcto se haría en `whatsappController.js → resolverDestinatario()` agregando una columna `numero_whatsapp_origen` en `usuarios` o `sedes`, o un mapa estático en `services/whatsapp/numerosOrigen.js`. El cambio es chico (~30 líneas) pero requiere también extender el lado del provider para no romper la firma `sendMessage`.

**Cuándo conviene hacerlo:**

- Tienes vendedores en distintas regiones y quieres que el cliente vea un número local.
- Quieres separar marketing/notificaciones/transaccional para no quemar plantillas.
- Te impusieron límites por número (en Meta el límite es por número-rating: 1k → 10k → 100k → ilimitado, sube cuando demuestras calidad).

**Cuándo NO conviene**: si estás por debajo de ~5 k mensajes/mes con un único número, agregar más números solo te complica la operación.

### 7.6 Cheatsheet — ¿qué número uso hoy?

| Escenario | Provider | Variable que cambias | Costo extra |
|---|---|---|---|
| Probar el flujo end-to-end ya mismo | Twilio Sandbox | Ninguna (sandbox por defecto) | $0 |
| Mandar a clientes reales en Perú, número Twilio dedicado | Twilio | `TWILIO_WHATSAPP_FROM=whatsapp:+51…` | ~$5/mes + ~$25 alta |
| Lo mismo pero con Meta Cloud (recomendado largo plazo) | Meta | `WHATSAPP_PHONE_NUMBER_ID=…` + `WHATSAPP_ACCESS_TOKEN=…` | $0/mes de número |
| Múltiples sedes con números distintos | Meta + multi-from | Extensión de código (7.5) | $0/número en Meta |

---

## 8. Fuentes consultadas (mayo 2026)

- Meta WhatsApp Business Platform – Conversation pricing
  <https://developers.facebook.com/docs/whatsapp/pricing/>
- Twilio Messaging pricing – Perú/USA
  <https://www.twilio.com/en-us/messaging/pricing>
  <https://www.twilio.com/en-us/sms/pricing/pe>
- Resend pricing
  <https://resend.com/pricing>
- Telegram Bot API (gratuita por TOS)
  <https://core.telegram.org/bots/api>
