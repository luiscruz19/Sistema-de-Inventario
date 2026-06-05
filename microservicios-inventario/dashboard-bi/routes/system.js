import { Router } from 'express';

const api = Router();

api.get('/ping', (_req, res) => {
    res.json({ status: 1, service: 'inventario-dashboard-bi', ts: Date.now() });
});

export default api;
