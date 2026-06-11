import mysql from 'mysql2/promise';
import sequelize from './sequelize.js';
import CONFIG from '../config/config.js';
import runPendingMigrations from './migrations/auto-run.js';

const { DATABASE: { HOST, USER, PASSWORD, NAME, PORT }, DB_AUTOCREATE } = CONFIG;

// Reintentos de conexión: la base puede no estar lista cuando arranca el
// servicio (orden de arranque de contenedores). Esperamos en vez de crashear.
const MAX_RETRIES = Number(process.env.DB_CONNECT_RETRIES) || 30;
const RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS) || 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function waitForDatabase() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (DB_AUTOCREATE) {
                await ensureDatabase();
            }
            await sequelize.authenticate();
            return;
        } catch (error) {
            if (attempt === MAX_RETRIES) throw error;
            console.warn(
                `[db] Base no disponible (intento ${attempt}/${MAX_RETRIES}): ${error.message}. Reintentando en ${RETRY_DELAY_MS}ms...`
            );
            await sleep(RETRY_DELAY_MS);
        }
    }
}

export default async function initConnection() {
    try {
        await waitForDatabase();
        console.info('[db] Connection established.');
        await runPendingMigrations();
    } catch (error) {
        console.error('[db] Error initializing connection:', error.message);
        process.exit(1);
    }
}
