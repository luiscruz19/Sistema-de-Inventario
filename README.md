# Sistema de Inventario

ERP single-tenant para PyMEs que reúne en una sola plataforma la gestión de
stock, ventas, facturación electrónica (AFIP/ARCA), compras, contabilidad,
tesorería y la integración con marketplaces. Cada instancia atiende a una sola
empresa: el código y la base de datos están dedicados a ese negocio. Está
construido sobre microservicios Node.js/Express con un backoffice en Next.js.

## Alcance

Qué incluye. Cada módulo es un microservicio independiente:

- productos: catálogo, categorías, variantes, sucursales, listas de precios, lotes, números de serie y configuración del negocio.
- stock: existencias, movimientos, alertas y transferencias entre sucursales.
- ventas: ventas, caja, reportes, notas de crédito y devoluciones.
- compras: proveedores, órdenes de compra, clientes, cuenta corriente y administradores.
- facturacion: facturación electrónica AFIP/ARCA, secuencias y configuración fiscal.
- contabilidad: plan de cuentas, asientos, libro IVA, impuestos y retenciones.
- tesoreria: cuentas bancarias, movimientos y cheques.
- marketplace: integración con MercadoLibre (conexiones, productos y órdenes).
- dashboard-bi: KPIs y métricas del negocio.

Qué no incluye:

- No es multi-empresa: es single-tenant. Para atender a otra empresa se despliega otra instancia.
- No incluye servicio de almacenamiento de archivos (storage/MinIO).
- Las integraciones externas (AFIP/ARCA, MercadoLibre, SMTP) se configuran por `.env` y vienen deshabilitadas o vacías por defecto.

## Arquitectura

```
   navegador
      |
      | HTTP  Host(inventario.localhost)
      v
   Traefik (reverse proxy)
      |
      v
   backoffice (Next.js)
      |
      | HTTP interno (red net-shared)
      v
   +--------------------------------------------------------------+
   |  microservicios                  servicios core              |
   |  productos    stock    ventas    auth (JWT)                  |
   |  compras      facturacion        mailer (SMTP)               |
   |  contabilidad tesoreria                                       |
   |  marketplace  dashboard-bi                                    |
   +--------------------------------------------------------------+
      |
      v
   MySQL
```

Los microservicios comparten modelos, conexión Sequelize y utilidades desde
`microservicios-inventario/shared/`, montado en cada contenedor por volumen, de
modo que el esquema de datos es único y consistente entre todos. Toda la
comunicación interna ocurre sobre la red Docker `net-shared`; el backoffice es el
único servicio expuesto vía Traefik.

## Stack

- Node.js + Express + Sequelize sobre MySQL (microservicios y servicios core).
- Next.js (backoffice).
- Docker y Docker Compose; Traefik como reverse proxy.

## Requisitos

- Docker
- Docker Compose

## Cómo levantar

1. Copiar el archivo de variables de entorno y ajustar los valores:

   ```bash
   cp .env.example .env
   ```

2. Levantar la red compartida, la infraestructura, los microservicios y el backoffice:

   ```bash
   make up
   ```

3. Correr las migraciones (se ejecutan dentro del contenedor):

   ```bash
   make migrate
   ```

4. Cargar datos demo:

   ```bash
   make seed
   ```

5. Agregar el host del backoffice a `/etc/hosts`:

   ```
   127.0.0.1   inventario.localhost
   ```

6. Acceder al backoffice en http://inventario.localhost. El dashboard de Traefik
   queda en http://localhost:8080.

   Credenciales del administrador demo:

   - Usuario: `admin@inventario.local`
   - Contraseña: `Admin1234!`

## Servicios

| Servicio | Rol | URL/host |
|---|---|---|
| inventario_traefik | Reverse proxy | `${HTTP_PORT:-80}`, dashboard en `:8080` |
| inventario_mysql | Base de datos MySQL | host `${DB_PORT_HOST:-3307}` -> 3306 |
| inventario_backoffice | Panel de gestión (Next.js) | http://inventario.localhost (vía Traefik) |
| inventario_auth | Autenticación JWT | interno |
| inventario_mailer | Envío de emails (SMTP) | interno |
| inventario_ms_productos | Catálogo y configuración | interno |
| inventario_ms_stock | Existencias y movimientos | interno |
| inventario_ms_ventas | Ventas y caja | interno |
| inventario_ms_compras | Compras, proveedores y clientes | interno |
| inventario_ms_facturacion | Facturación electrónica AFIP/ARCA | interno |
| inventario_ms_contabilidad | Contabilidad e impuestos | interno |
| inventario_ms_tesoreria | Tesorería (bancos, cheques) | interno |
| inventario_ms_marketplace | Integración MercadoLibre | interno |
| inventario_ms_dashboard-bi | KPIs y métricas | interno |

## Integraciones

| Integración | Estado | Cómo activar |
|---|---|---|
| MercadoLibre | Código real, requiere credenciales | Crear una aplicación en MercadoLibre, obtener las credenciales OAuth y registrar la conexión (access/refresh token y seller_id) desde el módulo marketplace. |
| AFIP/ARCA (facturación) | Modo simulado por defecto | El modo simulado genera un CAE de demostración; no es un comprobante fiscal válido. El modo real requiere certificado y clave privada (`ARCA_CERT_PEM`, `ARCA_KEY_PEM`), CUIT, punto de venta y la librería `soap`; se habilita con `ARCA_ENABLED=true` y `ARCA_ENVIRONMENT`. |
| SMTP (mailer) | Requiere credenciales | Configurar `MAILER_SMTP_HOST`, `MAILER_SMTP_PORT`, `MAILER_USER` y `MAILER_PASSWORD` en `.env`. |

## Variables de entorno

Todas las variables están documentadas y comentadas por sección en
[`.env.example`](./.env.example). Copialo a `.env` y ajustá los valores antes de
levantar el sistema. No commitees el `.env` real.

## Diccionario de datos

El esquema de la base de datos está documentado en
[`docs/DICCIONARIO-DE-DATOS.md`](./docs/DICCIONARIO-DE-DATOS.md).

## Comandos (Makefile)

| Target | Descripción |
|---|---|
| `make up` | Crea la red compartida y levanta infra + microservicios + backoffice/auth/mailer. |
| `make down` | Baja todos los servicios. |
| `make logs` | Sigue los logs de los servicios de la raíz. |
| `make migrate` | Corre las migraciones dentro del contenedor. |
| `make seed` | Carga datos demo. |
| `make ps` | Muestra el estado de los contenedores. |

## Licencia

[MIT](./LICENSE)
