# Diccionario de datos

Esquema de la base de datos del Sistema de Inventario. Las tablas se generan a
partir de los modelos Sequelize en `microservicios-inventario/shared/models/`,
compartidos por todos los microservicios.

Convenciones:

- Todas las tablas tienen `id` (INTEGER, PK, autoincremental).
- Salvo que se indique lo contrario, llevan `created_at` y `updated_at`
  (`timestamps: true`). Las tablas marcadas con *soft delete* agregan
  `deleted_at` (`paranoid: true`) y no borran físicamente los registros.
- Los tipos son los de Sequelize/MySQL: `DECIMAL(p,s)` para montos,
  `DATEONLY` para fechas sin hora, `DATE` para fecha y hora, `ENUM(...)` para
  valores acotados.

## Productos / Stock

### products

Catálogo de productos.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre del producto |
| sku | STRING(100) | Sí | | Código interno (único) |
| barcode | STRING(100) | Sí | | Código de barras |
| description | TEXT | Sí | | Descripción larga |
| category_id | INTEGER | Sí | | Categoría a la que pertenece |
| unit | ENUM('UN','KG','LT','MT') | No | UN | Unidad de medida |
| cost_price | DECIMAL(12,2) | No | 0 | Precio de costo |
| sale_price | DECIMAL(12,2) | No | 0 | Precio de venta |
| tax_rate | DECIMAL(5,2) | No | 21.00 | Alícuota de IVA |
| min_stock_alert | INTEGER | No | 0 | Umbral para alerta de stock mínimo |
| image_url | STRING | Sí | | URL de la imagen |
| active | BOOLEAN | No | true | Si está activo |
| track_stock | BOOLEAN | No | true | Si controla existencias |

### categories

Categorías de productos, con jerarquía padre/hijo.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre de la categoría |
| parent_id | INTEGER | Sí | | Categoría padre |
| sort_order | INTEGER | No | 0 | Orden de presentación |
| active | BOOLEAN | No | true | Si está activa |

### product_variants

Variantes de un producto (talle, color, etc.).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| product_id | INTEGER | No | | Producto base |
| name | STRING | No | | Nombre de la variante |
| sku | STRING(100) | Sí | | Código interno de la variante |
| barcode | STRING(100) | Sí | | Código de barras de la variante |
| cost_price | DECIMAL(12,2) | Sí | | Costo (sobrescribe al del producto) |
| sale_price | DECIMAL(12,2) | Sí | | Precio (sobrescribe al del producto) |
| active | BOOLEAN | No | true | Si está activa |

### branches

Sucursales del negocio.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre de la sucursal |
| address | STRING | Sí | | Dirección |
| phone | STRING | Sí | | Teléfono |
| is_main | BOOLEAN | No | false | Si es la casa central |
| active | BOOLEAN | No | true | Si está activa |

### price_lists

Listas de precios (minorista, mayorista, especial).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre de la lista |
| type | ENUM('retail','wholesale','special') | No | retail | Tipo de lista |
| active | BOOLEAN | No | true | Si está activa |

### price_list_items

Precio de un producto/variante dentro de una lista.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| price_list_id | INTEGER | No | | Lista de precios |
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| price | DECIMAL(12,2) | No | | Precio en esta lista |

### product_batches

