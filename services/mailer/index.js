import './db/connection.js'; // Inicializa la conexión a la BD y corre migraciones (registro de email_logs)
import app from './www/app.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const PORT = CONFIG.PORT;

const server = app.listen(PORT, () => {
    logger.info('');
    logger.info('-'.repeat(100));
    logger.info('Servidor MAILER corriendo en "http://localhost:' + PORT + '"');
    logger.info('-'.repeat(100));
    logger.info('Último cambio: ' + new Date().toString().slice(16, 25).trim() + 'hs');
    logger.info('');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('[unhandledRejection]', { reason, promise });
});

process.on('SIGTERM', () => {
    logger.info('[SIGTERM] Cerrando servidor...');
    server.close(() => {
        logger.info('[SIGTERM] Servidor cerrado.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('[SIGINT] Cerrando servidor...');
    server.close(() => {
        logger.info('[SIGINT] Servidor cerrado.');
        process.exit(0);
    });
});
