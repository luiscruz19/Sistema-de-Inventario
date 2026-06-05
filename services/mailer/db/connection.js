import { logger } from '../utils/logger.js';
import sequelize from './sequelize.js';
import '../models/EmailLog.js';
import autoRun from './migrations/auto-run.js';

// El mailer registra todos los emails enviados en `email_logs` (BD DB_NAME_MAILER).
// Se conecta y aplica migraciones al arrancar.
try {
    await sequelize.authenticate();
    logger.info('[db] Conexión a base de datos establecida.');
    await autoRun();
} catch (error) {
    logger.error('[db] Error al conectar con la base de datos:', error);
}
