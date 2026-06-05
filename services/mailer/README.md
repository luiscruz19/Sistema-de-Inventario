# mailer

Servicio de emails transaccionales canónico. Expone una API HTTP interna para envío de emails HTML, automatizaciones por plantilla, gestión de suscriptores (Mailchimp / MailerLite) y formularios de contacto. Diseñado para ser consumido por otros microservicios de la plataforma.

## Stack

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 22 (ESM) |
| Framework | Express 4 |
| SMTP | Nodemailer v8 |
| Newsletter | Mailchimp Marketing API v3 / MailerLite Node.js SDK v3 |
| Base de datos | Sequelize 6 + MySQL 8 (opcional, para email log) |
| Sanitización | sanitize-html v2 |
| Seguridad | Helmet, CORS, express-rate-limit, Basic Auth (timing-safe) |

---

## Variables de entorno

Copiar `.env.example` como `.env` y completar los valores.

### General

| Variable | Default | Descripción |
|---|---|---|
| `MAILER_PORT` | `80` | Puerto HTTP del servicio |
| `NODE_ENV` | `development` | Entorno (`development` / `production`) |
| `APP_NAME` | `Mi App` | Nombre de la aplicación, usado en asuntos y plantillas |
| `WEB_URL` | — | URL base del frontend (fallback de CORS) |
| `CORS_ALLOWED_ORIGINS` | — | Lista de orígenes separados por coma. Requerido en producción |
| `SECRET_KEY` | `token` | Clave JWT. Requerido en producción |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Ventana del rate limit global (ms) |
| `RATE_LIMIT_MAX` | `100` | Máx. requests por ventana por IP |

### Autenticación

| Variable | Descripción |
|---|---|
| `AUTH_BASIC_USER` | Usuario de Basic Auth para endpoints protegidos |
| `AUTH_BASIC_PW` | Contraseña de Basic Auth |

### SMTP

| Variable | Default | Descripción |
|---|---|---|
| `MAILER_USER` | — | Usuario SMTP |
| `MAILER_PASSWORD` | — | Contraseña SMTP |
| `MAILER_SMTP_HOST` | — | Host SMTP (ej: `smtp.gmail.com`) |
| `MAILER_SMTP_PORT` | `587` | Puerto SMTP |
| `MAILER_SMTP_SECURE` | `false` | `true`/`yes`/`1` para TLS en puerto 465 |
| `MAILER_FROM_NAME` | `APP_NAME` | Nombre del remitente visible |
| `MAILER_FROM_EMAIL` | `MAILER_USER` | Dirección del remitente |

### Branding / plantillas

| Variable | Descripción |
|---|---|
| `PROJECT_LOGO_URL` | URL pública del logo para plantillas HTML |
| `PROJECT_WEB_URL` | URL del sitio web para links en plantillas |
| `PROJECT_SUPPORT_EMAIL` | Email de soporte mostrado en plantillas |
| `PROJECT_PHONE` | Teléfono mostrado en plantillas |
| `BRAND_PRIMARY_COLOR` | Color primario hex (ej: `#6366F1`) |
| `BRAND_ACCENT_COLOR` | Color de acento hex (ej: `#4F46E5`) |

### Redirect en desarrollo

| Variable | Descripción |
|---|---|
| `MAILER_DEV_REDIRECT_EMAIL` | Si está seteado en entorno no-producción, todos los emails se redirigen a esta dirección. El destinatario original se agrega como header `X-Original-To` |

### Ventas / contacto

| Variable | Descripción |
|---|---|
| `MAILER_CONTACT_EMAIL` | Destinatario de formularios de contacto |
| `MAILER_SALES_EMAIL` | Fallback si `MAILER_CONTACT_EMAIL` no está definido |

### Mailchimp

| Variable | Descripción |
|---|---|
| `MAILCHIMP_API_KEY` | API Key de Mailchimp |
| `MAILCHIMP_LIST_ID` | ID de la lista/audiencia |
| `MAILCHIMP_SERVER` | Prefijo de servidor (ej: `us1`) |

### MailerLite

| Variable | Descripción |
|---|---|
| `MAILERLITE_API_KEY` | API Key de MailerLite |

### Base de datos (EmailLog)

| Variable | Default | Descripción |
|---|---|---|
| `DB_HOST_MAILER` | — | Host MySQL |
| `DB_PORT_MAILER` | `3306` | Puerto MySQL |
| `DB_USER_MAILER` | — | Usuario MySQL |
| `DB_ROOT_PASSWORD_MAILER` | — | Contraseña MySQL |
| `DB_NAME_MAILER` | — | Nombre de la base de datos |
| `DB_DIALECT_MAILER` | `mysql` | Dialecto Sequelize |
| `DB_POOL_MAX` | `10` | Máx. conexiones en el pool |
| `DB_POOL_MIN` | `2` | Mín. conexiones en el pool |

