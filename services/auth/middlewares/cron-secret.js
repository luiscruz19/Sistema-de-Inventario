import crypto from 'node:crypto';
import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';

const safeEquals = (a = '', b = '') => {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
};

/**
 * Middleware para endpoints internos service-to-service.
 * Valida el header `cron-secret` contra CONFIG.CRON_SECRET.
 */
export default function cronSecret(req, res, next) {
    const expected = CONFIG.CRON_SECRET;
    if (!expected) {
        return res.status(500).json(errorMessage({ message: 'CRON_SECRET no configurado en auth' }));
    }
    const provided = req.get('cron-secret');
    if (!provided || !safeEquals(provided, expected)) {
        return res.status(401).json(errorMessage({ message: 'cron-secret inválido', code: 401 }));
    }
    return next();
}
