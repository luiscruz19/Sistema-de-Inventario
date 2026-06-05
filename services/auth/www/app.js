import express from 'express';

import routes from '../routes/index.js';
import Authorization from '../middlewares/authorization.js';
import Debug from '../middlewares/debug.js';
import { applySecurity } from '../middlewares/security.js';
import requestId from '../middlewares/request-id.js';
import requestLogger from '../middlewares/request-logger.js';
import logger from '../utils/logger.js';

const app = express();

// Required for accurate req.ip behind Docker/nginx/load-balancers
app.set('trust proxy', 1);

app.use(requestId);
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
applySecurity(app);
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 50000 }));

app.get('/health', async (_req, res) => {
    try {
        const { default: sequelize } = await import('../db/sequelize.js');
        await sequelize.authenticate();
        res.json({ status: 'ok', service: 'auth', uptime: process.uptime() });
    } catch {
        res.status(503).json({ status: 'error', service: 'auth', message: 'DB unavailable' });
    }
});

app.use(Authorization);

if (process.env.NODE_ENV !== 'production') {
    app.use(Debug);
}

app.use('/', routes);

// Global error handler — prevents stack traces from leaking to the client
app.use((err, req, res, _next) => {
    logger.error('unhandled_error', { requestId: req.id, path: req.path, method: req.method, status: err.status || 500, message: err.message });
    res.status(err.status || 500).json({ status: 0, message: 'Error interno del servidor' });
});

export default app;