---

## Feature flags

| Variable | Efecto cuando es `true` |
|---|---|
| `ENABLE_EMAIL_LOG` | Activa el log de emails en MySQL vía Sequelize. Requiere variables `DB_*` configuradas |
| `ENABLE_MAILCHIMP` | Habilita los endpoints `/suscribe` y `/suscribers` (Mailchimp) |
| `ENABLE_MAILERLITE` | Habilita los endpoints `/mailerlite/suscribe` y `/mailerlite/suscribers` |
| `ENABLE_CONTACT` | Habilita el endpoint `/contact` para formularios de contacto |
| `ENABLE_TEMPLATES` | Habilita el router `/automation/*` con plantillas transaccionales |

---

## Endpoints

### Siempre disponibles

| Método | Path | Auth | Body | Descripción |
|---|---|---|---|---|
| `GET` | `/health` | — | — | Estado del servicio. Verifica conexión SMTP. Devuelve `200 ok` con uptime o `503 degraded` si el SMTP no responde |

### Email transaccional

| Método | Path | Auth | Body | Descripción |
|---|---|---|---|---|
| `POST` | `/send-email` | Basic Auth | `to`, `subject`, `content`, [`encoding`, `replyTo`] | Envía un email HTML. `content` puede venir en `base64` si se especifica `encoding: "base64"`. El HTML se sanitiza antes de enviar |

### Newsletter — Mailchimp (`ENABLE_MAILCHIMP=true`)

| Método | Path | Auth | Body | Descripción |
|---|---|---|---|---|
| `POST` | `/suscribe` | — (rate limit: 5/15min) | `email` | Suscribe un email a la lista de Mailchimp |
| `GET` | `/suscribers` | JWT Admin | — | Lista los suscriptores de la audiencia Mailchimp |

### Newsletter — MailerLite (`ENABLE_MAILERLITE=true`)

| Método | Path | Auth | Body | Descripción |
|---|---|---|---|---|
| `POST` | `/mailerlite/suscribe` | — (rate limit: 5/15min) | `email` | Suscribe o actualiza un suscriptor en MailerLite |
| `GET` | `/mailerlite/suscribers` | JWT Admin | — | Lista los suscriptores de MailerLite (máx. 100) |

### Contacto (`ENABLE_CONTACT=true`)

| Método | Path | Auth | Body | Descripción |
|---|---|---|---|---|
| `POST` | `/contact` | — (rate limit: 5/15min) | `nombre`, `email`, `mensaje`, [`empresa`, `telefono`] | Envía formulario de contacto al email configurado en `MAILER_CONTACT_EMAIL`. Todos los campos de texto se sanitizan |

### Automatizaciones (`ENABLE_TEMPLATES=true`)

Todos los endpoints de automatización requieren **Basic Auth**.

| Método | Path | Body requerido | Descripción |
|---|---|---|---|
| `POST` | `/automation/welcome` | `email`, `name` | Email de bienvenida al nuevo usuario |
| `POST` | `/automation/payment-reminder` | `email`, `name`, `amount`, `dueDate`, `concept` | Recordatorio de pago pendiente |
| `POST` | `/automation/missing-document` | `email`, `name`, `documentName` | Notificación de documento faltante |
| `POST` | `/automation/document-status` | `email`, `name`, `documentName`, `status`, [`reason`] | Resultado de revisión de documento (`approved` / `rejected`) |
| `POST` | `/automation/stage-advance` | `email`, `name`, `newStage` | Notificación de avance de etapa en el proceso |
| `POST` | `/automation/next-steps` | `email`, `name`, `steps[]` | Instrucciones de próximos pasos (array de strings) |
| `POST` | `/automation/new-registration` | `alumno_name`, `alumno_email`, `recipient_emails[]`, [`referral_code`] | Notificación interna de nuevo registro. Se envía a múltiples destinatarios |
| `POST` | `/automation/admin-notification` | `title`, `alumno_name`, `detail`, `recipient_emails[]`, [`detail_label`] | Notificación genérica de administración. Se envía a múltiples destinatarios |

---

## Desarrollo

```bash
cp .env.example .env
# editar .env con credenciales SMTP reales o de prueba

npm install
npm run dev
```

El servidor queda disponible en `http://localhost:<MAILER_PORT>`.

### Dev redirect

Definir `MAILER_DEV_REDIRECT_EMAIL=tu@email.com` para que todos los envíos lleguen a esa dirección. El destinatario original se incluye como header `X-Original-To` y en el subject de automatizaciones.

---

## Docker

