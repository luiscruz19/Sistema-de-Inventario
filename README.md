# Sistema de Inventario

ERP **single-tenant** pensado para PyMEs. Reúne en una sola plataforma la gestión
de stock, ventas, facturación electrónica (AFIP/ARCA), compras, contabilidad,
tesorería y la integración con marketplaces. Cada instancia atiende a **una sola
empresa**: el código y la base de datos están dedicados a ese negocio.

## Alcance

### Qué incluye

Cada módulo es un microservicio Node.js/Express independiente:

- **productos** — catálogo, categorías, variantes, sucursales, listas de precios, lotes, números de serie y configuración del negocio.
- **stock** — existencias, movimientos, alertas y transferencias entre sucursales.
- **ventas** — ventas, caja, reportes, notas de crédito y devoluciones.
- **compras** — proveedores, órdenes de compra, clientes, cuenta corriente de clientes y administradores.
- **facturacion** — facturación electrónica AFIP/ARCA, secuencias fiscales y configuración fiscal.
- **contabilidad** — plan de cuentas, asientos, libro IVA, impuestos y retenciones.
- **tesoreria** — cuentas bancarias, movimientos y cheques.
- **marketplace** — integración con MercadoLibre (conexiones, productos y órdenes).
- **dashboard-bi** — KPIs y métricas del negocio.
- **backoffice** — panel de gestión (Next.js) que consume todos los microservicios.
- **auth** — autenticación JWT (login y validación de token).
- **mailer** — envío de emails (SMTP).

### Qué NO incluye

- No es multi-empresa: es **single-tenant** (una empresa por instancia). Para
  atender a otra empresa se despliega otra instancia.
- No incluye almacenamiento de archivos (no hay servicio de storage/MinIO).
- Las integraciones externas (AFIP/ARCA, MercadoLibre, SMTP) se configuran por
  `.env` y vienen deshabilitadas/vacías por defecto.

## Arquitectura

```
                          ┌──────────────────────────┐
   navegador  ──HTTP──▶   │   Traefik (reverse proxy) │
                          └────────────┬─────────────┘
                                       │ Host(inventario.localhost)
                          ┌────────────▼─────────────┐
                          │   backoffice (Next.js)    │
                          └────────────┬─────────────┘
                                       │ HTTP interno (net-shared)
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                ▼              ▼              ▼                ▼
   productos          stock          ventas        compras       facturacion
   contabilidad     tesoreria      marketplace   dashboard-bi
        │                                                                │
        └──── auth (JWT)        mailer (SMTP) ◀──── servicios core ──────┘
                                       │
                          ┌────────────▼─────────────┐
                          │   MySQL (inventario,      │
                          │          inventario_auth) │
                          └──────────────────────────┘
```

- Los microservicios viven en `microservicios-inventario/` y comparten código
  común (`config`, `db`, `models`, `middlewares`, `requests`, `utils`,
  `integrations`) ubicado en `microservicios-inventario/shared/`. Ese directorio
  **se monta por volumen** en cada microservicio, evitando duplicar código.
- Toda la comunicación interna ocurre sobre la red Docker externa `net-shared`.
- El backoffice es el único servicio expuesto vía Traefik; auth y mailer son
  internos.

## Cómo levantar

### Requisitos

- Docker
- Docker Compose (plugin `docker compose`)
- `make` (opcional, pero recomendado)

### Pasos

1. **Configurar variables de entorno:**

   ```bash
   cp .env.example .env
   # editá .env con tus valores
   ```

2. **Levantar todo con un comando:**

   ```bash
   make up
   ```

   Esto crea la red `net-shared` y levanta, en orden, la infraestructura
   (MySQL + Traefik), los 9 microservicios y los servicios de la raíz
   (backoffice, auth, mailer).

3. **Correr las migraciones:**

   ```bash
   make migrate
   ```

4. **Acceder al sistema:**

   - Backoffice: <http://inventario.localhost>
   - Dashboard de Traefik: <http://localhost:8080>

   Si tu sistema no resuelve `inventario.localhost`, agregá esta línea a
   `/etc/hosts`:

   ```
   127.0.0.1   inventario.localhost
   ```

### Otros comandos

```bash
make ps      # estado de los contenedores
make logs    # logs de los servicios de la raíz
make down    # baja todos los servicios
make seed    # carga de datos iniciales (pendiente)
```

## Servicios

| Contenedor                    | Rol                                   | Puerto / acceso              |
|-------------------------------|---------------------------------------|------------------------------|
| `inventario_traefik`          | Reverse proxy                         | `${HTTP_PORT:-80}` / `8080` (dashboard) |
| `inventario_mysql`            | Base de datos MySQL                   | host `${DB_PORT_HOST:-3307}` → 3306 |
| `inventario_backoffice`       | Panel de gestión (Next.js)            | 80 (vía Traefik)             |
| `inventario_auth`             | Autenticación JWT                     | interno (80)                 |
| `inventario_mailer`           | Envío de emails (SMTP)                | interno (80)                 |
| `inventario_ms_productos`     | Catálogo y configuración              | interno                      |
| `inventario_ms_stock`         | Existencias y movimientos             | interno                      |
| `inventario_ms_ventas`        | Ventas y caja                         | interno                      |
| `inventario_ms_compras`       | Compras, proveedores y clientes       | interno                      |
| `inventario_ms_facturacion`   | Facturación electrónica AFIP/ARCA     | interno                      |
| `inventario_ms_contabilidad`  | Contabilidad e impuestos              | interno                      |
| `inventario_ms_tesoreria`     | Tesorería (bancos, cheques)           | interno                      |
| `inventario_ms_marketplace`   | Integración MercadoLibre              | interno                      |
| `inventario_ms_dashboard-bi`  | KPIs y métricas                       | interno                      |

## Variables de entorno

Todas las variables necesarias están documentadas y comentadas por sección en
[`.env.example`](./.env.example). Copialo a `.env` y ajustá los valores antes de
levantar el sistema. **Nunca** commitees el `.env` real.

## Licencia

[MIT](./LICENSE)
