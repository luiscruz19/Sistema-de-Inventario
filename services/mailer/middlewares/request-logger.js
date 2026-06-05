import { logger } from '../utils/logger.js';

export default function requestLogger(req, res, next) {
    if (req.path === '/health') return next();
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const status = res.statusCode;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        logger[level](`${req.method} ${req.path} → ${status}`, {
            requestId: req.id,
            method: req.method,
            path: req.path,
            status,
            ms,
        });
    });
    next();
}
