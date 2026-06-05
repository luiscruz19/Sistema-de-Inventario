# Auth Service

Canonical shared authentication microservice. Handles user registration, login, JWT session management, brute-force protection, two-factor authentication (TOTP), and a full audit log of login events.

---

## Stack

| Component | Library |
|-----------|---------|
| Runtime | Node.js 22 (ESM) |
| HTTP framework | Express 4 |
| ORM | Sequelize 6 |
| Database | MySQL 8 |
| Password hashing | bcryptjs |
| JWT | jsonwebtoken (HS256) |
| 2FA | speakeasy (TOTP/HOTP) |
| QR codes | qrcode |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Mailer | HTTP call to a separate mailer service |

---

## Environment variables

| Variable | Required | Description | Default |
|---|---|---|---|
| `NODE_ENV` | no | `development` or `production` | `development` |
| `AUTH_PORT` | no | Port the service listens on | `80` |
| `SECRET_KEY` | **yes (prod)** | JWT signing secret (HS256) | `dev-secret-change-in-production` |
| `SESSION_TIMEOUT` | no | JWT lifetime in milliseconds | `28800000` (8 h) |
| `DB_HOST_AUTH` | **yes (prod)** | MySQL host | `localhost` |
| `DB_PORT_AUTH` | no | MySQL port | `3306` |
| `DB_USER_AUTH` | **yes (prod)** | MySQL user | `root` |
| `DB_ROOT_PASSWORD_AUTH` | **yes (prod)** | MySQL password | `` |
| `DB_NAME_AUTH` | **yes (prod)** | MySQL database name | `app_auth` |
| `DB_DIALECT_AUTH` | no | Sequelize dialect | `mysql` |
| `DB_AUTOCREATE` | no | Create the DB if it doesn't exist on startup | `false` |
| `DB_POOL_MAX` | no | Sequelize connection pool max | `10` |
| `DB_POOL_MIN` | no | Sequelize connection pool min | `2` |
| `AUTH_BASIC_USER` | no | Basic Auth username for service-to-service calls | `auth` |
| `AUTH_BASIC_PW` | no | Basic Auth password for service-to-service calls | `secret` |
| `CORS_ALLOWED_ORIGINS` | no | Comma-separated list of allowed CORS origins. Falls back to `WEB_URL`. | `` |
| `WEB_URL` | no | Frontend URL (used in email links and CORS fallback) | `http://localhost:3000` |
| `APP_NAME` | no | Branding name used in emails | `App` |
| `LOGO_URL` | no | Logo URL used in emails | `` |
| `MAILER_API_URL` | no | Base URL of the mailer microservice | `` |
| `LOGIN_MAX_ATTEMPTS` | no | Failed attempts before IP+email is blocked | `5` |
| `LOGIN_BLOCK_WINDOW_MS` | no | Block duration in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_WINDOW_MS` | no | Global rate-limit window in milliseconds | `900000` |
| `RATE_LIMIT_MAX` | no | Max requests per window per IP | `100` |
| `AUTH_USE_JWT_LINKS` | no | Use signed JWT links for activation/reset emails | `false` |
| `ADMIN_EMAIL` | no | Seed admin email (migration 007) | `` |
| `ADMIN_PASSWORD` | no | Seed admin password | `ChangeMe123!` |
| `ADMIN_NOMBRE` | no | Seed admin display name | `Administrador` |

Copy `.env.example` to `.env` and fill in your values before starting.

---

## Authentication schemes

### Basic Auth (service-to-service)

All requests to the service must include HTTP Basic Auth credentials matching `AUTH_BASIC_USER` / `AUTH_BASIC_PW`. This protects internal endpoints from unauthenticated callers. `/health` is exempt.

```
Authorization: Basic <base64(user:password)>
```

### JWT Bearer (user sessions)

Endpoints that require a logged-in user accept a JWT either in:

- `Authorization: Bearer <token>` header
- `token` header (legacy)

The JWT is HS256-signed with `SECRET_KEY`. It carries `{ id, email, remember_token, exp }`.

---

## Endpoints

All paths are prefixed with the mount point where this service is exposed (e.g. `/auth` if proxied). The table below shows paths as registered internally.

### Public auth endpoints

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| `POST` | `/auth/login` | Basic | `{ email, password }` | `{ status, data: { user: { id, token } } }` | Login. Returns JWT or `requires_2fa: true` + `temp_token` if TOTP is enabled. |
| `POST` | `/auth/signup` | Basic | `{ email, password, welcome_email? }` | `{ status, data: { user: { id, token, remember_token } } }` | Register a new user. Pass `welcome_email=1` to send activation email. |
| `POST` | `/auth/validate-account` | Basic | `{ id, token }` | `{ status, message }` | Activate an account using the token from the welcome email. |
| `POST` | `/auth/forgot-password` | Basic | `{ email, pathname? }` | `{ status, message }` | Send a password-reset email. Always returns 200 (prevents enumeration). |
| `POST` | `/auth/restore-password` | Basic | `{ hash, password }` or `{ token, user_id, password }` | `{ status, data: { remember_token } }` | Reset the password using the link token or raw uuid. |

### Session endpoints (require JWT)

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| `GET` | `/auth/validate-token` | Basic + JWT Bearer | — | `{ status, data: { user: { id, email, is_admin, is_guest, contact_email } } }` | Validate a JWT and return the user payload. |
| `GET` | `/auth/me` | Basic + JWT Bearer | — | same as above | Alias for `/auth/validate-token`. |

### Internal service-to-service endpoints (Basic Auth)

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/auth/user-by-email/:email` | Basic | path: `email` | `{ status, data: { id, email, verified } }` | Resolve a user by email. |
| `GET` | `/auth/user-by-id/:id` | Basic | path: `id` | `{ status, data: { id, email } }` | Resolve a user by ID. |
| `GET` | `/generate-token` | `token` header = `SECRET_KEY` | query: `user_id` | `{ status, data: { user: { id, token } } }` | Generate a fresh JWT for a known verified user. |
| `POST` | `/auth/internal/generate-guest-token` | Basic | `{ user_id }` | `{ status, data: { token } }` | Regenerate a JWT for a guest user. |
| `POST` | `/auth/guest-signup` | Basic | `{ email? }` | `{ status, data: { user: { id, token, guest: true } } }` | Create an anonymous guest session. |

