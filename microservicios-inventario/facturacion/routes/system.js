import { Router } from 'express';

/**
 * Rutas /system/* — endpoints globales sin autenticación.
 * Útiles para provisioning, smoke tests y acciones globales.
 */
const api = Router();

api.get('/ping', (_req, res) => {
    res.json({ status: 1, service: 'inventario-facturacion', ts: Date.now() });
});

export default api;
