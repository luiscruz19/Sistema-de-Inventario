import mysql from 'mysql2/promise';
import sequelize from './sequelize.js';
import CONFIG from '../config/config.js';
import runPendingMigrations from './migrations/auto-run.js';

const { DATABASE: { HOST, USER, PASSWORD, NAME, PORT }, DB_AUTOCREATE } = CONFIG;

async function ensureDatabase() {
    const conn = await mysql.createConnection({
        host: HOST,
        user: USER,
        password: PASSWORD,
        port: Number(PORT) || 3306,
    });
    await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();
    console.info(`[db] Database '${NAME}' verified/created.`);
}

export default async function initConnection() {
    try {
        if (DB_AUTOCREATE) {
            await ensureDatabase();
        }
        await sequelize.authenticate();
        console.info('[db] Connection established.');
        await runPendingMigrations();
    } catch (error) {
        console.error('[db] Error initializing connection:', error.message);
        process.exit(1);
    }
}