Lotes de productos con vencimiento (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| numero_lote | STRING(100) | No | | Número de lote |
| fecha_vencimiento | DATEONLY | Sí | | Fecha de vencimiento |
| fecha_fabricacion | DATEONLY | Sí | | Fecha de fabricación |
| cantidad_inicial | INTEGER | No | | Cantidad ingresada |
| cantidad_actual | INTEGER | No | 0 | Cantidad disponible |
| proveedor_id | INTEGER | Sí | | Proveedor de origen |
| observaciones | TEXT | Sí | | Notas |

### product_serials

Números de serie individuales por unidad (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| numero_serie | STRING(200) | No | | Número de serie (único) |
| batch_id | INTEGER | Sí | | Lote asociado |
| estado | ENUM('disponible','vendido','devuelto','dado_de_baja') | No | disponible | Estado de la unidad |
| sale_item_id | INTEGER | Sí | | Ítem de venta que lo vendió |
| customer_id | INTEGER | Sí | | Cliente comprador |
| fecha_venta | DATEONLY | Sí | | Fecha de venta |
| garantia_hasta | DATEONLY | Sí | | Vencimiento de garantía |

### business_configs

Configuración general del negocio (datos, moneda, numeración de comprobantes internos).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre del negocio |
| tax_id | STRING(30) | Sí | | CUIT/identificación fiscal |
| address | STRING | Sí | | Dirección |
| phone | STRING | Sí | | Teléfono |
| currency | STRING(10) | No | ARS | Moneda |
| tax_rate_default | DECIMAL(5,2) | No | 21.00 | IVA por defecto |
| receipt_prefix | STRING(10) | No | T | Prefijo de comprobante interno |
| receipt_next_number | INTEGER | No | 1 | Próximo número de comprobante interno |

### stock

Existencias por producto/variante/sucursal.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| branch_id | INTEGER | No | | Sucursal |
| quantity | DECIMAL(12,2) | No | 0 | Cantidad disponible |
| reserved_quantity | DECIMAL(12,2) | No | 0 | Cantidad reservada |

### stock_movements

Historial de movimientos de stock.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| branch_id | INTEGER | No | | Sucursal |
| type | ENUM('purchase','sale','adjustment','transfer_in','transfer_out','return') | No | | Tipo de movimiento |
| quantity | DECIMAL(12,2) | No | | Cantidad movida (con signo según tipo) |
| previous_stock | DECIMAL(12,2) | No | 0 | Stock antes del movimiento |
| new_stock | DECIMAL(12,2) | No | 0 | Stock después del movimiento |
| unit_cost | DECIMAL(12,2) | Sí | | Costo unitario del movimiento |
| reference_type | STRING(50) | Sí | | Tipo de documento de origen |
| reference_id | INTEGER | Sí | | Id del documento de origen |
| notes | TEXT | Sí | | Notas |
| created_by | INTEGER | Sí | | Usuario que lo registró |

### stock_transfers

Transferencias de stock entre sucursales.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| from_branch_id | INTEGER | No | | Sucursal de origen |
| to_branch_id | INTEGER | No | | Sucursal de destino |
| status | ENUM('pending','in_transit','received','cancelled') | No | pending | Estado de la transferencia |
| notes | TEXT | Sí | | Notas |
| created_by | INTEGER | Sí | | Usuario que la creó |
| received_by | INTEGER | Sí | | Usuario que la recibió |
| received_at | DATE | Sí | | Fecha de recepción |

### stock_transfer_items

Renglones de una transferencia.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| transfer_id | INTEGER | No | | Transferencia |
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| quantity_sent | DECIMAL(12,2) | No | | Cantidad enviada |
| quantity_received | DECIMAL(12,2) | No | 0 | Cantidad recibida |

## Ventas

### sales

Ventas registradas.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| branch_id | INTEGER | No | | Sucursal |
| customer_id | INTEGER | Sí | | Cliente (opcional) |
| sale_number | STRING(50) | Sí | | Número de venta |
| payment_method | ENUM('cash','card','transfer','mercadopago','credit','mixed') | No | cash | Medio de pago |
| status | ENUM('completed','cancelled','refunded') | No | completed | Estado de la venta |
| subtotal | DECIMAL(12,2) | No | 0 | Subtotal sin descuentos |
| discount_amount | DECIMAL(12,2) | No | 0 | Descuento en monto |
| discount_percentage | DECIMAL(5,2) | No | 0 | Descuento en porcentaje |
| tax_amount | DECIMAL(12,2) | No | 0 | Total de impuestos |
| total | DECIMAL(12,2) | No | 0 | Total a pagar |
| paid_amount | DECIMAL(12,2) | No | 0 | Monto abonado |
| change_amount | DECIMAL(12,2) | No | 0 | Vuelto |
| notes | TEXT | Sí | | Notas |
| created_by | INTEGER | Sí | | Usuario que la registró |
| completed_at | DATE | Sí | | Fecha de cierre |

### sale_items

Renglones de una venta.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| sale_id | INTEGER | No | | Venta |
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| quantity | DECIMAL(12,2) | No | | Cantidad |
| unit_price | DECIMAL(12,2) | No | | Precio unitario |
| discount_percentage | DECIMAL(5,2) | No | 0 | Descuento del renglón |
| subtotal | DECIMAL(12,2) | No | | Subtotal del renglón |
| cost_at_sale | DECIMAL(12,2) | Sí | | Costo al momento de la venta |

### sale_payments

Pagos asociados a una venta (soporta pago mixto).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| sale_id | INTEGER | No | | Venta |
| method | ENUM('cash','card','transfer','mercadopago') | No | | Medio de pago |
| amount | DECIMAL(12,2) | No | | Monto |
| reference | STRING | Sí | | Referencia (transacción/comprobante) |

### cash_registers

Aperturas y cierres de caja.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| branch_id | INTEGER | No | | Sucursal |
| opened_by | INTEGER | Sí | | Usuario que abrió la caja |
| closed_by | INTEGER | Sí | | Usuario que cerró la caja |
| opening_amount | DECIMAL(12,2) | No | 0 | Monto de apertura |
| closing_amount | DECIMAL(12,2) | Sí | | Monto declarado al cierre |
| expected_amount | DECIMAL(12,2) | Sí | | Monto esperado |
| difference | DECIMAL(12,2) | Sí | | Diferencia (declarado - esperado) |
| status | ENUM('open','closed') | No | open | Estado de la caja |
| opened_at | DATE | No | NOW | Fecha de apertura |
| closed_at | DATE | Sí | | Fecha de cierre |

### credit_notes

Notas de crédito.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| sale_id | INTEGER | Sí | | Venta relacionada |
| number | STRING(30) | No | | Número de nota de crédito |
| reason | STRING(300) | No | | Motivo |
| status | ENUM('pending','applied','cancelled') | No | pending | Estado |
| subtotal | DECIMAL(12,2) | No | 0 | Subtotal |
| tax_amount | DECIMAL(12,2) | No | 0 | Impuestos |
| total | DECIMAL(12,2) | No | 0 | Total |
| refund_method | ENUM('cash','credit_card','transfer','store_credit','none') | No | none | Forma de reintegro |
| applied_at | DATE | Sí | | Fecha de aplicación |
| cancelled_at | DATE | Sí | | Fecha de anulación |
| notes | TEXT | Sí | | Notas |
| created_by | INTEGER | No | | Usuario que la creó |

### credit_note_items

Renglones de una nota de crédito.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| credit_note_id | INTEGER | No | | Nota de crédito |
| product_id | INTEGER | Sí | | Producto (opcional) |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| description | STRING(200) | No | | Descripción del renglón |
| quantity | DECIMAL(10,3) | No | | Cantidad |
| unit_price | DECIMAL(12,2) | No | | Precio unitario |
| tax_rate | DECIMAL(5,2) | No | 0 | Alícuota de IVA |
| subtotal | DECIMAL(12,2) | No | | Subtotal del renglón |

### return_requests

Solicitudes de devolución / RMA (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| sale_id | INTEGER | No | | Venta de origen |
| customer_id | INTEGER | Sí | | Cliente |
| numero_rma | STRING(50) | No | | Número de RMA |
| estado | ENUM('pendiente','aprobada','rechazada','procesada') | No | pendiente | Estado de la solicitud |
| motivo | TEXT | No | | Motivo de la devolución |
| aprobado_por | INTEGER | Sí | | Usuario que la aprobó |
| aprobado_at | DATEONLY | Sí | | Fecha de aprobación |
| nota_credito_id | INTEGER | Sí | | Nota de crédito generada |
| observaciones | TEXT | Sí | | Notas |

### return_request_items

Renglones de una solicitud de devolución.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| return_request_id | INTEGER | No | | Solicitud de devolución |
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| cantidad | DECIMAL(10,2) | No | | Cantidad devuelta |
| precio_unitario | DECIMAL(12,2) | No | | Precio unitario |
| subtotal | DECIMAL(12,2) | No | | Subtotal |
| motivo | TEXT | Sí | | Motivo del renglón |
| reingresa_stock | BOOLEAN | No | true | Si la unidad reingresa a stock |

## Compras

### suppliers

Proveedores.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Razón social / nombre |
| tax_id | STRING(30) | Sí | | CUIT |
| email | STRING | Sí | | Email |
| phone | STRING | Sí | | Teléfono |
| address | STRING | Sí | | Dirección |
| contact_person | STRING | Sí | | Persona de contacto |
| payment_terms | STRING | Sí | | Condiciones de pago |
| notes | TEXT | Sí | | Notas |
| active | BOOLEAN | No | true | Si está activo |

### purchase_orders

Órdenes de compra.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| supplier_id | INTEGER | No | | Proveedor |
| branch_id | INTEGER | No | | Sucursal de recepción |
| order_number | STRING(50) | Sí | | Número de orden |
| status | ENUM('draft','sent','partial','received','cancelled') | No | draft | Estado |
| subtotal | DECIMAL(12,2) | No | 0 | Subtotal |
| tax_amount | DECIMAL(12,2) | No | 0 | Impuestos |
| total | DECIMAL(12,2) | No | 0 | Total |
| notes | TEXT | Sí | | Notas |
| expected_date | DATEONLY | Sí | | Fecha estimada de entrega |
| received_at | DATE | Sí | | Fecha de recepción |
| created_by | INTEGER | Sí | | Usuario que la creó |

### purchase_order_items

Renglones de una orden de compra.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| purchase_order_id | INTEGER | No | | Orden de compra |
| product_id | INTEGER | No | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| quantity_ordered | DECIMAL(12,2) | No | | Cantidad pedida |
| quantity_received | DECIMAL(12,2) | No | 0 | Cantidad recibida |
| unit_cost | DECIMAL(12,2) | No | 0 | Costo unitario |
| subtotal | DECIMAL(12,2) | No | 0 | Subtotal del renglón |

### customers

Clientes.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| name | STRING | No | | Nombre / razón social |
| tax_id | STRING(30) | Sí | | CUIT/DNI |
| email | STRING | Sí | | Email |
| phone | STRING | Sí | | Teléfono |
| address | STRING | Sí | | Dirección |
| type | ENUM('regular','wholesale') | No | regular | Tipo de cliente |
| discount_percentage | DECIMAL(5,2) | No | 0 | Descuento habitual |
| credit_limit | DECIMAL(12,2) | No | 0 | Límite de crédito |
| balance | DECIMAL(12,2) | No | 0 | Saldo de cuenta corriente |
| notes | TEXT | Sí | | Notas |
| active | BOOLEAN | No | true | Si está activo |

### customer_transactions

Movimientos de cuenta corriente de clientes (sin `updated_at`).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| customer_id | INTEGER | No | | Cliente |
| type | ENUM('credit','debit') | No | | Tipo de movimiento |
| amount | DECIMAL(12,2) | No | | Monto |
| description | STRING(300) | No | | Descripción |
| reference_type | ENUM('sale','credit_note','payment','manual') | No | manual | Origen del movimiento |
| reference_id | INTEGER | Sí | | Id del documento de origen |
| balance_after | DECIMAL(12,2) | No | | Saldo resultante |
| created_by | INTEGER | Sí | | Usuario que lo registró |

### administrators

Administradores del sistema (vinculados a usuarios de auth).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| client_name | STRING | Sí | | Nombre del cliente/empresa |
| user_id | INTEGER | No | | Usuario de auth asociado |
| name | STRING | No | | Nombre del administrador |
| phone | STRING | No | | Teléfono |
| created_by | INTEGER | No | | Usuario que lo creó |

> Nota: esta tabla no usa `timestamps` (sin `created_at`/`updated_at`).

## Facturación

### invoices

Comprobantes electrónicos emitidos (factura/NC/ND). Tipos AFIP codificados como letras (A/B/C/NCA/...).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| sale_id | INTEGER | Sí | | Venta de origen |
| parent_invoice_id | INTEGER | Sí | | Factura original (cuando es NC/ND) |
| doc_type | ENUM('A','B','C','NCA','NCB','NCC','NDA','NDB','NDC') | No | | Tipo de comprobante |
| afip_cbte_tipo | INTEGER | Sí | | Código numérico AFIP del tipo |
| pto_vta | INTEGER | No | | Punto de venta |
| number | INTEGER | No | | Número correlativo |
| full_number | STRING(50) | Sí | | Número formateado (ej. 0001-00000123) |
| issuer_cuit | STRING(20) | Sí | | CUIT del emisor (snapshot) |
| issuer_name | STRING(200) | Sí | | Nombre del emisor |
| issuer_iva_condition | STRING(50) | Sí | | Condición IVA del emisor |
| customer_id | INTEGER | Sí | | Cliente |
| receiver_doc_type | ENUM('CUIT','CUIL','DNI','CF','OTRO') | No | CF | Tipo de documento del receptor |
| receiver_doc_number | STRING(20) | Sí | | Documento del receptor |
| receiver_name | STRING(200) | Sí | | Nombre del receptor |
| receiver_iva_condition | STRING(50) | Sí | | Condición IVA del receptor |
| receiver_address | STRING(300) | Sí | | Domicilio del receptor |
| currency | STRING(3) | No | PES | Moneda (código AFIP) |
| exchange_rate | DECIMAL(12,4) | No | 1 | Tipo de cambio |
| net_amount | DECIMAL(14,2) | No | 0 | Neto gravado |
| non_taxed_amount | DECIMAL(14,2) | No | 0 | Neto no gravado |
| exempt_amount | DECIMAL(14,2) | No | 0 | Exento |
| tax_amount | DECIMAL(14,2) | No | 0 | IVA |
| other_taxes_amount | DECIMAL(14,2) | No | 0 | Otros tributos |
| total | DECIMAL(14,2) | No | 0 | Total |
| cae | STRING(20) | Sí | | CAE devuelto por AFIP/ARCA |
| cae_expiration | DATEONLY | Sí | | Vencimiento del CAE |
| qr_url | TEXT | Sí | | URL del QR del comprobante |
| pdf_url | STRING(500) | Sí | | URL del PDF |
| status | ENUM('draft','approved','rejected','void') | No | draft | Estado interno |
| mode | ENUM('real','simulated') | No | simulated | Modo de emisión (simulado por defecto) |
| afip_response | TEXT('long') | Sí | | JSON crudo de la respuesta AFIP |
| rejection_reason | STRING(500) | Sí | | Motivo de rechazo |
| issued_at | DATE | Sí | | Fecha de emisión |
| service_date_from | DATEONLY | Sí | | Inicio del período de servicio |
| service_date_to | DATEONLY | Sí | | Fin del período de servicio |
| due_date | DATEONLY | Sí | | Vencimiento de pago |
| notes | TEXT | Sí | | Notas |
| created_by | INTEGER | Sí | | Usuario que la emitió |

### invoice_items

Renglones de una factura.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| invoice_id | INTEGER | No | | Factura |
| product_id | INTEGER | Sí | | Producto |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| sale_item_id | INTEGER | Sí | | Ítem de venta de origen |
| description | STRING(300) | No | | Descripción |
| quantity | DECIMAL(12,3) | No | 1 | Cantidad |
| unit | STRING(10) | Sí | | Unidad de medida |
| unit_price | DECIMAL(14,4) | No | 0 | Precio unitario neto (sin IVA) |
| discount_percentage | DECIMAL(5,2) | No | 0 | Descuento del renglón |
| net_amount | DECIMAL(14,2) | No | 0 | Neto del renglón |
| tax_rate | DECIMAL(5,2) | No | 21 | Alícuota de IVA aplicada |
| tax_amount | DECIMAL(14,2) | No | 0 | IVA del renglón |
| total | DECIMAL(14,2) | No | 0 | Total del renglón |

### invoice_taxes

Desglose de impuestos de una factura (IVA por alícuota, percepciones, etc.).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| invoice_id | INTEGER | No | | Factura |
| kind | ENUM('iva','perception','internal_tax','other') | No | iva | Tipo de tributo |
| afip_id | INTEGER | Sí | | Código AFIP de la alícuota/tributo |
| description | STRING(200) | Sí | | Descripción |
| base_amount | DECIMAL(14,2) | No | 0 | Base imponible |
| rate | DECIMAL(5,2) | No | 0 | Alícuota |
| amount | DECIMAL(14,2) | No | 0 | Monto |

### fiscal_configs

Configuración fiscal AFIP/ARCA de la instancia.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| cuit | STRING(20) | Sí | | CUIT del contribuyente |
| business_name | STRING(200) | Sí | | Razón social |
| pto_vta | INTEGER | No | 1 | Punto de venta AFIP |
| iva_condition | ENUM('responsable_inscripto','monotributo','exento','consumidor_final','no_categorizado') | No | monotributo | Condición frente al IVA |
| gross_income | STRING(50) | Sí | | Ingresos Brutos (IIBB) |
| activity_start | DATEONLY | Sí | | Inicio de actividades |
| fiscal_address | STRING(300) | Sí | | Domicilio fiscal |
| environment | ENUM('testing','production') | No | testing | Entorno AFIP |
| next_numbers | TEXT | Sí | | JSON con próximos números por tipo |

### fiscal_sequences

Contador de numeración por (punto de venta, tipo de comprobante).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| pto_vta | INTEGER | No | | Punto de venta |
| doc_type | STRING(10) | No | | Tipo de comprobante |
| last_number | INTEGER | No | 0 | Último número usado |
| last_synced_at | DATE | Sí | | Última sincronización con AFIP |

## Contabilidad

### chart_of_accounts

Plan de cuentas, con jerarquía (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| codigo | STRING(20) | No | | Código de cuenta |
| nombre | STRING(300) | No | | Nombre de la cuenta |
| tipo | ENUM('activo','pasivo','patrimonio','ingreso','egreso','costo') | No | | Tipo de cuenta |
| parent_id | INTEGER | Sí | | Cuenta padre |
| nivel | INTEGER | No | 1 | Nivel jerárquico |
| imputable | BOOLEAN | No | true | Si admite imputación directa |
| saldo | DECIMAL(14,2) | No | 0 | Saldo acumulado |

### journal_entries

Asientos contables (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| fecha | DATEONLY | No | | Fecha del asiento |
| numero | INTEGER | No | | Número de asiento |
| descripcion | STRING(500) | No | | Descripción |
| tipo | ENUM('manual','automatico') | No | manual | Origen del asiento |
| referencia_tipo | STRING(50) | Sí | | Tipo de documento de origen |
| referencia_id | INTEGER | Sí | | Id del documento de origen |
| total_debe | DECIMAL(14,2) | No | 0 | Total del debe |
| total_haber | DECIMAL(14,2) | No | 0 | Total del haber |
| aprobado | BOOLEAN | No | false | Si está aprobado |

### journal_entry_lines

Renglones (partidas) de un asiento.

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| journal_entry_id | INTEGER | No | | Asiento |
| account_id | INTEGER | No | | Cuenta contable |
| descripcion | STRING(500) | Sí | | Detalle de la partida |
| debe | DECIMAL(14,2) | No | 0 | Importe al debe |
| haber | DECIMAL(14,2) | No | 0 | Importe al haber |

### vat_book_entries

Renglones del libro IVA (ventas y compras) (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| tipo | ENUM('ventas','compras') | No | | Libro al que pertenece |
| fecha | DATEONLY | No | | Fecha del comprobante |
| invoice_id | INTEGER | Sí | | Factura asociada |
| comprobante_tipo | STRING(10) | No | | Tipo de comprobante |
| numero_comprobante | STRING(50) | No | | Número de comprobante |
| cuit_contraparte | STRING(13) | No | | CUIT de la contraparte |
| nombre_contraparte | STRING(300) | No | | Nombre de la contraparte |
| neto_gravado | DECIMAL(14,2) | No | 0 | Neto gravado |
| neto_no_gravado | DECIMAL(14,2) | No | 0 | Neto no gravado |
| iva_21 | DECIMAL(14,2) | No | 0 | IVA 21% |
| iva_105 | DECIMAL(14,2) | No | 0 | IVA 10,5% |
| iva_27 | DECIMAL(14,2) | No | 0 | IVA 27% |
| total | DECIMAL(14,2) | No | 0 | Total |
| periodo | STRING(7) | No | | Período (AAAA-MM) |

### tax_settings

Configuración de retenciones y percepciones por jurisdicción (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| jurisdiccion | STRING(50) | No | | Jurisdicción |
| tipo | ENUM('retencion','percepcion') | No | | Tipo |
| impuesto | ENUM('IIBB','GANANCIAS','IVA_ADICIONAL','OTRO') | No | IIBB | Impuesto |
| alicuota | DECIMAL(6,4) | No | | Alícuota |
| monto_minimo | DECIMAL(12,2) | No | 0 | Monto mínimo no sujeto |
| activa | BOOLEAN | No | true | Si está activa |

### tax_withholdings

Retenciones/percepciones aplicadas a ventas u órdenes de compra (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| tax_setting_id | INTEGER | No | | Configuración aplicada |
| sale_id | INTEGER | Sí | | Venta relacionada |
| purchase_order_id | INTEGER | Sí | | Orden de compra relacionada |
| tipo | ENUM('retencion','percepcion') | No | | Tipo |
| base_imponible | DECIMAL(14,2) | No | | Base imponible |
| alicuota | DECIMAL(6,4) | No | | Alícuota |
| monto | DECIMAL(14,2) | No | | Monto retenido/percibido |
| numero_certificado | STRING(100) | Sí | | Número de certificado |
| fecha | DATEONLY | No | | Fecha |

## Tesorería

### bank_accounts

Cuentas bancarias (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| nombre | STRING(200) | No | | Nombre de la cuenta |
| banco | STRING(200) | No | | Banco |
| numero_cuenta | STRING(100) | Sí | | Número de cuenta |
| cbu_cvu | STRING(22) | Sí | | CBU/CVU |
| tipo | ENUM('corriente','caja_ahorro','cuenta_sueldo','inversion') | No | corriente | Tipo de cuenta |
| moneda | STRING(3) | No | ARS | Moneda |
| saldo_inicial | DECIMAL(14,2) | No | 0 | Saldo inicial |
| activa | BOOLEAN | No | true | Si está activa |

### bank_movements

Movimientos bancarios (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| bank_account_id | INTEGER | No | | Cuenta bancaria |
| fecha | DATEONLY | No | | Fecha |
| concepto | STRING(500) | No | | Concepto |
| tipo | ENUM('ingreso','egreso') | No | | Tipo de movimiento |
| monto | DECIMAL(14,2) | No | | Monto |
| saldo_resultante | DECIMAL(14,2) | Sí | | Saldo luego del movimiento |
| referencia | STRING(200) | Sí | | Referencia |
| conciliado | BOOLEAN | No | false | Si está conciliado |
| sale_id | INTEGER | Sí | | Venta relacionada |
| purchase_order_id | INTEGER | Sí | | Orden de compra relacionada |

### cheques

Cheques emitidos y recibidos (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| tipo | ENUM('emitido','recibido') | No | | Tipo de cheque |
| numero | STRING(100) | No | | Número de cheque |
| banco | STRING(200) | No | | Banco |
| monto | DECIMAL(14,2) | No | | Monto |
| fecha_emision | DATEONLY | No | | Fecha de emisión |
| fecha_vencimiento | DATEONLY | No | | Fecha de vencimiento |
| beneficiario | STRING(300) | Sí | | Beneficiario |
| emisor | STRING(300) | Sí | | Emisor |
| estado | ENUM('en_cartera','depositado','cobrado','rechazado','anulado','endosado') | No | en_cartera | Estado |
| bank_account_id | INTEGER | Sí | | Cuenta bancaria asociada |
| customer_id | INTEGER | Sí | | Cliente (si fue recibido) |
| supplier_id | INTEGER | Sí | | Proveedor (si fue emitido) |
| observaciones | TEXT | Sí | | Notas |

## Marketplace

### marketplace_connections

Conexiones a marketplaces externos (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| marketplace | ENUM('mercadolibre','tiendanube','shopify','woocommerce') | No | | Marketplace |
| nombre | STRING(200) | No | | Nombre de la conexión |
| access_token | TEXT | Sí | | Token de acceso OAuth |
| refresh_token | TEXT | Sí | | Token de refresco OAuth |
| token_expira_at | DATEONLY | Sí | | Vencimiento del token |
| seller_id | STRING(100) | Sí | | Id del vendedor en el marketplace |
| shop_url | STRING(500) | Sí | | URL de la tienda |
| activa | BOOLEAN | No | true | Si está activa |
| ultimo_sync_at | DATEONLY | Sí | | Última sincronización |
| sync_status | STRING(50) | Sí | | Estado de la última sincronización |

### marketplace_products

Publicaciones de productos en un marketplace (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| connection_id | INTEGER | No | | Conexión |
| product_id | INTEGER | No | | Producto local |
| variant_id | INTEGER | Sí | | Variante (opcional) |
| marketplace_item_id | STRING(200) | No | | Id de la publicación en el marketplace |
| titulo | STRING(500) | No | | Título publicado |
| precio_publicado | DECIMAL(12,2) | No | | Precio publicado |
| stock_publicado | INTEGER | No | 0 | Stock publicado |
| activa | BOOLEAN | No | true | Si la publicación está activa |
| ultimo_sync_at | DATEONLY | Sí | | Última sincronización |

### marketplace_orders

Órdenes recibidas desde un marketplace (*soft delete*).

| Columna | Tipo | Null | Default | Descripción |
|---|---|---|---|---|
| connection_id | INTEGER | No | | Conexión |
| marketplace_order_id | STRING(200) | No | | Id de la orden en el marketplace |
| estado | ENUM('pendiente','pagado','enviado','entregado','cancelado') | No | pendiente | Estado de la orden |
| buyer_nombre | STRING(300) | No | | Nombre del comprador |
| buyer_email | STRING(255) | Sí | | Email del comprador |
| buyer_telefono | STRING(50) | Sí | | Teléfono del comprador |
| total | DECIMAL(12,2) | No | | Total de la orden |
| moneda | STRING(3) | No | ARS | Moneda |
| sale_id | INTEGER | Sí | | Venta local generada |
| datos_raw | TEXT | Sí | | JSON crudo de la orden |

## Relaciones

Asociaciones principales declaradas en `shared/models/index.js`.

Productos / Stock:

- `Category` 1—N `Category` (subcategorías; `parent_id`).
- `Category` 1—N `Product`.
- `Product` 1—N `ProductVariant`.
- `Product` 1—N `Stock`; `ProductVariant` 1—N `Stock`; `Branch` 1—N `Stock`.
- `Product` 1—N `StockMovement`; `ProductVariant` 1—N `StockMovement`; `Branch` 1—N `StockMovement`.
- `Branch` 1—N `StockTransfer` (origen y destino); `StockTransfer` 1—N `StockTransferItem`.
- `StockTransferItem` N—1 `Product` / `ProductVariant`.
- `PriceList` 1—N `PriceListItem`; `PriceListItem` N—1 `Product` / `ProductVariant`.
- `Product` 1—N `ProductBatch`; `ProductVariant` 1—N `ProductBatch`; `Supplier` 1—N `ProductBatch`.
- `Product` 1—N `ProductSerial`; `ProductVariant` 1—N `ProductSerial`; `ProductBatch` 1—N `ProductSerial`.
- `SaleItem` 1—N `ProductSerial`; `Customer` 1—N `ProductSerial`.

Ventas:

- `Customer` 1—N `Sale`; `Branch` 1—N `Sale`.
- `Sale` 1—N `SaleItem`; `SaleItem` N—1 `Product` / `ProductVariant`.
- `Sale` 1—N `SalePayment`.
- `Branch` 1—N `CashRegister`.
- `Sale` 1—N `CreditNote`; `CreditNote` 1—N `CreditNoteItem`.
- `CreditNoteItem` N—1 `Product` / `ProductVariant`.
- `Sale` 1—N `ReturnRequest`; `Customer` 1—N `ReturnRequest`; `ReturnRequest` 1—N `ReturnRequestItem`.
- `ReturnRequest` 1—N `CreditNote` (`rma_id`).
- `ReturnRequestItem` N—1 `Product` / `ProductVariant`.

Compras:

- `Supplier` 1—N `PurchaseOrder`; `Branch` 1—N `PurchaseOrder`.
- `PurchaseOrder` 1—N `PurchaseOrderItem`; `PurchaseOrderItem` N—1 `Product` / `ProductVariant`.
- `Customer` 1—N `CustomerTransaction`.

Facturación:

- `Sale` 1—N `Invoice`; `Customer` 1—N `Invoice`.
- `Invoice` 1—N `InvoiceItem`; `Invoice` 1—N `InvoiceTax`.
- `Invoice` 1—N `Invoice` (NC/ND vinculadas; `parent_invoice_id`).
- `InvoiceItem` N—1 `Product` / `ProductVariant` / `SaleItem`.
- `Invoice` 1—N `VatBookEntry`.

Contabilidad:

- `ChartOfAccount` 1—N `ChartOfAccount` (jerarquía; `parent_id`).
- `JournalEntry` 1—N `JournalEntryLine`; `JournalEntryLine` N—1 `ChartOfAccount`.
- `TaxSetting` 1—N `TaxWithholding`; `Sale` 1—N `TaxWithholding`; `PurchaseOrder` 1—N `TaxWithholding`.

Tesorería:

- `BankAccount` 1—N `BankMovement`; `Sale` 1—N `BankMovement`; `PurchaseOrder` 1—N `BankMovement`.
- `BankAccount` 1—N `Cheque`; `Customer` 1—N `Cheque`; `Supplier` 1—N `Cheque`.

Marketplace:

- `MarketplaceConnection` 1—N `MarketplaceProduct`; `Product` 1—N `MarketplaceProduct`; `ProductVariant` 1—N `MarketplaceProduct`.
- `MarketplaceConnection` 1—N `MarketplaceOrder`; `Sale` 1—1 `MarketplaceOrder`.
