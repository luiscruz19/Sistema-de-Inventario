import sequelize from '../sequelize.js';
import { logger } from '../../utils/logger.js';

const MIGRATIONS_TABLE = 'schema_migrations';

async function ensureMigrationsTable(qi, DataTypes) {
    const exists = await qi.tableExists(MIGRATIONS_TABLE);
    if (!exists) {
        await qi.createTable(MIGRATIONS_TABLE, {
            id: {
                type: DataTypes.STRING(255),
                primaryKey: true,
                allowNull: false,
            },
            run_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        });
    }
}

async function getApplied(qi) {
    const rows = await qi.sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE}`, { type: 'SELECT' });
    return new Set(rows.map(r => r.id));
}

export async function runMigrations(migrations) {
    const { DataTypes } = await import('sequelize');
    const qi = sequelize.getQueryInterface();

    await ensureMigrationsTable(qi, DataTypes);
    const applied = await getApplied(qi);

    for (const migration of migrations) {
        if (applied.has(migration.id)) {
            logger.debug(`[migration] Ya aplicada: ${migration.id}`);
            continue;
        }
        logger.info(`[migration] Aplicando: ${migration.id}`);
        await migration.up(sequelize);
        await sequelize.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (id, run_at) VALUES (?, ?)`,
            { replacements: [migration.id, new Date()] }
        );
        logger.info(`[migration] Completada: ${migration.id}`);
    }
}