### TOTP / 2FA endpoints (require JWT)

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| `POST` | `/auth/2fa/setup` | Basic + JWT Bearer | — | `{ status, data: { qr_code, secret } }` | Generate a TOTP secret and QR code for the authenticated user. |
| `POST` | `/auth/2fa/verify` | Basic + JWT Bearer | `{ token }` | `{ status, message }` | Confirm the TOTP code and enable 2FA on the account. |
| `POST` | `/auth/2fa/disable` | Basic + JWT Bearer | `{ token }` | `{ status, message }` | Disable 2FA after verifying the current TOTP code. |
| `POST` | `/auth/2fa/login-verify` | Basic | `{ temp_token, token }` | `{ status, data: { user: { id, token } } }` | Complete login after TOTP challenge. Exchanges the `temp_token` for a full JWT. |

### Admin endpoints (require JWT + `is_admin`)

| Method | Path | Auth | Body / Params | Response | Description |
|--------|------|------|---------------|----------|-------------|
| `GET` | `/admin/users/:id` | Basic + JWT (admin) | path: `id` | `{ status, data: { user } }` | Get any user's data. |
| `PUT` | `/admin/validate-user/:id` | Basic + JWT (admin) | path: `id` | `{ status, message }` | Manually verify a user account. |
| `DELETE` | `/admin/users/:id` | Basic + JWT (admin) | path: `id` | `{ status, message }` | Delete a user. |
| `POST` | `/admin/batch` | Basic + JWT (admin) | `{ action, ids[] }` | `{ status, message }` | Batch operation on multiple users. |

### Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/health` | none | `{ status: "ok", service: "auth", uptime }` or `503 { status: "error", message: "DB unavailable" }` |

---

## Migrations

Migrations run automatically on startup. To run them manually or inspect status:

```bash
# Run pending migrations
npm run migrate

# Show migration status
node db/migrations/runner.js --status
```

Migration files live in `db/migrations/` and are numbered `001_*` through `008_*`. The runner tracks executed migrations in the `_migrations` table.

---

## Running the service

### Development

```bash
cp .env.example .env
# edit .env with your local values
npm install
npm run dev
```

### Production (Docker)

```bash
# Build
docker build -f Dockerfile.production -t auth:latest .

# Run
docker run --rm \
  --env-file .env \
  -p 80:80 \
  auth:latest
```

The production image uses Node 22 Alpine with `dumb-init` for correct signal handling and runs as the unprivileged `node` user.

---

## Security overview

