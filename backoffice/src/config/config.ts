// Nombre canónico de las variables en el .env raíz: INV_MS_*_URL.
// Se mantiene el fallback a INV_*_SERVICE_URL por compatibilidad histórica.
export const CONFIG = {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    PRODUCTOS_SERVICE_URL: process.env.INV_MS_PRODUCTOS_URL || process.env.INV_PRODUCTOS_SERVICE_URL || 'http://inv_ms_productos',
    STOCK_SERVICE_URL: process.env.INV_MS_STOCK_URL || process.env.INV_STOCK_SERVICE_URL || 'http://inv_ms_stock',
    VENTAS_SERVICE_URL: process.env.INV_MS_VENTAS_URL || process.env.INV_VENTAS_SERVICE_URL || 'http://inv_ms_ventas',
    COMPRAS_SERVICE_URL: process.env.INV_MS_COMPRAS_URL || process.env.INV_COMPRAS_SERVICE_URL || 'http://inv_ms_compras',
    FACTURACION_SERVICE_URL: process.env.INV_MS_FACTURACION_URL || 'http://inv_ms_facturacion',
    DASHBOARD_BI_SERVICE_URL: process.env.INV_MS_DASHBOARD_BI_URL || 'http://inv_ms_dashboard_bi',
    // Microservicios de la plataforma (gestión de productos SaaS del cliente)
    CONFIGURACION_API_URL: process.env.CONFIGURACION_API_URL || 'http://sda_ms_configuracion',
    PAYWAY_API_URL: process.env.PAYWAY_API_URL || 'http://sda_payway',
};

export default CONFIG;