### Desarrollo (con bind mount)

```yaml
services:
  mailer:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    env_file: .env
    ports:
      - "3010:80"
```

### Producción

```bash
docker build -f Dockerfile.production -t mailer:latest .
docker run --env-file .env -p 80:80 mailer:latest
```

El `Dockerfile.production` usa una imagen multi-stage con `node:22-alpine`, corre como usuario `node` (no root) y usa `dumb-init` como PID 1.

---

## Migraciones

Las migraciones se ejecutan automáticamente al arrancar si `ENABLE_EMAIL_LOG=true`. El sistema de migración es propio (no usa Sequelize CLI) y registra cada migración aplicada en la tabla `schema_migrations`.

| Migración | Descripción |
|---|---|
| `001_create-email-logs` | Crea la tabla `email_logs` |
| `002_add-email-log-indexes` | Agrega índices en `recipient`, `created_at`, `status` y `project` |

Para agregar una nueva migración: crear el archivo `db/migrations/NNN_nombre.js` exportando `id`, `up(sequelize)` y opcionalmente `down(sequelize)`, luego registrarla en `db/migrations/auto-run.js`.

---

## Debugging & Observability

### LOG_LEVEL

Controlá la verbosidad con la variable de entorno `LOG_LEVEL`:

| Nivel | Cuándo usarlo |
|-------|---------------|
| `debug` | Todo: llamadas SMTP, fetches a APIs externas, estado interno. |
| `info` | Operación normal: requests, arranque, emails enviados. **Default en desarrollo.** |
| `warn` | Estados degradados: respuestas 4xx, SMTP no disponible (503 degraded), fallbacks. |
| `error` | Fallos que requieren atención: 5xx, conexión SMTP caída, excepciones no capturadas. **Default en producción.** |

```bash
# Activar debug en producción sin redeployar
LOG_LEVEL=debug docker compose restart mailer
```

### Formato de logs

**Desarrollo** — texto legible:
```
[2026-05-11T21:00:00.000Z] [INFO]  POST /send → 200 { requestId: 'a1b2...', ms: 340 }
[2026-05-11T21:00:01.000Z] [WARN]  POST /contact → 400 { requestId: 'c3d4...', ms: 12 }
```

**Producción** — una línea JSON por evento:
```json
{"ts":"2026-05-11T21:00:00.000Z","level":"INFO","service":"mailer","msg":"POST /send → 200","requestId":"a1b2...","method":"POST","path":"/send","status":200,"ms":340}
```

Los campos `password`, `token`, `authorization` y `secret` son redactados automáticamente.

### HTTP access log

Cada request (excepto `/health`) genera una línea automáticamente. Nivel: `INFO` para 2xx/3xx, `WARN` para 4xx, `ERROR` para 5xx.

### Filtrar logs en producción

```bash
# Seguir logs en tiempo real
docker compose logs -f mailer

# Todos los errores
docker compose logs --no-log-prefix mailer | jq 'select(.level == "ERROR")'

# Emails enviados (buscar el mensaje interno del servicio)
docker compose logs --no-log-prefix mailer | jq 'select(.msg | contains("email enviado"))'

# Requests lentos (> 1s — puede indicar problemas SMTP)
docker compose logs --no-log-prefix mailer | jq 'select(.ms > 1000)'

# Por requestId (para correlacionar con el cliente)
docker compose logs --no-log-prefix mailer | jq 'select(.requestId == "<id>")'
```

### X-Request-ID — correlación cliente/servidor

```bash
# El cliente recibe: X-Request-ID: a1b2c3d4-...
docker compose logs --no-log-prefix mailer | jq 'select(.requestId == "a1b2c3d4-...")'
```

### Health check

```bash
curl http://localhost:3002/health
# 200: {"status":"ok","service":"mailer","uptime":3600.5}
# 503: {"status":"degraded","service":"mailer","message":"SMTP connection failed"}
```

> El health check verifica la conexión SMTP con `transporter.verify()`. Un 503 indica que el servidor SMTP no responde — el servicio sigue corriendo pero los emails no se enviarán.

### Escenarios comunes de debug

| Síntoma | Qué mirar |
|---------|-----------|
| Emails no llegan | `/health` — verificar que SMTP esté ok. En dev, revisar Mailpit en `http://localhost:8025` |
| 400 en `/send` | `LOG_LEVEL=debug` — buscar errores de validación del body en los logs |
| 503 en `/health` | Problema de conexión SMTP — revisar `MAILER_SMTP_HOST`, puerto y credenciales |
| Template no encontrado | Buscar `[templates]` en logs con `LOG_LEVEL=debug` |
| Rate limit en suscripción | `WARN` con status 429 — el IP está en el límite de suscripciones por ventana |
