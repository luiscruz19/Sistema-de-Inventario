import 'dotenv/config';
import initConnection from './db/connection.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const PORT = CONFIG.PORT || 80;

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    process.exit(1);
});

// DB init (ensureDatabase + migrations) then start HTTP server
initConnection().then(() => {
    // Import app after DB is ready to avoid sequelize.sync race
    import('./www/app.js').then(({ default: app }) => {
        const server = app.listen(PORT, () => {
            logger.info('');
            logger.info('-'.repeat(80));
            logger.info(`AUTH service running on http://localhost:${PORT}`);
            logger.info(`APP_NAME: ${CONFIG.APP_NAME}`);
            logger.info(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
            logger.info('-'.repeat(80));
            logger.info('');
        });

        const shutdown = () => {
            server.close(() => process.exit(0));
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    });
});
