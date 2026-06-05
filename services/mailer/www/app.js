import express from 'express';

import requestId from '../middlewares/request-id.js';
import requestLogger from '../middlewares/request-logger.js';
import Authorization from '../middlewares/authorization.js';
import Debug from '../middlewares/debug.js';
import routes from '../routes/index.js';
import { applySecurity } from '../middlewares/security.js';
import { logger } from '../utils/logger.js';

const app = express();

app.set('trust proxy', 1);

app.use(requestId);
app.use(requestLogger);

app.use(express.json({ limit: '2mb' }));

applySecurity(app);

app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 50000 }));

app.get('/health', async (_req, res) => {
  try {
    const { default: transporter } = await import('../config/transporter.js');
    await transporter.verify();
    res.json({ status: 'ok', service: 'mailer', uptime: process.uptime() });
  } catch {
    // SMTP no disponible — servicio degradado (no caído)
    res.status(503).json({ status: 'degraded', service: 'mailer', message: 'SMTP connection failed' });
  }
});

app.use(Authorization);

if (process.env.NODE_ENV !== 'production') app.use(Debug);

app.use('/', routes);

app.use((err, req, res, _next) => {
  logger.error('unhandled_error', { requestId: req.id, path: req.path, message: err.message });
  res.status(err.status || 500).json({ status: 0, message: 'Error interno del servidor', requestId: req.id });
});

export default app;
