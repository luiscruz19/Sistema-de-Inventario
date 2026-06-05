import { Sequelize } from 'sequelize';
import sequelize from '../sequelize.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPendingMigrations() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id ASC');
        const executed = new Set(rows.map(r => r.name));

        const files = fs.readdirSync(__dirname)
            .filter(f => /^\d{3}[-_]/.test(f) && f.endsWith('.js'))
            .sort();

        const pending = files.filter(f => !executed.has(f));

        if (pending.length === 0) {
            console.info('[migrations] No pending migrations.');
            return;
        }

        console.info(`[migrations] ${pending.length} pending migration(s).`);

        for (const file of pending) {
            try {
                const migration = await import(`./${file}`);
                const upFn = migration.default?.up ?? migration.up;
                await upFn(sequelize.getQueryInterface(), Sequelize.DataTypes);
                await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', { replacements: [file] });
                console.info(`[migrations] OK   ${file}`);
            } catch (err) {
                console.error(`[migrations] ERR  ${file}:`, err.message);
                // Stop on first failure to avoid partial state
                break;
            }
        }
    } catch (err) {
        console.error('[migrations] Fatal error:', err.message);
    }
}

export default runPendingMigrations;
