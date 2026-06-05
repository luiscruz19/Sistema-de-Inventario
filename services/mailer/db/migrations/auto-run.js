import { runMigrations } from './runner.js';
import * as migration001 from './001_create-email-logs.js';
import * as migration002 from './002_add-email-log-indexes.js';
import * as migration003 from './003_standardize-timestamps.js';
import { logger } from '../../utils/logger.js';

const migrations = [migration001, migration002, migration003];

export default async function autoRun() {
    try {
        await runMigrations(migrations);
        logger.info('[migration] Todas las migraciones aplicadas.');
    } catch (error) {
        logger.error('[migration] Error al ejecutar migraciones:', error);
        throw error;
    }
}
