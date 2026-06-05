export const CONFIG = {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    PRODUCTOS_SERVICE_URL: process.env.INV_MS_PRODUCTOS_URL || 'http://inventario_ms_productos',
    STOCK_SERVICE_URL: process.env.INV_MS_STOCK_URL || 'http://inventario_ms_stock',
    VENTAS_SERVICE_URL: process.env.INV_MS_VENTAS_URL || 'http://inventario_ms_ventas',
    COMPRAS_SERVICE_URL: process.env.INV_MS_COMPRAS_URL || 'http://inventario_ms_compras',
    FACTURACION_SERVICE_URL: process.env.INV_MS_FACTURACION_URL || 'http://inventario_ms_facturacion',
    DASHBOARD_BI_SERVICE_URL: process.env.INV_MS_DASHBOARD_BI_URL || 'http://inventario_ms_dashboard-bi',
    CONTABILIDAD_SERVICE_URL: process.env.INV_MS_CONTABILIDAD_URL || 'http://inventario_ms_contabilidad',
    TESORERIA_SERVICE_URL: process.env.INV_MS_TESORERIA_URL || 'http://inventario_ms_tesoreria',
    MARKETPLACE_SERVICE_URL: process.env.INV_MS_MARKETPLACE_URL || 'http://inventario_ms_marketplace',
};

export default CONFIG;