| Feature | Implementation |
|---------|---------------|
| Brute-force protection | Per email+IP counter in `login_attempts`. Blocks after `LOGIN_MAX_ATTEMPTS` failures for `LOGIN_BLOCK_WINDOW_MS` ms. |
| Global rate limiting | `express-rate-limit` — configurable via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`. |
| TOTP 2FA | speakeasy TOTP. Login flow issues a short-lived (5 min) `temp_token` pending TOTP verification. |
| JWT | HS256, signed with `SECRET_KEY`. Expiry enforced both by `jsonwebtoken` and an extra guard against `exp=0/NaN` tokens. |
| Password history | Previous password hash stored; re-use of the last password is rejected. |
| Audit log | Every login attempt (success, failure, block, 2FA pending) written to `login_logs` with IP, user-agent and origin. |
| Secrets in transit | `Authorization` and `token` headers redacted in the dev debug middleware. |
| HTTP hardening | `helmet` (HSTS in production, no CSP for API-only service, X-Frame-Options: DENY). |
| CORS | Explicit allowlist from `CORS_ALLOWED_ORIGINS`; server-to-server calls (no Origin) are always allowed. |
| Request tracing | `X-Request-ID` header propagated on every response; available as `req.id` for structured logging. |

---

## Debugging & Observability

### LOG_LEVEL

Controlá la verbosidad con la variable de entorno `LOG_LEVEL`:

| Nivel | Cuándo usarlo |
|-------|---------------|
| `debug` | Todo: queries SQL, lecturas de config, estado interno. Útil para rastrear un bug específico. |
| `info` | Operación normal: requests, arranque, migraciones. **Default en desarrollo.** |
| `warn` | Estados degradados: respuestas 4xx, fallbacks de config, reintentos. |
| `error` | Fallos que requieren atención: 5xx, errores de DB, excepciones no capturadas. **Default en producción.** |

```bash
# Activar debug en producción sin redeployar — solo reiniciar el contenedor
LOG_LEVEL=debug docker compose restart auth

# O en docker-compose.yml para una sesión de debugging
environment:
  LOG_LEVEL: debug
```

### Formato de logs

**Desarrollo** — texto legible:
```
[2026-05-11T20:58:08.366Z] [WARN] POST /login → 401 { requestId: 'db7f...', ms: 215 }
[2026-05-11T20:58:09.100Z] [INFO] POST /auth/validate-token → 200 { requestId: 'e3a1...', ms: 8 }
```

**Producción** — una línea JSON por evento:
```json
{"ts":"2026-05-11T20:58:08.366Z","level":"WARN","service":"auth","msg":"POST /login → 401","requestId":"db7f...","method":"POST","path":"/login","status":401,"ms":215}
```

Los campos `password`, `token`, `authorization` y `secret` son redactados automáticamente en cualquier metadata antes de escribir al log.

### HTTP access log

Cada request (excepto `/health`) genera una línea automáticamente con método, path, status y duración. El nivel sigue el código HTTP: `INFO` para 2xx/3xx, `WARN` para 4xx, `ERROR` para 5xx.

### Filtrar logs en producción

```bash
# Seguir logs en tiempo real
docker compose logs -f auth

# Todos los errores de la última hora
docker compose logs auth --since=1h | grep '"level":"ERROR"'

# Filtrar con jq (requiere jq instalado)
docker compose logs --no-log-prefix auth | jq 'select(.level == "WARN")'
docker compose logs --no-log-prefix auth | jq 'select(.ms > 500)'          # requests lentos
docker compose logs --no-log-prefix auth | jq 'select(.path == "/auth/login")'
docker compose logs --no-log-prefix auth | jq 'select(.level == "ERROR")'
```

### X-Request-ID — correlación entre cliente y servidor

Cada request recibe un UUID único propagado en el header `X-Request-ID` de la respuesta. Sirve para correlacionar el error que ve el cliente con la línea exacta en el log del servidor:

```bash
# El cliente recibe: X-Request-ID: db7fd7e1-b369-4b51-a28b-d1dc6219391e
docker compose logs --no-log-prefix auth | jq 'select(.requestId == "db7fd7e1-b369-4b51-a28b-d1dc6219391e")'
```

Para propagar el ID desde el BFF hacia este servicio, incluirlo en el request:
```
X-Request-ID: <id-del-cliente>
```

### Health check

```bash
curl http://localhost:3001/health
# 200: {"status":"ok","service":"auth","uptime":3600.5}
# 503: {"status":"error","service":"auth","message":"DB unavailable"}
```

### Escenarios comunes de debug

| Síntoma | Qué mirar |
|---------|-----------|
| Login siempre 401 | `jq 'select(.path == "/auth/login" and .status == 401)'` — revisar si está bloqueado por brute-force |
| JWT inválido | `LOG_LEVEL=debug` y buscar `validate-token` en logs — puede ser `exp` expirado o `SECRET_KEY` diferente entre servicios |
| DB no conecta | `/health` devuelve 503 — revisar `DB_HOST_AUTH`, `DB_ROOT_PASSWORD_AUTH` y que MySQL esté healthy |
| Migraciones fallidas | Buscar `[db:migrations] ERROR` en los primeros logs al arrancar |
| Emails no llegan | Verificar que `MAILER_API_URL` esté configurado y que el servicio mailer responda en `/health` |
